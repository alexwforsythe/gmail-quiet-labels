import { buildHomepage } from './cards';
import { archiveThreads } from './gmail';
import { clearState } from './properties';

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
