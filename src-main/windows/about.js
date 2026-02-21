const AbstractWindow = require('./abstract');
const {translate} = require('../l10n');
const packageJSON = require('../../package.json');
const {APP_NAME} = require('../brand');
const {getDist, getPlatform} = require('../platform');
const {ipcMain, BrowserWindow} = require('electron');

// 全局标志，确保处理器只注册一次
let isHandlerRegistered = false;

class AboutWindow extends AbstractWindow {
  constructor () {
    super();

    this.window.setMinimizable(false);
    this.window.setMaximizable(false);
    this.window.setTitle(translate('about').replace('{APP_NAME}', APP_NAME));

    this.ipc.on('get-info', (event) => {
      event.returnValue = {
        version: packageJSON.version,
        dist: getDist(),
        electron: process.versions.electron,
        platform: getPlatform(),
        arch: process.arch
      };
    });

    // 注册全局 IPC 处理器（只注册一次）
    if (!isHandlerRegistered) {
      ipcMain.handle('get-editor-local-storage', async (event, key) => {
        console.log('get-editor-local-storage called with key:', key);
        const windows = BrowserWindow.getAllWindows();
        console.log('All windows:', windows.map(w => w.webContents.getURL()));
        const editorWindow = windows.find(w => w.webContents.getURL().startsWith('tw-editor://'));
        if (editorWindow) {
          const result = await editorWindow.webContents.executeJavaScript(`localStorage.getItem('${key}')`);
          console.log('Result:', result);
          return result;
        } else {
          console.log('No editor window found');
          return null;
        }
      });
      isHandlerRegistered = true;
    }

    this.loadURL('tw-about://./about.html');
  }

  getDimensions () {
    return {
      width: 945,
      height: 680
    };
  }

  getPreload () {
    return 'about';
  }

  isPopup () {
    return true;
  }

  static show () {
    const window = AbstractWindow.singleton(AboutWindow);
    window.show();
  }
}

module.exports = AboutWindow;
