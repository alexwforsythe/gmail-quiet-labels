import Log, { withErrorLogging } from './logger';
import { loadProps, saveState, type Settings, type State } from './properties';

/** The max number of threads that can be returned by GmailApp.search. */
const getThreadsMaxBatchSize = 500;

// eslint-disable-next-line no-restricted-globals
export const Gmail = withErrorLogging(GmailApp);

// Define GmailLabel.getId() because it's missing from type definitions.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace GoogleAppsScript {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Gmail {
      interface GmailLabel {
        getId(): string;
      }
    }
  }
}

export function archiveThreads() {
  const nowMs = new Date().getTime();
  const props = loadProps();

  const { settings, state } = props;
  const { labelId } = settings;
  const label = Gmail.getUserLabels().find((l) => l.getId() === labelId);
  if (!label) {
    Log.error('Missing label, skipping archiveThreads', { labelId });
    throw new Error('No label selected');
  }

  const threads = getThreadsToArchive(label.getName(), {
    lastRunMs: state.lastRunMs,
    excludeRead: settings.excludeRead,
    excludeImportant: settings.excludeImportant,
  });
  Log.debug('Got threads to archive', { count: threads.length, threads });

  // Archive the threads in batches of 100 to avoid timeouts.
  for (let i = 0; i < threads.length; i += 100) {
    const batch = threads.slice(i, i + 100);
    Gmail.moveThreadsToArchive(batch);
    const archivedCount = i + batch.length;
    Log.info('Archived threads', {
      archivedCount,
      remaining: threads.length - archivedCount,
    });

    // @todo dedupe saveState if only 1 batch?
    saveState({
      lastRunMs: state.lastRunMs,
      lastRunArchivedCount: state.lastRunArchivedCount + archivedCount,
      totalArchivedCount: state.totalArchivedCount + archivedCount,
    });
  }

  saveState({
    lastRunMs: nowMs,
    lastRunArchivedCount: threads.length,
    totalArchivedCount: state.totalArchivedCount + threads.length,
  });

  return `Archived ${threads.length} threads`;
}

/**
 * Gmail only searches labels in a thread's newest message when querying with
 * in:inbox, so replies to previously archived threads with our label(s) won't
 * appear in the results. Instead, we query for all inbox threads and all
 * threads with the label and find the intersection of the two. This can be
 * inefficient if the user has a large number of threads, so we rely on limiting
 * the time window of the search for efficiency.
 *
 * @note Reapplying the label to the matched threads will add it to their newest
 * messages, causing them to appear in future searches (until a newer message is
 * received), but we don't do it because we can archive the threads directly.
 */
function getThreadsToArchive(
  labelName: string,
  {
    lastRunMs,
    excludeRead,
    excludeImportant,
  }: Pick<State, 'lastRunMs'> &
    Pick<Settings, 'excludeRead' | 'excludeImportant'>,
) {
  const params = [
    ...(excludeRead ? ['is:unread'] : []),
    ...(excludeImportant ? ['-is:important'] : []),
  ];

  const inboxThreads = getInboxThreads(lastRunMs, ...params);
  const labelThreads = getLabelThreads(labelName, lastRunMs, ...params);

  const labelThreadIdsSet = new Set(labelThreads.map((t) => t.getId()));
  return inboxThreads.filter((t) => labelThreadIdsSet.has(t.getId()));
}

/**
 *
 * Returns all inbox threads that have new replies since the last run.
 *
 *   - The advanced search syntax accepts timestamps in seconds (UTC):
 *     https://developers.google.com/workspace/gmail/api/guides/filtering
 *   - If the trigger has never been run, limit the lookback window to avoid
 *     scanning all threads
 *
 * @params lastRunMs: the last time the job ran
 * @param params the query params to use when searching threads
 * @returns all inbox threads matching the given args
 */
function getInboxThreads(lastRunMs: number, ...params: string[]) {
  const max = getThreadsMaxBatchSize;
  const queryParams = [
    'in:inbox',
    `after:${Math.floor(lastRunMs / 1000)}`,
    ...params,
  ];

  const threads: GoogleAppsScript.Gmail.GmailThread[] = [];
  let offset = 0;
  let page: GoogleAppsScript.Gmail.GmailThread[];
  do {
    Log.debug('Querying inbox threads', { offset, max, queryParams });
    page = Gmail.search(queryParams.join(' AND '), offset, max);
    threads.push(...page);
    offset += max;
  } while (page.length >= max);

  Log.debug('Found inbox threads', {
    count: threads.length,
    threads,
    queryParams,
  });

  return threads;
}

/**
 *
 * Returns all threads with the given label that have new replies since the last
 * run.
 *
 * label:labelName only matches threads whose newest message has the label, but
 * adding has:userlabels forces it to match threads with any message having the
 * label. Adding newer_than: or after: negates this behavior, so we can't use
 * them. Instead, we manually filter by time and stop the search after the first
 * page that contains a thread older than the last run.
 *
 * @param labelName the label to search for
 * @param lastRunMs the last time the job ran
 * @param params the query params to use when searching threads
 * @returns all threads matching the given args
 */
function getLabelThreads(
  labelName: string,
  lastRunMs: number,
  ...params: string[]
) {
  const max = getThreadsMaxBatchSize;
  const queryParams = [
    'has:userlabels',
    `label:${labelName.replaceAll(' ', '-')}`,
    ...params,
  ];

  const threads: GoogleAppsScript.Gmail.GmailThread[] = [];
  let offset = 0;
  let page: GoogleAppsScript.Gmail.GmailThread[];
  do {
    Log.debug('Querying label threads', { offset, max, queryParams });
    page = Gmail.search(queryParams.join(' AND '), offset, max);

    // @note We assume getLastMessageDate() doesn't make a network request.
    const newThreads = page.filter(
      (t) => t.getLastMessageDate().getTime() > lastRunMs,
    );
    threads.push(...newThreads);

    // Stop searching once we've found a thread older than the last run.
    if (newThreads.length !== page.length) {
      break;
    }

    offset += max;
  } while (page.length >= max);

  Log.debug('Found new threads with label', {
    count: threads.length,
    threads,
    queryParams,
  });

  return threads;
}
