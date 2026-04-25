import { buildHomepage } from './cards';

export function onHomepageTrigger(
  e: GoogleAppsScript.Addons.EventObject,
): GoogleAppsScript.Card_Service.Card {
  return buildHomepage(e.commonEventObject.userLocale);
}
