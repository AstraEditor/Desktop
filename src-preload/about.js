const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('AboutPreload', {
  getInfo: () => ipcRenderer.sendSync('get-info'),
  localStorage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  },
  getEditorLocalStorage: (key) => ipcRenderer.invoke('get-editor-local-storage', key)
});
