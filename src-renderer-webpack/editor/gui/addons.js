import SettingsStore from 'scratch-gui/src/addons/settings-store-singleton';
import AddonChannels from 'scratch-gui/src/addons/channels';
import runAddons from 'scratch-gui/src/addons/entry.js';

AddonChannels.reloadChannel.addEventListener('message', () => {
  window.__ae_reload_via_addons = true;
  location.reload();
});

AddonChannels.changeChannel.addEventListener('message', e => {
  SettingsStore.setStoreWithVersionCheck(e.data);
});

runAddons();
