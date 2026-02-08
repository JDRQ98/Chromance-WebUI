// File: /js/main.js
// Refactored main entry point using new architecture

import eventBus, { Events } from './core/eventBus.js';
import store from './core/stateStore.js';
import wsClient from './core/wsClient.js';
import { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes } from './managers/nodeManager.js';
import { initModalManager } from './managers/modalManager.js';
import { initEffectsManager, getCurrentEffectId, getEffects } from './managers/effectsManager.js';
import { initGlobalSettingsManager, getGlobalSettings, loadGlobalSettings, resetGlobalSettings } from './managers/globalSettingsManager.js';
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js';

function calculateNodePositions() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const baseNodeSize = 30;

    const horizontalSpacing = containerWidth / 6;
    const verticalSpacing = containerHeight / 6;

    const nodePositions = [
        { x: 3 * horizontalSpacing, y: 0 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 1 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 1 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 2 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 2 * verticalSpacing },
        { x: 5.5 * horizontalSpacing, y: 2 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 3 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 3 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 5.5 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 5 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 5 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 6 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 6 * verticalSpacing },
        { x: 5.5 * horizontalSpacing, y: 6 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 7 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 7 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 8 * verticalSpacing },
    ];

    document.querySelectorAll('.hex-wrap').forEach((nodeWrapper, index) => {
        if (nodePositions[index]) {
            nodeWrapper.style.left = `${nodePositions[index].x - (baseNodeSize / 2)}px`;
            nodeWrapper.style.top = `${nodePositions[index].y - (baseNodeSize / 2)}px`;
        }
    });
}

function initializeApp() {
    console.log('Initializing Hexachrome WebUI...');

    // Calculate node positions
    calculateNodePositions();

    // Initialize managers
    initGlobalSettingsManager();
    initEffectsManager();
    initNodeManager();
    initModalManager();

    // Update node styles
    updateNodeStyles();

    // Draw hexagon visualizer
    drawHexagon();

    // Connect WebSocket
    wsClient.connect();

    console.log('Hexachrome WebUI initialized');
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    window.addEventListener('resize', calculateNodePositions);
});

// Send configuration to microcontroller (supports both WebSocket and HTTP fallback)
async function sendConfigurationToMicrocontroller() {
    const config = store.getConfiguration();

    console.log("Sending configuration:", config);

    // Try WebSocket first
    if (wsClient.isConnected) {
        const success = await wsClient.sendConfiguration();
        if (success) {
            console.log('Configuration sent via WebSocket');
            return;
        }
    }

    // Fallback to HTTP
    try {
        const response = await fetch('http://hexagono.local/updateInternalVariables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Configuration sent successfully via HTTP:', responseData);
        alert('Configuration sent successfully!');
    } catch (error) {
        console.error('Error sending configuration:', error);
        alert('Error sending configuration. See console for details.');
    }
}

// Make functions globally accessible for backward compatibility
window.mainJS = {
    sendConfigurationToMicrocontroller
};

// Legacy exports for backward compatibility
const globalSettings = store.globalSettings;
const nodeSpecificSettings = store.nodeSpecificSettings;

export {
    nodeSpecificSettings,
    globalSettings,
    generateRainbowColors,
    generateRandomColors,
    generateSimilarColors,
    store,
    eventBus,
    Events,
    wsClient
};
