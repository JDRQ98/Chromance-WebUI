// File: /js/main.js
// main.js
import { initEffectsManager, updateCurrentEffect } from './effectsManager.js';
import { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes } from './nodeManager.js';
import { initModalManager, updateModal } from './modalManager.js'; //Removed closeModal import
import { initGlobalSettingsManager, globalSettings, resetGlobalSettings, loadGlobalSettings } from './globalSettingsManager.js'
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js' //Import the drawHexagon function

let nodeSpecificSettings = {}; // Object to store node-specific settings

function resetAllSettings(globalSettings, loadGlobalSettings) {
    resetGlobalSettings(globalSettings);
    nodeSpecificSettings = {};
    if (window.nodeManager){
        window.nodeManager.deactivateAllNodes()
    }
    setActiveNodes([9]) // Set node 9 as active
    updateModal([], getActiveNodes(), nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    loadGlobalSettings(globalSettings); // Load the reset settings into the modal
}
function initializeApp() {
    // Set the position of the nodes
    document.querySelectorAll('.hex-wrap').forEach(nodeWrapper => {
        nodeWrapper.style.left = `${nodeWrapper.dataset.x}px`;
        nodeWrapper.style.top = `${nodeWrapper.dataset.y}px`;
    });
    initGlobalSettingsManager(globalSettings, resetAllSettings, updateNodeStyles, loadGlobalSettings);
    initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings, setActiveNodes);
    initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    initModalManager(nodeSpecificSettings, globalSettings, updateNodeStyles, updateModal, updateCurrentEffect, setActiveNodes, getActiveNodes);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    drawHexagon();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

export { nodeSpecificSettings, globalSettings, generateRainbowColors, generateRandomColors, generateSimilarColors };