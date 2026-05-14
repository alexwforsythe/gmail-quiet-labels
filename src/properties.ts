import Log, { withErrorLogging } from './logger';

export const settingsKey = 'USER_SETTINGS';
export const stateKey = 'USER_STATE';
export const defaultEvaluationIntervalHours = 12;

export interface Settings {
  // Filters
  labelIds: string[];
  excludeRead: boolean;
  excludeImportant: boolean;
  excludeStarred: boolean;

  // Timer trigger
  enableTimerTrigger: boolean;
  timerTriggerId?: string;
  intervalHours: number;
}

export interface State {
  lastRunMs: number;
  lastRunArchivedCount: number;
  totalArchivedCount: number;
}

export interface Properties {
  settings: Settings;
  state: State;
}

// eslint-disable-next-line no-restricted-globals
const UserProperties = withErrorLogging(PropertiesService.getUserProperties());

export function saveSettings(settings: Settings) {
  const val = JSON.stringify(settings);
  UserProperties.setProperty(settingsKey, val);
  Log.info('Saved settings', { settings });
}

export function saveState(state: State) {
  const val = JSON.stringify(state);
  UserProperties.setProperty(stateKey, val);
  Log.info('Saved state', { state });
}

export function clearState() {
  UserProperties.deleteProperty(stateKey);
  Log.info('Cleared state');
}

export function loadProps(): Properties {
  const { [settingsKey]: settings, [stateKey]: state } =
    UserProperties.getProperties();
  const props = {
    settings: {
      labelIds: [],
      excludeRead: false,
      excludeImportant: false,
      excludeStarred: false,
      enableTimerTrigger: false,
      intervalHours: defaultEvaluationIntervalHours,
      ...(settings && JSON.parse(settings)),
    },
    state: {
      lastRunMs: 0,
      lastRunArchivedCount: 0,
      totalArchivedCount: 0,
      ...(state && JSON.parse(state)),
    },
  };
  Log.debug('Loaded props', { props });
  return props;
}
