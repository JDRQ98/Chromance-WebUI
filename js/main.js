// File: /js/main.js

import { initEffectsManager, updateCurrentEffect, effects, currentEffectId } from './effectsManager.js';
import { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes } from './nodeManager.js';
import { initModalManager, updateModal } from './modalManager.js';
import { initGlobalSettingsManager, globalSettings, resetGlobalSettings, loadGlobalSettings } from './globalSettingsManager.js'
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js'
import { ProfileDataConverter } from './landing.js'

let nodeSpecificSettings = {};

function resetAllSettings(globalSettings, loadGlobalSettings) {
    resetGlobalSettings(globalSettings);
    nodeSpecificSettings = {};
    if (window.nodeManager){
        window.nodeManager.deactivateAllNodes()
    }
    setActiveNodes([9])
    updateModal([], getActiveNodes(), nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    loadGlobalSettings(globalSettings);
}

function calculateNodePositions() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const numNodes = 19;
    const baseNodeSize = 30; //This will now match the CSS variable

    // Calculate the horizontal and vertical spacing
    const horizontalSpacing = containerWidth / 6; //Approx 6 columns
    const verticalSpacing = containerHeight / 6; //Approx 6 rows

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
        nodeWrapper.style.left = `${nodePositions[index].x - (baseNodeSize / 2)}px`;
        nodeWrapper.style.top = `${nodePositions[index].y - (baseNodeSize / 2)}px`;
    });
}

function initializeApp() {
    calculateNodePositions();
    initGlobalSettingsManager(globalSettings, resetAllSettings, updateNodeStyles, loadGlobalSettings);
    initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings, setActiveNodes);
    initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    initModalManager(nodeSpecificSettings, globalSettings, updateNodeStyles, updateModal, updateCurrentEffect, setActiveNodes, getActiveNodes);
    
    // Check if we're editing a profile from the landing page
    loadProfileFromLandingPage();
    
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    drawHexagon();
}

function loadProfileFromLandingPage() {
    const editingProfileIndex = localStorage.getItem('editingProfileIndex');
    const profileData = localStorage.getItem('profileData');
    
    if (editingProfileIndex !== null && profileData) {
        try {
            const microcontrollerProfile = JSON.parse(profileData);
            const editorProfile = ProfileDataConverter.convertToEditorFormat(microcontrollerProfile);
            
            // Update global settings
            Object.assign(globalSettings, editorProfile.globalSettings);
            
            // Update node specific settings
            nodeSpecificSettings = editorProfile.nodeSpecificSettings || {};
            
            // Set active nodes
            setActiveNodes(editorProfile.activeNodes);
            
            // Update the effect name in the UI
            const effectNameInput = document.getElementById('effectNameInput');
            if (effectNameInput) {
                effectNameInput.value = editorProfile.ProfileName || 'Unnamed Profile';
            }
            
            // Update the effect title
            const effectTitle = document.getElementById('effectTitle');
            if (effectTitle) {
                effectTitle.textContent = `Effect editor: ${editorProfile.ProfileName || 'Unnamed Profile'}`;
            }
            
            // Store the profile index for saving
            window.editingProfileIndex = parseInt(editingProfileIndex);
            
            // Clear the stored data
            localStorage.removeItem('editingProfileIndex');
            localStorage.removeItem('profileData');
            
            console.log('Loaded profile from landing page:', editorProfile);
        } catch (error) {
            console.error('Error loading profile from landing page:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    window.addEventListener('resize', calculateNodePositions);
    
    // Add back button functionality
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

// Function to send the configuration to the microcontroller
function sendConfigurationToMicrocontroller() {
    const activeNodes = getActiveNodes();
    const currentEffect = effects[currentEffectId];
    
    // Get the profile name from the input field
    const effectNameInput = document.getElementById('effectNameInput');
    const profileName = effectNameInput ? effectNameInput.value : 'Unnamed Profile';
    
    // Create the editor format data
    const editorProfile = {
        ProfileIndex: window.editingProfileIndex !== undefined ? window.editingProfileIndex : 0,
        ProfileName: profileName,
        Active: true,
        activeNodes: activeNodes,
        globalSettings: currentEffect.globalSettings,
        nodeSpecificSettings: nodeSpecificSettings
    };
    
    // Convert to microcontroller format
    const microcontrollerData = ProfileDataConverter.convertToMicrocontrollerFormat(editorProfile);
    
    // Log the data being sent
    console.log("Sending profile to microcontroller:", microcontrollerData);
    
    // Determine the endpoint based on whether we're editing an existing profile
    const endpoint = window.editingProfileIndex !== undefined ? 
        'http://hexagono.local/UpdateProfile' : 
        'http://hexagono.local/updateInternalVariables';
    
    // Send the POST request to the microcontroller
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(microcontrollerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            return response.text();
        }
    })
    .then(responseData => {
        console.log('Profile saved successfully:', responseData);
        showNotification('Profile saved successfully!', 'success');
        
        // If we're editing a profile from the landing page, redirect back
        if (window.editingProfileIndex !== undefined) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        showNotification('Error saving profile. See console for details.', 'error');
    });
}

// Function to show notifications (similar to landing page)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#007bff'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
// Make the function globally accessible
window.mainJS = {
    sendConfigurationToMicrocontroller: sendConfigurationToMicrocontroller
};

export { nodeSpecificSettings, globalSettings, generateRainbowColors, generateRandomColors, generateSimilarColors };