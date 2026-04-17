const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('IsDesktop', true);

contextBridge.exposeInMainWorld('DesktopExtensionEditor', {
  hotReload: (data) => ipcRenderer.invoke('extension-editor-hot-reload', data)
});
