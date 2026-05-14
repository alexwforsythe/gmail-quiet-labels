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
export const archiveMessagesMaxBatchSize = 100;

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
    const thread = GmailAdapter.users.Threads.get('me', id, {
      format: 'metadata',
    });
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

  static listThreads(q: string, pageToken?: string) {
    const maxResults = listThreadsMaxBatchSize;

    const res = GmailAdapter.users.Threads.list('me', {
      q,
      maxResults,
      pageToken,
      // labelIds: ['INBOX', labelId], // Doesn't work
      // labelIds: ['INBOX'], // Works
      // labelIds: [labelId], // Works
    });
    Log.debug('listThreads', { q, maxResults, pageToken, res });

    const threadIds: string[] = [];
    for (const t of res.threads ?? []) {
      if (t.id) {
        threadIds.push(t.id);
      }
    }

    return {
      threadIds,
      nextPageToken: res.nextPageToken,
    };
  }

  static getMessage(id: string) {
    const message = GmailAdapter.users.Messages.get('me', id, {
      format: 'metadata',
    });
    Log.debug('getMessage', { id, message });

    const internalDate = message.internalDate;
    if (!internalDate) {
      throw new Error('Failed to determine internal date for message');
    }

    return {
      id,
      internalDateMs: parseInt(internalDate),
    };
  }

  static listMessages(q: string, pageToken?: string) {
    const maxResults = listMessagesMaxBatchSize;

    const res = GmailAdapter.users.Messages.list('me', {
      q,
      maxResults,
      pageToken,
      // labelIds: ['INBOX', labelId], // Doesn't work
      // labelIds: ['INBOX'], // Doesn't work with 'label' operator
      // labelIds: [labelId], // Works with 'after' operator
    });
    Log.debug('listMessages', { q, maxResults, pageToken, res });

    const messages: Message[] = [];
    for (const m of res.messages ?? []) {
      if (m.id && m.threadId) {
        messages.push({ id: m.id, threadId: m.threadId });
      }
    }

    return {
      messages,
      nextPageToken: res.nextPageToken,
    };
  }

  static archiveMessages(messageIds: string[]) {
    if (messageIds.length > archiveMessagesMaxBatchSize) {
      throw new Error(
        `Invalid argument: messageIds.length should be <= ${archiveMessagesMaxBatchSize}`,
      );
    }

    GmailAdapter.users.Messages.batchModify(
      { ids: messageIds, removeLabelIds: ['INBOX'] },
      'me',
    );
    Log.debug('archiveMessages', { messageIds });
  }
}

export const GmailClient = withErrorLogging(GmailAdapter);
