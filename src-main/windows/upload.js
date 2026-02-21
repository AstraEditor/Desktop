const AbstractWindow = require('./abstract');

class UploadWindow extends AbstractWindow {
  getDimensions () {
    return {
      width: 900,
      height: 700
    };
  }

  getBackgroundColor () {
    return '#ffffff';
  }

  static open (parentWindow) {
    const window = new UploadWindow({parentWindow});
    window.loadURL('tw-editor://./gui/upload.html');
    window.show();
    return window;
  }
}

module.exports = UploadWindow;

