import Log from './logger';

export const settingsKey = 'USER_SETTINGS';
export const stateKey = 'USER_STATE';
export const defaultEvaluationIntervalHours = 12;

export interface Settings {
  // Filters
  labelId: string;
  excludeRead: boolean;
  excludeImportant: boolean;

  // Timer trigger
  enableTimerTrigger: boolean;
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

export function saveSettings(settings: Settings) {
  const val = JSON.stringify(settings);
  PropertiesService.getUserProperties().setProperty(settingsKey, val);
  Log.info('Saved settings', { settings });
}

export function saveState(state: State) {
  const val = JSON.stringify(state);
  PropertiesService.getUserProperties().setProperty(stateKey, val);
  Log.info('Saved state', { state });
}

export function clearState() {
  PropertiesService.getUserProperties().deleteProperty(stateKey);
  Log.info('Cleared state');
}

export function loadProps(): Properties {
  const { [settingsKey]: settings, [stateKey]: state } =
    PropertiesService.getUserProperties().getProperties();
  const props = {
    settings: {
      labelId: '',
      excludeRead: false,
      excludeImportant: false,
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
