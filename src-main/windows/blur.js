const settings = require('../settings');

const getAlphaGain = () => settings.blurAlphaGain;

const generateCSS = (alphaGain) => `
        [class*=gui_body-wrapper]{
            background: color-mix(in srgb, $ui-primary, transparent ${45 * alphaGain}%) !important
        }

        [class*=menu-bar_menu-bar]:not([class*=menu-bar_menu-bar-item]):not([class*=menu-bar_menu-bar-button]){
            background: linear-gradient(to right, color-mix(in srgb, $menu-bar-background, transparent ${15 * alphaGain}%), $menu-bar-background) !important;
        }
        [class*=menu-bar_main-menu],[class*=menu-bar_control-bar]{
            background-color: transparent !important;
        }
        [class*=menu-bar_controlButton]{
            background-color: transparent !important;
        }
        [class*=menu-bar_controlButton]:hover{
            background-color: #ffffff20 !important;
        }

        [class*=gui_tab-list]:not([class*=gui_vscode]){
            background: color-mix(in srgb, $ui-primary, transparent ${30 * alphaGain}%) !important;
        }
        [class*=gui_vscode] [class*=gui_tab-list]{
            background: linear-gradient(to bottom, color-mix(in srgb, $ui-primary, transparent ${30 * alphaGain}%), color-mix(in srgb, $ui-primary, transparent ${20 * alphaGain}%)) !important;
        }
        [class*=gui_vscode]{
            background: transparent !important
        }
        [class*=gui_stage-and-target-wrapper]{
            background: linear-gradient(to left, color-mix(in srgb, $ui-primary, transparent ${30 * alphaGain}%), color-mix(in srgb, $ui-primary, transparent ${20 * alphaGain}%)) !important;
        }

        [class*=stage-header_stage-menu-wrapper]{
            background-color: color-mix(in srgb, $ui-primary, transparent ${30 * alphaGain}%) !important
        }

        [class*=sprite-selector_sprite-selector]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${35 * alphaGain}%) !important;
        }
        [class*=sprite-info_sprite-info],[class*=stage-selector_stage-selector]{
            background-color: color-mix(in srgb, $ui-white, transparent ${35 * alphaGain}%) !important
        }

        [class*=backpack_backpack-header]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${20 * alphaGain}%) !important
        }

        [class*=blocklySvg]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${35 * alphaGain}%) !important;
            --enable-workspace-background: color-mix(in srgb, $ui-secondary, transparent ${35 * alphaGain}%) !important;
        }
        [class*=gui_editor-wrapper],[class*=gui_tab-panel]{
            background-color: transparent !important;
        }

        [class*=blocklyFlyoutBackground]{
            fill-opacity: .5 !important
        }
        [class*=blocklyToolboxDiv]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${15 * alphaGain}%) !important;
        }
        [class*=scratchCategoryMenu]{
            background: transparent !important
        }
        [class*=categorySelected]{
            background-color: color-mix(in srgb, $ui-secondary, transparent ${15 * alphaGain}%) !important
        }

        .sa-hide-flyout-not-fullscreen .sa-body-editor [class*="gui_stage-and-target-wrapper"] {
            background-color: transparent !important
        }

        [class*=gui_target-wrapper] [class*=input_input-form] {
            background-color: color-mix(in srgb, $input-background, transparent ${15 * alphaGain}%) !important
        }

        [class*=sa-file-list-toolbar] {
            background-color: color-mix(in srgb, $ui-secondary, transparent ${15 * alphaGain}%) !important
        }

        [class*=stage-selector_header] {
            background-color: color-mix(in srgb, $ui-white, transparent ${15 * alphaGain}%) !important
        }

        [class*=blocklyZoom] {
            opacity: ${80 * alphaGain}%
        }

        [class*=backpack_backpack-list]{
            background-color: color-mix(in srgb, $ui-white, transparent ${15 * alphaGain}%) !important
        }

        [class*=gui_vscode] [class*=gui_tab][class*=gui_is-selected]{
            background-color: transparent !important
        }

        [class*=asset-panel_wrapper] {
            background-color: color-mix(in srgb, var(--assets-background), transparent ${35 * alphaGain}%) !important
        }

        [class*=selector_wrapper] {
            background-color: color-mix(in srgb, $ui-secondary, transparent ${35 * alphaGain}%) !important
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
