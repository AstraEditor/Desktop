const settings = require('./settings');
const UpdateWindow = require('./windows/update');
const packageJSON = require('../package.json');
const privilegedFetch = require('./fetch');

const currentVersion = packageJSON.version;

const getRepositoryInfo = () => {
  const fallback = {
    owner: 'AstraEditor',
    repo: 'desktop'
  };

  const repositoryURL = packageJSON?.repository?.url;
  if (typeof repositoryURL !== 'string') {
    return fallback;
  }

  const match = /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i.exec(repositoryURL);
  if (!match) {
    return fallback;
  }

  return {
    owner: match[1],
    repo: match[2]
  };
};

const {owner: REPO_OWNER, repo: REPO_NAME} = getRepositoryInfo();
const VERSION_URLS = [
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/docs/version.json`,
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/docs/version.json`,
  `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/develop/docs/version.json`
];

const fetchVersionInfo = async () => {
  let lastError = null;

  for (const url of VERSION_URLS) {
    try {
      return await privilegedFetch.json(url);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Could not fetch version information.');
};

/**
 * Determines whether the update checker is even allowed to be enabled
 * in this build of the app.
 * @returns {boolean}
 */
const isUpdateCheckerAllowed = () => {
  if (process.env.TW_DISABLE_UPDATE_CHECKER) {
    return false;
  }

  // Must be enabled in package.json
  return !!packageJSON.tw_update;
};

const checkForUpdates = async () => {
  if (!isUpdateCheckerAllowed() || settings.updateChecker === 'never') {
    return;
  }

  const json = await fetchVersionInfo();

  // Imported lazily as it takes about 10ms to import
  const semverValid = require('semver/functions/valid');
  const semverLt = require('semver/functions/lt');

  const latestStable = semverValid(json.latest) || currentVersion;
  const latestUnstable = semverValid(json.latest_unstable) || latestStable;
  const oldestSafe = semverValid(json.oldest_safe) || currentVersion;

  // Security updates can not be ignored.
  if (semverLt(currentVersion, oldestSafe)) {
    UpdateWindow.updateAvailable(currentVersion, latestStable, true);
    return;
  }

  if (settings.updateChecker === 'security') {
    // Nothing further to check
    return;
  }

  const latest = settings.updateChecker === 'unstable' ? latestUnstable : latestStable;
  const now = Date.now();
  const ignoredUpdate = settings.ignoredUpdate;
  const ignoredUpdateUntil = settings.ignoredUpdateUntil * 1000;
  if (ignoredUpdate === latest && now < ignoredUpdateUntil) {
    // This update was ignored
    return;
  }

  if (semverLt(currentVersion, latest)) {
    UpdateWindow.updateAvailable(currentVersion, latest, false);
  }
};

/**
 * @param {string} version
 * @param {Date} until
 */
const ignoreUpdate = async (version, until) => {
  settings.ignoredUpdate = version;
  settings.ignoredUpdateUntil = Math.floor(until.getTime() / 1000);
  await settings.save();
};

module.exports = {
  isUpdateCheckerAllowed,
  checkForUpdates,
  ignoreUpdate
};
