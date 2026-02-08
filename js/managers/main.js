// File: /js/managers/main.js
// Refactored main entry point - bootstrap only

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';
import wsClient from '../core/wsClient.js';
import effectSequencer from '../core/effectSequencer.js';
import { rippleSimulator } from '../core/rippleSimulator.js';
import { canvasVisualizer } from '../core/canvasVisualizer.js';
import { initNodeManager } from './nodeManager.js';
import { initModalManager } from './modalManager.js';
import { initEffectsManager } from './effectsManager.js';
import { initGlobalSettingsManager } from './globalSettingsManager.js';
import { initSequenceManager } from './sequenceManager.js';
import { drawHexagon } from '../drawVisualizer.js';

// Preview state
let isPreviewActive = false;

function calculateNodePositions() {
    const container = document.getElementById('container');
    if (!container) return;
    
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

function initPreviewToggle() {
    const toggleBtn = document.getElementById('previewToggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        isPreviewActive = !isPreviewActive;
        
        if (isPreviewActive) {
            toggleBtn.classList.add('active');
            toggleBtn.querySelector('.preview-icon').textContent = '⏸';
            toggleBtn.querySelector('.preview-label').textContent = 'Stop';
            
            // Sync current settings to simulator
            const globalSettings = store.getGlobalSettings();
            const activeNodes = store.getActiveNodeIds();
            
            rippleSimulator.updateConfig({
                ...globalSettings,
                activeNodes: activeNodes.length > 0 ? activeNodes : [9], // Default to center
                colors: globalSettings.colors || []
            });
            
            // Start the preview
            rippleSimulator.start();
            canvasVisualizer.startAnimationLoop();
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.querySelector('.preview-icon').textContent = '▶';
            toggleBtn.querySelector('.preview-label').textContent = 'Preview';
            
            // Stop the preview
            rippleSimulator.stop();
        }
    });

    // Listen for settings changes while preview is active
    eventBus.on(Events.GLOBAL_SETTINGS_SAVED, (settings) => {
        if (isPreviewActive) {
            rippleSimulator.updateConfig(settings);
        }
        // Also emit for the simulator's internal listener
        eventBus.emit('globalSettings:changed', settings);
    });

    // Listen for active nodes changes
    eventBus.on(Events.NODES_ACTIVATED, () => {
        if (isPreviewActive) {
            const activeNodes = store.getActiveNodeIds();
            rippleSimulator.updateConfig({
                activeNodes: activeNodes.length > 0 ? activeNodes : [9]
            });
            canvasVisualizer.setActiveNodes(activeNodes);
        }
    });

    eventBus.on(Events.NODES_DEACTIVATED, () => {
        if (isPreviewActive) {
            const activeNodes = store.getActiveNodeIds();
            rippleSimulator.updateConfig({
                activeNodes: activeNodes.length > 0 ? activeNodes : [9]
            });
            canvasVisualizer.setActiveNodes(activeNodes);
        }
    });

    // Handle canvas node clicks
    eventBus.on('canvas:nodeClicked', (nodeId) => {
        // Trigger the same behavior as clicking a node in the DOM
        eventBus.emit(Events.NODES_SELECTED, { nodeIds: [nodeId], toggle: true });
    });
}

function initializeApp() {
    console.log('Initializing Hexachrome WebUI...');

    // Initialize canvas visualizer first (it's the main visual)
    const visualizerInitialized = canvasVisualizer.init('visualizer-container');
    
    if (visualizerInitialized) {
        console.log('Canvas visualizer initialized');
        // Set initial active nodes from store
        const activeNodes = store.getActiveNodeIds();
        canvasVisualizer.setActiveNodes(activeNodes.length > 0 ? activeNodes : [9]);
    } else {
        console.warn('Canvas visualizer failed to initialize, falling back to legacy');
        const legacyContainer = document.getElementById('container');
        if (legacyContainer) {
            legacyContainer.classList.add('show');
        }
    }

    // Calculate legacy node positions (still needed for modal/interaction)
    calculateNodePositions();

    // Initialize managers (order matters for DOM dependencies)
    initGlobalSettingsManager();
    initEffectsManager();
    initNodeManager();
    initModalManager();
    initSequenceManager();

    // Initialize preview toggle
    initPreviewToggle();

    // Draw legacy hexagon visualizer (hidden by default)
    drawHexagon();

    // Connect WebSocket
    wsClient.connect();

    console.log('Hexachrome WebUI initialized');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    window.addEventListener('resize', calculateNodePositions);
});

// Export for external access if needed
export { store, eventBus, Events, wsClient, effectSequencer, rippleSimulator, canvasVisualizer };
