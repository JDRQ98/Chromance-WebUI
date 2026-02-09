// globalSettingsManager.js - Simplified for single ProfileSettings structure

import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';

// Minimal global settings manager for ProfileEditor (no global modal)
function initGlobalSettingsManager(profileSettings, resetAllSettings, updateNodeStyles, loadGlobalSettings) {
    // This function is now minimal since we use ProfileSettings directly
    console.log("initGlobalSettingsManager called - using ProfileSettings approach");
}

// Function to reset all settings to default
function resetGlobalSettings(profileSettings) {
    profileSettings.ProfileName = 'Default Profile';
    profileSettings.Behavior = 0; // weaksauce
    profileSettings.Direction = -1; // All directions
    profileSettings.RippleLifeSpan = 3000;
    profileSettings.DelayBetweenRipples_ms = 1000;
    profileSettings.RippleSpeed = 1.0;
    profileSettings.RainbowDeltaPerTick = 100;
    profileSettings.NumberOfColors = 3;
    profileSettings.Colors = generateRainbowColors(7);
    profileSettings.ActiveNodes = [9];
}

// Function to load global settings (no longer needed with ProfileSettings)
function loadGlobalSettings(profileSettings) {
    console.log("loadGlobalSettings called - no longer needed with ProfileSettings approach");
}

// Function to save global settings (no longer needed with ProfileSettings)
function saveGlobalSettings(profileSettings, updateNodeStyles) {
    console.log("saveGlobalSettings called - no longer needed with ProfileSettings approach");
}

// Modal functions (no longer needed)
function openGlobalSettingsModal() {
    console.log("openGlobalSettingsModal called - no longer needed");
}

function closeGlobalSettingsModal() {
    console.log("closeGlobalSettingsModal called - no longer needed");
}

export { 
    initGlobalSettingsManager, 
    resetGlobalSettings, 
    loadGlobalSettings, 
    openGlobalSettingsModal, 
    closeGlobalSettingsModal 
};