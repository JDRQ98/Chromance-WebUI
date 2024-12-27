// main.js
import { initEffectsManager, updateCurrentEffect } from './effectsManager.js';
import { initNodeManager, updateNodeStyles, activeNodes, deactivateAllNodes } from './nodeManager.js';
import { initModalManager, updateModal, closeModal } from './modalManager.js';
import { initGlobalSettingsManager, globalSettings, resetGlobalSettings, loadGlobalSettings } from './globalSettingsManager.js'
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js' //Import the drawHexagon function

let nodeSpecificSettings = {}; // Object to store node-specific settings

function resetAllSettings(globalSettings) {
    resetGlobalSettings(globalSettings);
    nodeSpecificSettings = {};
    deactivateAllNodes(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings);
    updateModal(nodeSpecificSettings, globalSettings);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
}
function initializeApp() {
    // Set the position of the nodes
    document.querySelectorAll('.hex-wrap').forEach(nodeWrapper => {
        nodeWrapper.style.left = `${nodeWrapper.dataset.x}px`;
        nodeWrapper.style.top = `${nodeWrapper.dataset.y}px`;
    });
    initGlobalSettingsManager(globalSettings, resetAllSettings, updateNodeStyles, loadGlobalSettings);
    initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
    initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, closeModal, updateCurrentEffect);
    initModalManager(nodeSpecificSettings, globalSettings, updateNodeStyles, updateModal, updateCurrentEffect);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    drawHexagon();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

export { nodeSpecificSettings, globalSettings, generateRainbowColors, generateRandomColors, generateSimilarColors };