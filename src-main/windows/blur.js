const settings = require('../settings');

const getAlphaGain = () => settings.blurAlphaGain;

const generateCSS = (alphaGain) => `
        [class*=gui_body-wrapper]{
             background: color-mix(in srgb, $ui-primary, transparent 70%) !important
        } 
        [class*=gui_tab-list]{
            background: linear-gradient(to right, color-mix(in srgb, $ui-primary, transparent ${10 * alphaGain}%), color-mix(in srgb, $ui-primary, transparent ${20 * alphaGain}%));
        }
        [class*=gui_vscode]{
            background: linear-gradient(to bottom, color-mix(in srgb, $ui-primary, transparent ${10 * alphaGain}%), color-mix(in srgb, $ui-primary, transparent ${60 * alphaGain}%)) !important;
        }
        [class*=gui_stage-and-target-wrapper]{
            background: linear-gradient(to left, color-mix(in srgb, $ui-primary, transparent ${10 * alphaGain}%), color-mix(in srgb, $ui-primary, transparent ${20 * alphaGain}%));
        }

        [class*=menu-bar_main-menu],[class*=menu-bar_controlButton],[class*=menu-bar_control-bar]{
            background-color: transparent !important;
        }
        [class*=menu-bar_menu-bar]:not([class*=menu-bar_menu-bar-item]):not([class*=menu-bar_menu-bar-button]){
            background-color: color-mix(in srgb, $menu-bar-background, transparent ${20 * alphaGain}%) !important;
        }

        [class*=sprite-selector_sprite-selector]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${60 * alphaGain}%) !important;
        }
        [class*=sprite-info_sprite-info],[class*=stage-selector_stage-selector]
        { 
            background-color: color-mix(in srgb, $ui-white, transparent ${60 * alphaGain}%) !important
        }

        [class*=backpack_backpack-header]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${10 * alphaGain}%) !important
        }

        [class*=blocklySvg]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${20 * alphaGain}%) !important;
            --enable-workspace-background: color-mix(in srgb, $ui-secondary, transparent ${20 * alphaGain}%) !important;
        }

        [class*=blocklyFlyoutBackground]{
            fill-opacity: .10 !important
        }
        [class*=blocklyToolboxDiv]{
            background-color: transparent !important;
            backdrop-filter: blur(10px)
        }
        [class*=scratchCategoryMenu]{
            background: transparent !important
        }
        [class*=categorySelected]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${20 * alphaGain}%) !important
        }

        .sa-hide-flyout-not-fullscreen .sa-body-editor [class*="gui_stage-and-target-wrapper"] {
            background-color: transparent !important
        }
`;

// Map to store CSS keys for each webContents id
const cssKeys = new Map();

const blurCSS = async (webContents) => {
    if (settings.useBlurBackground) {
        const css = generateCSS(getAlphaGain());
        const key = await webContents.insertCSS(css.replace(/\$([a-zA-Z0-9_-]+)/g, 'var(--$1)'));
        cssKeys.set(webContents.id, key);
    }
};

const updateBlurCSS = async (webContents) => {
    const id = webContents.id;
    const existingKey = cssKeys.get(id);
    
    if (existingKey) {
        await webContents.removeInsertedCSS(existingKey);
    }
    
    if (settings.useBlurBackground) {
        const css = generateCSS(getAlphaGain());
        const key = await webContents.insertCSS(css.replace(/\$([a-zA-Z0-9_-]+)/g, 'var(--$1)'));
        cssKeys.set(id, key);
    }
};

const removeBlurCSS = async (webContents) => {
    const id = webContents.id;
    const key = cssKeys.get(id);
    if (key) {
        await webContents.removeInsertedCSS(key);
        cssKeys.delete(id);
    }
};

module.exports = blurCSS;
module.exports.updateBlurCSS = updateBlurCSS;
module.exports.removeBlurCSS = removeBlurCSS;
