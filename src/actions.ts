import { archiveMessages } from './archiver';
import cards from './cards';
import Log, { withErrorLogging } from './logger';
import { clearState, loadProps, saveSettings } from './properties';

// eslint-disable-next-line no-restricted-globals
const Script = withErrorLogging(ScriptApp);

type ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => GoogleAppsScript.Card_Service.ActionResponse;

const handleClickClearState: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  clearState();
  return refreshHomepage(e, 'State cleared.');
};

const handleClickRunNow: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => refreshHomepage(e, archiveMessages());

const handleClickRefresh: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => refreshHomepage(e, 'Refreshed add-on.');

function refreshHomepage(
  e: GoogleAppsScript.Addons.EventObject,
  notificationText?: string,
) {
  const res = CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation()
        .popToRoot()
        .updateCard(cards.buildHomepage(e.commonEventObject.userLocale)),
    )
    .setStateChanged(true);

  if (notificationText) {
    res.setNotification(
      CardService.newNotification().setText(notificationText),
    );
  }

  return res.build();
}

const handleChangeLabelIds: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { settings } = loadProps();
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const labelIds = form.labelIds?.stringInputs?.value ?? [];

  saveSettings({ ...settings, labelIds });
  return buildHomepageResponse(e.commonEventObject.userLocale);
};

const handleChangeIntervalHours: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { settings } = loadProps();
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const val = form.intervalHours?.stringInputs?.value[0];
  const intervalHours = val ? parseInt(val) : undefined;
  if (!intervalHours || intervalHours <= 0) {
    Log.error('Invalid intervalHours, skipping handler', { intervalHours });
    return buildHomepageResponse(
      e.commonEventObject.userLocale,
      'Unknown interval.',
    );
  }

  if (settings.intervalHours === intervalHours) {
    Log.warn('intervalHours unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, intervalHours });
  return buildHomepageResponse(e.commonEventObject.userLocale);
};

const handleChangeExcludeRead: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const excludeRead = Boolean(form.excludeRead?.stringInputs?.value[0]);
  const { settings } = loadProps();
  if (settings.excludeRead === excludeRead) {
    Log.warn('excludeRead unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, excludeRead });
  return buildHomepageResponse(e.commonEventObject.userLocale);
};

const handleChangeExcludeImportant: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const excludeImportant = Boolean(
    form.excludeImportant?.stringInputs?.value[0],
  );
  const { settings } = loadProps();
  if (settings.excludeImportant === excludeImportant) {
    Log.warn('excludeImportant unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, excludeImportant });
  return buildHomepageResponse(e.commonEventObject.userLocale);
};

const handleChangeExcludeStarred: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const excludeStarred = Boolean(form.excludeStarred?.stringInputs?.value[0]);
  const { settings } = loadProps();
  if (settings.excludeStarred === excludeStarred) {
    Log.warn('excludeStarred unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, excludeStarred });
  return buildHomepageResponse(e.commonEventObject.userLocale);
};

const handleChangeEnableTimerTrigger: ActionHandler = (
  e: GoogleAppsScript.Addons.EventObject,
) => {
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const enableTimerTrigger = Boolean(
    form.enableTimerTrigger?.stringInputs?.value[0],
  );

  const { settings } = loadProps();
  if (settings.enableTimerTrigger === enableTimerTrigger) {
    Log.warn('enableTimerTrigger unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  let { timerTriggerId } = settings;
  if (timerTriggerId) {
    for (const t of Script.getProjectTriggers()) {
      if (t.getUniqueId() === timerTriggerId) {
        Script.deleteTrigger(t);
        break;
      }
    }
    timerTriggerId = undefined;
  }

  if (enableTimerTrigger) {
    const trigger = Script.newTrigger(archiveMessages.name)
      .timeBased()
      .everyHours(settings.intervalHours)
      .create();
    timerTriggerId = trigger.getUniqueId();
  }

  saveSettings({ ...settings, enableTimerTrigger, timerTriggerId });

  return buildHomepageResponse(
    e.commonEventObject.userLocale,
    `Schedule ${enableTimerTrigger ? 'enabled' : 'disabled'}.`,
  );
};

export function withErrorHandling(h: ActionHandler): ActionHandler {
  const handler = (e: GoogleAppsScript.Addons.EventObject) => {
    try {
      return h(e);
    } catch (err) {
      // Log the error and display a message to the user, but don't update the
      // lastRunMs. If the error is transient, such as a timeout or quota limit,
      // the job will be retried on the next run anyway.
      Log.error(new Error('Failed to run action', { cause: err }), {
        action: h.name,
      });

      return buildHomepageResponse(
        e.commonEventObject.userLocale,
        err instanceof Error
          ? `${err.message}${err.message.endsWith('.') ? '' : '.'}`
          : 'Failed to run action.',
      );
    }
  };

  // Explicitly define the name property to match the original function so it
  // can be found by GAS actions.
  Object.defineProperty(handler, 'name', { value: h.name });
  handler.name = h.name;

  return handler;
}

function buildHomepageResponse(
  userLocale: string | undefined,
  notificationText?: string,
): GoogleAppsScript.Card_Service.ActionResponse {
  const res = CardService.newActionResponseBuilder().setNavigation(
    CardService.newNavigation()
      .popToRoot()
      .updateCard(cards.buildHomepage(userLocale)),
  );
  if (notificationText) {
    res.setNotification(
      CardService.newNotification().setText(notificationText),
    );
  }
  return res.setStateChanged(true).build();
}

export default {
  handleClickClearState: withErrorHandling(handleClickClearState),
  handleClickRunNow: withErrorHandling(handleClickRunNow),
  handleClickRefresh: withErrorHandling(handleClickRefresh),
  handleChangeLabelIds: withErrorHandling(handleChangeLabelIds),
  handleChangeIntervalHours: withErrorHandling(handleChangeIntervalHours),
  handleChangeExcludeRead: withErrorHandling(handleChangeExcludeRead),
  handleChangeExcludeImportant: withErrorHandling(handleChangeExcludeImportant),
  handleChangeExcludeStarred: withErrorHandling(handleChangeExcludeStarred),
  handleChangeEnableTimerTrigger: withErrorHandling(
    handleChangeEnableTimerTrigger,
  ),
};
