import pkg from '../package.json' with { type: 'json' };
import Log, { withErrorLogging } from './logger';
import { createTimerTrigger, deleteTimerTrigger } from './triggers';

const appVersionKey = 'APP_VERSION';
const settingsKey = 'USER_SETTINGS';
const stateKey = 'USER_STATE';

const defaultTimerTriggerIntervalHours = 12;
export const timerTriggerIntervalHours = [
  1,
  6,
  defaultTimerTriggerIntervalHours,
  24,
];

const defaultSettings: Settings = {
  labelIds: [],
  excludeRead: false,
  excludeImportant: false,
  excludeStarred: false,
  enableTimerTrigger: false,
  intervalHours: defaultTimerTriggerIntervalHours,
};
const defaultState: State = {
  lastRunMs: 0,
  lastRunArchivedCount: 0,
  totalArchivedCount: 0,
};

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
  appVersion: string;
  settings: Settings;
  state: State;
}

// eslint-disable-next-line no-restricted-globals
const UserProperties = withErrorLogging(PropertiesService.getUserProperties());

export function saveSettings(settings: Settings) {
  const val = JSON.stringify(settings);
  UserProperties.setProperty(settingsKey, val);
  Log.info('Saved settings', { settings });
  return settings;
}

export function saveState(state: State) {
  const val = JSON.stringify(state);
  UserProperties.setProperty(stateKey, val);
  Log.info('Saved state', { state });
  return state;
}

export function clearState() {
  UserProperties.deleteProperty(stateKey);
  Log.info('Cleared state');
}

export function loadProps(validLabelIds?: Set<string>): Properties {
  const obj = UserProperties.getProperties();
  const { props, dirty } = parseProps(obj, validLabelIds);
  if (dirty) {
    UserProperties.setProperties({
      [appVersionKey]: props.appVersion,
      [settingsKey]: JSON.stringify(props.settings),
      [stateKey]: JSON.stringify(props.state),
    });
    Log.warn('Saved dirty props', { props });
  }

  Log.debug('Loaded props', { props });
  return props;
}

function parseProps(
  {
    [appVersionKey]: appVersion,
    [settingsKey]: settingsVal,
    [stateKey]: stateVal,
  }: { [key: string]: string },
  userLabels?: Set<string>,
) {
  const props = { appVersion, settings: defaultSettings, state: defaultState };
  let dirty = false;

  try {
    props.settings = { ...props.settings, ...JSON.parse(settingsVal) };
  } catch (err) {
    Log.error(new Error('Failed to parse settings', { cause: err }), {
      settingsVal,
    });
    dirty = true;
  }

  try {
    props.state = { ...props.state, ...JSON.parse(stateVal) };
  } catch (err) {
    Log.error(new Error('Failed to parse state', { cause: err }), { stateVal });
    dirty = true;
  }

  if (!timerTriggerIntervalHours.includes(props.settings.intervalHours)) {
    props.settings.intervalHours = defaultTimerTriggerIntervalHours;
    dirty = true;
    Log.warn('Invalid intervalHours, resetting to default', {
      intervalHours: props.settings.intervalHours,
    });
    if (props.settings.enableTimerTrigger) {
      Log.warn('Recreating timer trigger with new interval');
      props.settings.timerTriggerId = createTimerTrigger(props.settings);
    }
  }

  // If any configured labels no longer exist, remove them.
  if (userLabels) {
    const labelIds = props.settings.labelIds.filter((id) => userLabels.has(id));
    if (props.settings.labelIds.length !== labelIds.length) {
      props.settings.labelIds = labelIds;
      dirty = true;
    }
  }

  if (!props.settings.enableTimerTrigger && props.settings.timerTriggerId) {
    Log.warn('Timer trigger is disabled, deleting unexpected trigger', {
      id: props.settings.timerTriggerId,
    });
    deleteTimerTrigger(props.settings.timerTriggerId);
    props.settings.timerTriggerId = undefined;
    dirty = true;
  }

  if (props.appVersion !== pkg.version) {
    // Update the app version if it changed.
    props.appVersion = pkg.version;
    dirty = true;

    // Recreate the timer trigger if the app version changed in case there's a
    // breaking change, such as renaming the target function.
    if (props.settings.enableTimerTrigger) {
      Log.debug('App version changed, recreating timer trigger');
      props.settings.timerTriggerId = createTimerTrigger(props.settings);
    }
  }

  return { props, dirty };
}
