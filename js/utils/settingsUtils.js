// File: /js/utils/settingsUtils.js
// Helper utilities for setting names and input IDs

// Map setting names to modal input IDs
export function getModalInputId(setting) {
    return `modal${capitalize(setting)}`;
}

// Map setting names to global input IDs
export function getGlobalInputId(setting) {
    return setting;
}

// Capitalize first letter
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Setting display formatters
export const formatters = {
    rippleSpeed: (value) => parseFloat(value).toFixed(2),
    decayPerTick: (value) => parseFloat(value).toFixed(3),
    default: (value) => String(value)
};

export function formatSettingValue(setting, value) {
    const formatter = formatters[setting] || formatters.default;
    return formatter(value);
}

// Settings that require special handling
export const rangeSettings = ['rippleSpeed', 'decayPerTick'];
export const colorSettings = ['startingColor', 'colors'];

// All modal settings
export const modalSettings = [
    'desiredBehavior',
    'rippleDirection',
    'rippleDelay',
    'rippleLifeSpan',
    'rippleSpeed',
    'decayPerTick',
    'hueDeltaTick',
    'startingColor'
];

// All global settings
export const globalSettingsKeys = [
    'effectBasis',
    'effectDuration',
    'desiredBehavior',
    'rippleDirection',
    'rippleDelay',
    'rippleLifeSpan',
    'rippleSpeed',
    'decayPerTick',
    'hueDeltaTick',
    'numberOfRipples',
    'colors'
];

// Check if a setting has a display element (for range inputs)
export function hasDisplayElement(setting) {
    return rangeSettings.includes(setting);
}

// Get display element ID for a setting
export function getDisplayId(setting, prefix = 'modal') {
    return `${prefix}${capitalize(setting)}Display`;
}
