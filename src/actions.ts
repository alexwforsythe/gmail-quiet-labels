import { buildHomepage } from './cards';
import { archiveThreads } from './gmail';
import Log, { withErrorLogging } from './logger';
import { clearState, loadProps, saveSettings } from './properties';

// eslint-disable-next-line no-restricted-globals
const Script = withErrorLogging(ScriptApp);

export function handleClickClearState(e: GoogleAppsScript.Addons.EventObject) {
  clearState();
  return refreshHomepage(e, 'State cleared.');
}

export function handleClickRunNow(e: GoogleAppsScript.Addons.EventObject) {
  refreshHomepage(e, archiveThreads());
}

function refreshHomepage(
  e: GoogleAppsScript.Addons.EventObject,
  notificationText?: string,
) {
  const res = CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation()
        .popToRoot()
        .updateCard(buildHomepage(e.commonEventObject.userLocale)),
    )
    .setStateChanged(true);

  if (notificationText) {
    res.setNotification(
      CardService.newNotification().setText(notificationText),
    );
  }

  return res.build();
}

export function handleChangeLabelId(e: GoogleAppsScript.Addons.EventObject) {
  const { settings } = loadProps();
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const labelId = form.labelId.stringInputs?.value[0];
  if (!labelId) {
    Log.error('Invalid labelId, skipping handler', { labelId });
    return buildHomepageResponse(
      e.commonEventObject.userLocale,
      'Error: Invalid label',
    );
  }

  if (settings.labelId === labelId) {
    Log.warn('labelId unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, labelId });
  return buildHomepageResponse(e.commonEventObject.userLocale);
}

export function handleChangeIntervalHours(
  e: GoogleAppsScript.Addons.EventObject,
) {
  const { settings } = loadProps();
  const { commonEventObject } = e;
  const { formInputs: form } = commonEventObject;
  const val = form.intervalHours?.stringInputs?.value[0];
  const intervalHours = val ? parseInt(val) : undefined;
  if (!intervalHours || intervalHours <= 0) {
    Log.error('Invalid intervalHours, skipping handler', { intervalHours });
    return buildHomepageResponse(
      e.commonEventObject.userLocale,
      'Error: Invalid interval',
    );
  }

  if (settings.intervalHours === intervalHours) {
    Log.warn('intervalHours unchanged, skipping handler');
    return buildHomepageResponse(e.commonEventObject.userLocale);
  }

  saveSettings({ ...settings, intervalHours });
  return buildHomepageResponse(e.commonEventObject.userLocale);
}

export function handleChangeExcludeRead(
  e: GoogleAppsScript.Addons.EventObject,
) {
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
}

export function handleChangeExcludeImportant(
  e: GoogleAppsScript.Addons.EventObject,
) {
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
}

export function handleChangeEnableTimerTrigger(
  e: GoogleAppsScript.Addons.EventObject,
) {
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

  Script.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === archiveThreads.name)
    .forEach(Script.deleteTrigger);

  if (enableTimerTrigger) {
    Script.newTrigger(archiveThreads.name)
      .timeBased()
      .everyHours(settings.intervalHours)
      .create();
  }

  saveSettings({ ...settings, enableTimerTrigger });

  return buildHomepageResponse(
    e.commonEventObject.userLocale,
    enableTimerTrigger ? 'Schedule enabled!' : 'Schedule disabled.',
  );
}

function buildHomepageResponse(
  userLocale: string | undefined,
  notificationText?: string,
): GoogleAppsScript.Card_Service.ActionResponse {
  const res = CardService.newActionResponseBuilder().setNavigation(
    CardService.newNavigation()
      .popToRoot()
      .updateCard(buildHomepage(userLocale)),
  );
  if (notificationText) {
    res.setNotification(
      CardService.newNotification().setText(notificationText),
    );
  }
  return res.setStateChanged(true).build();
}
