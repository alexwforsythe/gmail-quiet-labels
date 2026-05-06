import cards from './cards';

export function onHomepageTrigger(
  e: GoogleAppsScript.Addons.EventObject,
): GoogleAppsScript.Card_Service.Card {
  return cards.buildHomepage(e.commonEventObject.userLocale);
}
