const AbstractWindow = require('./abstract');

const getExtensionEditorURL = () => {
  const devURL = process.env.SCRATCH_EXTENSION_EDITOR_DEV_URL;
  if (devURL) {
    return devURL;
  }
  return 'tw-extension-editor://./scratch-extension-editor/index.html';
};

class ExtensionEditorWindow extends AbstractWindow {
  constructor (editorWindow) {
    super({
      parentWindow: editorWindow.window
    });

    this.editorWindow = editorWindow;

    this.ipc.handle('extension-editor-hot-reload', async (event, data) => {
      if (this.editorWindow.window.isDestroyed()) {
        return {
          success: false,
          error: 'Editor window is no longer available'
        };
      }

      this.editorWindow.window.webContents.send('extension-editor-hot-reload', data);
      return {
        success: true
      };
    });

    this.loadURL(getExtensionEditorURL());
    this.show();
  }

  getPreload () {
    return 'extension-editor';
  }

  getDimensions () {
    return {
      width: 1400,
      height: 900
    };
  }

  isPopup () {
    return true;
  }

  static forEditor (editorWindow) {
    const windows = AbstractWindow.getWindowsByClass(ExtensionEditorWindow);
    const existingWindow = windows.find((window) => window.editorWindow === editorWindow);
    if (existingWindow) {
      existingWindow.show();
      return existingWindow;
    }

    return new ExtensionEditorWindow(editorWindow);
  }
}

module.exports = ExtensionEditorWindow;
