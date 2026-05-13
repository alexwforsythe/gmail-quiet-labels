import { GmailClient, type Label } from './gmail';
import Log from './logger';
import { loadProps, saveState, type Settings, type State } from './properties';

/**
 * The lookback window that will be used the first time the add-on is run. This
 * avoids timeouts when querying very large inboxes.
 */
const initialLookbackWindow = '1m';

type QueryParams = Pick<State, 'lastRunMs'> &
  Pick<Settings, 'excludeRead' | 'excludeImportant' | 'excludeStarred'> & {
    labels: Label[];
  };

export function archiveMessages() {
  const nowMs = new Date().getTime();
  const props = loadProps();
  const { settings, state } = props;

  const { labelIds } = settings;
  if (labelIds.length === 0) {
    Log.error('Missing labels, skipping archiveThreads', { labelIds });
    throw new Error('No labels selected');
  }

  const labelIdsSet = new Set(labelIds);
  const labels = GmailClient.getUserLabels().filter(
    (l) => l.id && labelIdsSet.has(l.id),
  );
  if (labels.length !== labelIds.length) {
    Log.warn('Some configured labels were not found', {
      labelIds,
      foundLabelIds: labels.map((l) => l.id),
    });
  }

  const messageIds = getMessageIdsToArchive({
    lastRunMs: state.lastRunMs,
    labels,
    excludeRead: settings.excludeRead,
    excludeImportant: settings.excludeImportant,
    excludeStarred: settings.excludeStarred,
  });
  Log.debug(`${messageIds.length ? 'Found' : 'No'} new messages to archive`, {
    messageIds,
  });

  GmailClient.archiveMessages(messageIds, (archivedCount) => {
    // Update the state after each intermediate batch in case there's a failure.
    if (archivedCount < messageIds.length) {
      saveState({
        lastRunMs: state.lastRunMs,
        lastRunArchivedCount: state.lastRunArchivedCount + archivedCount,
        totalArchivedCount: state.totalArchivedCount + archivedCount,
      });
    }
    return true;
  });

  saveState({
    lastRunMs: nowMs,
    lastRunArchivedCount: messageIds.length,
    totalArchivedCount: state.totalArchivedCount + messageIds.length,
  });

  return messageIds.length === 0
    ? 'No new messages to archive.'
    : `Archived ${messageIds.length} message${messageIds.length > 1 ? 's' : ''}.`;
}

/**
 * Returns all new inbox messages matching the given params. This query is
 * performed in 3 steps due to Gmail search limitations:
 *
 *   1. Find all new inbox messages since the last run
 *   2. Find all threads matching the given params since the last run or
 *      sometime before it
 *   3. Find the intersection of 1 and 2
 *
 * Notes:
 *
 *   - We search incrementally since the last run to avoid timing out when
 *     querying very large inboxes
 *   - If the trigger has never been run, we limit the lookback window to avoid
 *     scanning all threads
 *   - We query messages instead of threads in step 1 because {@link Gmail} only
 *     supports batch archiving messages
 *   - The advanced search syntax accepts timestamps in seconds (UTC):
 *     https://developers.google.com/workspace/gmail/api/guides/filtering
 */
function getMessageIdsToArchive({
  lastRunMs,
  labels,
  excludeRead,
  excludeImportant,
  excludeStarred,
}: QueryParams) {
  // Get all new inbox messages since the last run. We don't filter by label
  // here because Gmail doesn't support it when querying the inbox or by date.
  const newInboxMessages = GmailClient.listMessages(
    [
      'in:inbox',
      // 'has:userlabels', // Doesn't work with 'after' operator
      // Doesn't work with 'label' operator or labelIds:
      lastRunMs > 0
        ? `after:${Math.floor(lastRunMs / 1000)}`
        : `newer_than:${initialLookbackWindow}`,
    ].join(' AND '),
  );
  Log.debug(`${newInboxMessages.length ? 'Found' : 'No'} new inbox messages`, {
    messages: newInboxMessages,
  });

  // Get all threads with a new message and any of the given labels since the
  // last run or sometime before it.
  //
  // We don't filter by inbox or date here because {@link Gmail} doesn't support
  // it when querying by label. Instead, we stop searching at the first page
  // that includes a thread whose newest message came before the last run.
  const newLabelThreads = GmailClient.listThreads(
    [
      // 'in:inbox', // Doesn't work with 'label' operator or labelIds
      // We use the 'label' operator with 'OR' because labelIds are ANDed.
      `(${labels
        .map((l) => `label:${l.name.replaceAll(' ', '-')}`)
        .join(' OR ')})`, // Doesn't work with 'after' operator
      // Querying by label excludes threads whose newest message is unlabeled,
      // unless another operator is present. 'has:userlabels' is redundant, so it
      // can be used as the extra operator without affecting results.
      // Works with 'after' and 'label' operators:
      'has:userlabels',
      ...(excludeRead ? ['is:unread'] : []),
      ...(excludeImportant ? ['-is:important'] : []),
      ...(excludeStarred ? ['-is:starred'] : []),
    ].join(' AND '),
    (res) => {
      // Stop if the oldest thread's newest message came before the last run.
      const oldestThreadId = res.threads?.at(-1)?.id;
      if (!oldestThreadId) {
        return false;
      }
      const oldestThread = GmailClient.getThread(oldestThreadId);
      return oldestThread.newestMessageDateMs >= lastRunMs;
    },
  );

  Log.debug(
    `${newLabelThreads.length ? 'Found' : 'No'} new threads with label`,
    { threads: newLabelThreads },
  );

  const newLabelThreadIdsSet = new Set<string>();
  for (const t of newLabelThreads) {
    newLabelThreadIdsSet.add(t.id);
  }

  return newInboxMessages
    .filter((m) => newLabelThreadIdsSet.has(m.threadId))
    .map((m) => m.id);
}
