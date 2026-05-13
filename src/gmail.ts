import Log, { withErrorLogging } from './logger';

/**
 * The max number of messages that can be returned by {@link Gmail?.Users.Messages#list}.
 */
const listMessagesMaxBatchSize = 500;
/**
 * The max number of messages that can be returned by {@link Gmail?.Users.Threads#list}.
 */
const listThreadsMaxBatchSize = 500;
/**
 * The max number of messages that can be modified by {@link Gmail?.Users.Messages#batchModify}.
 */
const archiveMessagesMaxBatchSize = 100;

export type Label = Required<
  Pick<GoogleAppsScript.Gmail.Schema.Label, 'id' | 'name'>
>;

export type Message = Required<
  Pick<GoogleAppsScript.Gmail.Schema.Message, 'id' | 'threadId'>
>;

export type Thread = Required<Pick<GoogleAppsScript.Gmail.Schema.Thread, 'id'>>;

class GmailAdapter {
  static get users(): Pick<
    GoogleAppsScript.Gmail.Collection.UsersCollection,
    'Labels' | 'Messages' | 'Threads'
  > {
    // eslint-disable-next-line no-restricted-globals
    if (!Gmail?.Users) {
      throw new Error('Gmail API is not available');
    }

    // eslint-disable-next-line no-restricted-globals
    return Gmail.Users;
  }

  static getUserLabels() {
    const res = GmailAdapter.users.Labels.list('me');

    const labels: Label[] = [];
    for (const label of res.labels ?? []) {
      if (label.id && label.name) {
        labels.push({ id: label.id, name: label.name });
      }
    }

    return labels;
  }

  static getThread(id: string) {
    const res = GmailAdapter.users.Threads.get('me', id, {
      format: 'metadata',
    });
    const thread = {
      id: res.id,
      messages: res.messages,
    };
    Log.debug('getThread', { id, thread });

    const newestMessageDate = thread.messages?.length
      ? thread.messages[thread.messages.length - 1].internalDate
      : undefined;
    if (!newestMessageDate) {
      throw new Error('Failed to determine newest message date for thread');
    }

    return {
      id,
      newestMessageDateMs: parseInt(newestMessageDate),
    };
  }

  static listThreads(
    q: string,
    shouldContinue?: (
      res: GoogleAppsScript.Gmail.Schema.ListThreadsResponse,
    ) => boolean,
  ) {
    const maxResults = listThreadsMaxBatchSize;

    const threads: Thread[] = [];
    let pageToken: string | undefined;
    do {
      const res = GmailAdapter.users.Threads.list('me', {
        q,
        maxResults,
        pageToken,
        // labelIds: ['INBOX', labelId], // Doesn't work
        // labelIds: ['INBOX'], // Works
        // labelIds: [labelId], // Works
      });
      pageToken = res.nextPageToken;

      for (const t of res.threads ?? []) {
        if (t.id) {
          threads.push({ id: t.id });
        }
      }

      Log.debug('listThreads', { q, maxResults, pageToken, res });

      if (shouldContinue && !shouldContinue(res)) {
        break;
      }
    } while (pageToken);

    return threads;
  }

  static listMessages(
    q: string,
    shouldContinue?: (
      res: GoogleAppsScript.Gmail.Schema.ListMessagesResponse,
    ) => boolean,
  ) {
    const maxResults = listMessagesMaxBatchSize;

    const messages: Message[] = [];
    let pageToken: string | undefined;
    do {
      const res = GmailAdapter.users.Messages.list('me', {
        q,
        maxResults,
        pageToken,
        // labelIds: ['INBOX', labelId], // Doesn't work
        // labelIds: ['INBOX'], // Doesn't work with 'label' operator
        // labelIds: [labelId], // Works with 'after' operator
      });
      pageToken = res.nextPageToken;

      for (const m of res.messages ?? []) {
        if (m.id && m.threadId) {
          messages.push({ id: m.id, threadId: m.threadId });
        }
      }

      Log.debug('listMessages', { q, maxResults, pageToken, res });
      if (shouldContinue && !shouldContinue(res)) {
        break;
      }
    } while (pageToken);

    return messages;
  }

  static archiveMessages(
    messageIds: string[],
    shouldContinue?: (archivedCount: number) => boolean,
  ) {
    for (let i = 0; i < messageIds.length; i += archiveMessagesMaxBatchSize) {
      const batch = messageIds.slice(i, i + archiveMessagesMaxBatchSize);
      GmailAdapter.users.Messages.batchModify(
        { ids: messageIds, removeLabelIds: ['INBOX'] },
        'me',
      );
      const archivedCount = i + batch.length;
      Log.info('archiveMessages', {
        batch,
        archivedCount,
        remaining: messageIds.length - archivedCount,
      });

      if (shouldContinue && !shouldContinue(archivedCount)) {
        break;
      }
    }
  }
}

export const GmailClient = withErrorLogging(GmailAdapter);
