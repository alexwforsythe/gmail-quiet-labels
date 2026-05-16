import { archiveMessages } from './archiver';
import Log, { withErrorLogging } from './logger';
import { type Settings } from './properties';

// eslint-disable-next-line no-restricted-globals
export const Script = withErrorLogging(ScriptApp);

export function createTimerTrigger(settings: Settings): string {
  // There can be no more than 1 time-based trigger per user, so always delete
  // the existing trigger before creating a new one.
  deleteTimerTrigger(settings.timerTriggerId);
  const trigger = Script.newTrigger(archiveMessages.name)
    .timeBased()
    .everyHours(settings.intervalHours)
    .create();

  const id = trigger.getUniqueId();
  Log.debug('Created timer trigger', { id });

  return trigger.getUniqueId();
}

export function deleteTimerTrigger(id: string | undefined) {
  if (!id) {
    return;
  }

  for (const t of Script.getProjectTriggers()) {
    if (t.getUniqueId() === id) {
      Script.deleteTrigger(t);
      Log.debug('Deleted timer trigger', { id });
      break;
    }
  }
}
