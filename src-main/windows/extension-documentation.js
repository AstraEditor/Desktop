const AbstractWindow = require('./abstract');
const {translate} = require('../l10n');
const {PLATFORM_NAME} = require('../brand');

class ExtensionDocumentationWindow extends AbstractWindow {
  constructor (path, protocol) {
    super();

    this.path = path;
    this.protocol = protocol;

    const title = translate('extension-documentation.title').replace('{APP_NAME}', PLATFORM_NAME);
    this.window.setTitle(title);

    this.window.on('page-title-updated', (event, newTitle) => {
      event.preventDefault();

      // Window title will be like "Simple 3D - TurboWarp Extension Documentation"
      // We want to replace the last part with the translated string from desktop app resources
      newTitle = newTitle.replace(/-[^-]+$/, `- ${title}`);
      this.window.setTitle(newTitle);
    });

    // The protocol handler will check for path traversal, so we don't need to check here.
    this.loadURL(`${protocol}://./${path}`);
  }

  getDimensions () {
    return {
      width: 650,
      height: 700
    };
  }

  getPreload () {
    return 'extension-documentation';
  }

  isPopup () {
    return true;
  }

  /**
   * @param {string} path Path part of an extension-library URL, without leading /
   * @param {'tw-extensions'|'tw-astra-extensions'} protocol
   */
  static open(path, protocol = 'tw-extensions') {
    const windows = AbstractWindow.getWindowsByClass(ExtensionDocumentationWindow);
    const existingWindow = windows.find(i => i.path === path && i.protocol === protocol);
    if (existingWindow) {
      existingWindow.show();
    } else {
      const newWindow = new ExtensionDocumentationWindow(path, protocol);
      newWindow.show();
    }
  }
}

module.exports = ExtensionDocumentationWindow;
