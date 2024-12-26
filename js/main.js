// main.js
import { initEffectsManager } from './effectsManager.js';
import { initNodeManager, updateNodeStyles } from './nodeManager.js';
import { initModalManager, updateModal, closeModal } from './modalManager.js';
import { initGlobalSettingsManager, globalSettings, resetGlobalSettings, loadGlobalSettings} from './globalSettingsManager.js'
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
let nodeSpecificSettings = {}; // Object to store node-specific settings


function resetAllSettings(globalSettings) {
    resetGlobalSettings(globalSettings);
    nodeSpecificSettings = {};
    updateModal(nodeSpecificSettings, globalSettings);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
}
window.onload = function () {
    drawHexagon(); /* from drawVisualizer.js - draw all lines for hexagon */
     initGlobalSettingsManager(globalSettings, resetAllSettings, updateNodeStyles, loadGlobalSettings);
    initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
     initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, closeModal);
     initModalManager(nodeSpecificSettings, globalSettings, updateNodeStyles, updateModal);
        updateNodeStyles(globalSettings, nodeSpecificSettings);
};

export {nodeSpecificSettings, globalSettings, generateRainbowColors, generateRandomColors, generateSimilarColors };