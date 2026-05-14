import {
  archiveMessagesMaxBatchSize,
  GmailClient,
  type Message,
} from './gmail';
import Log from './logger';
import { loadProps, saveState, type Settings, type State } from './properties';

/**
 * The lookback window that will be used the first time the add-on is run. This
 * avoids timeouts when querying very large inboxes.
 */
const initialLookbackWindow = '1m';

export function archiveMessages() {
  return new Archiver().archiveMessages();
}

class Archiver {
  private settings: Settings;
  private prevState: State;
  #listMessagesParams: string | undefined;
  #listThreadsParams: string | undefined;

  private nextMessagesPageToken: string | undefined;
  private nextThreadsPageToken: string | undefined;
  private lastThreadIdsPage: string[] = [];
  private messageIdsToArchive: string[] = [];
  private archivedCount = 0;

  constructor() {
    const props = loadProps();
    const { settings, state } = props;
    this.settings = settings;
    this.prevState = state;
  }

  /**
   * Returns the params for listMessages.
   *
   * We don't filter by label here because Gmail doesn't support it when
   * querying the inbox or by date.
   */
  get listMessagesParams() {
    if (this.#listMessagesParams) {
      return this.#listMessagesParams;
    }

    this.#listMessagesParams = [
      'in:inbox',
      // 'has:userlabels', // Doesn't work with 'after' operator
      // Doesn't work with 'label' operator or labelIds:
      this.prevState.lastRunMs > 0
        ? `after:${Math.floor(this.prevState.lastRunMs / 1000)}`
        : `newer_than:${initialLookbackWindow}`,
    ].join(' AND ');

    return this.#listMessagesParams;
  }

  /**
   * Returns the params for listThreads.
   *
   * We don't filter by inbox or date here because Gmail doesn't support it when
   * querying by label. Instead, we paginate until we find a thread whose newest
   * message came before the query window.
   */
  get listThreadsParams() {
    if (this.#listThreadsParams) {
      return this.#listThreadsParams;
    }

    const { labelIds, excludeRead, excludeImportant, excludeStarred } =
      this.settings;
    const labels = this.getLabels(labelIds);

    this.#listThreadsParams = [
      // 'in:inbox', // Doesn't work with 'label' operator or labelIds
      // We use the 'label' operator with 'OR' because labelIds are ANDed when
      // used in the Gmail API params. Spaces must be converted to hyphens
      // (underscores do not work) because quoting label names will only match
      // the last one in the list.
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
    ].join(' AND ');

    return this.#listThreadsParams;
  }

  /**
   * Archives all new inbox messages matching the configured settings since the
   * last run. The query is performed in 3 steps due to Gmail search
   * limitations:
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
   *   - If the trigger has never been run, we limit the lookback window to
   *     avoid scanning all threads
   *   - We query messages instead of threads in step 1 because {@link Gmail}
   *     only supports batch archiving messages
   *   - The advanced search syntax accepts timestamps in seconds (UTC):
   *     https://developers.google.com/workspace/gmail/api/guides/filtering
   */
  archiveMessages() {
    const startMs = Date.now();

    // Process all new inbox messages since the last run.
    do {
      this.processNextMessagesPage();
    } while (this.nextMessagesPageToken);

    // Archive any remaining messages.
    this.flushMessages();

    saveState({
      lastRunMs: startMs,
      lastRunArchivedCount: this.archivedCount,
      totalArchivedCount:
        this.prevState.totalArchivedCount + this.archivedCount,
    });

    return this.archivedCount === 0
      ? 'No new messages to archive.'
      : `Archived ${this.archivedCount} message${this.archivedCount > 1 ? 's' : ''}.`;
  }

  /**
   * Process threads with a new message and any of the given labels up to the
   * first page that overlaps with the query start time.
   */
  private processNextMessagesPage() {
    const res = GmailClient.listMessages(
      this.listMessagesParams,
      this.nextMessagesPageToken,
    );
    this.nextMessagesPageToken = res.nextPageToken;
    const { messages } = res;
    if (!messages.length) {
      Log.debug('No new inbox messages');
      return;
    }
    Log.debug('Found new inbox messages', { messages });

    // If this is not the final pages of messages, only paginate threads over
    // the current batch's time window.
    let fromMs = this.prevState.lastRunMs;
    if (res.nextPageToken) {
      const oldestMessageId = messages[messages.length - 1].id;
      const oldestMessage = GmailClient.getMessage(oldestMessageId);
      fromMs = oldestMessage.internalDateMs;
    }

    this.processThreadsForMessages(messages, fromMs);
  }

  private processThreadsForMessages(messages: Message[], fromMs: number) {
    if (!messages.length) {
      return;
    }

    do {
      const res = this.processNextThreadsPage(messages);

      // Stop paginating threads when the oldest one's newest message came
      // before the query start time.
      const oldestThreadId = res.threadIds.at(-1);
      if (
        res.nextPageToken &&
        oldestThreadId &&
        GmailClient.getThread(oldestThreadId).newestMessageDateMs < fromMs
      ) {
        this.lastThreadIdsPage = res.threadIds;
        break;
      }
    } while (this.nextThreadsPageToken);
  }

  private processNextThreadsPage(messages: Message[]) {
    // Continue from where the previous message batch left off because we aren't
    // querying threads by date.
    const res = GmailClient.listThreads(
      this.listThreadsParams,
      this.nextThreadsPageToken,
    );
    this.nextThreadsPageToken = res.nextPageToken;

    // Include the last page of threads from the previous message batch in case
    // they overlap with the current one.
    const threadIdsSet = new Set(res.threadIds.concat(this.lastThreadIdsPage));
    // Only reuse the last threads page once per message batch.
    if (this.lastThreadIdsPage.length) {
      this.lastThreadIdsPage = [];
    }

    // Determine the new messages to archive.
    for (const m of messages) {
      if (threadIdsSet.has(m.threadId)) {
        this.messageIdsToArchive.push(m.id);
      }
    }
    Log.debug(
      `${this.messageIdsToArchive.length ? 'Found' : 'No'} new messages to archive`,
      { messageIds: this.messageIdsToArchive },
    );

    // Archive the messages.
    this.flushMessages(archiveMessagesMaxBatchSize);

    return res;
  }

  private flushMessages(minSize?: number) {
    // To minimize API calls, only flush the messages when they reach a minimum
    // size.
    if (minSize && this.messageIdsToArchive.length < minSize) {
      return;
    }

    while (this.messageIdsToArchive.length > 0) {
      const batch = this.messageIdsToArchive.splice(
        0,
        archiveMessagesMaxBatchSize,
      );
      GmailClient.archiveMessages(batch);
      this.archivedCount += batch.length;
      Log.info('Archived messages', {
        batch,
        archivedCount: this.archivedCount,
        remaining: this.messageIdsToArchive.length,
      });

      // Update the state after each intermediate batch in case there's a
      // failure. Keep the previous state.lastRunMs so this time window can be
      // retried on the next run. Messages that were already archived will be
      // skipped.
      saveState({
        lastRunMs: this.prevState.lastRunMs,
        lastRunArchivedCount: this.archivedCount,
        totalArchivedCount:
          this.prevState.totalArchivedCount + this.archivedCount,
      });
    }
  }

  private getLabels(labelIds: string[]) {
    if (labelIds.length === 0) {
      Log.error('Invalid argument: labelIds must not be empty');
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

    return labels;
  }
}
