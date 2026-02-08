// File: /js/managers/globalSettingsManager.js
// Refactored global settings manager using event bus and centralized state

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';
import ColorPaletteManager from '../components/colorPaletteManager.js';
import wsClient from '../core/wsClient.js';
import { formatSettingValue, globalSettingsKeys } from '../utils/settingsUtils.js';

class GlobalSettingsManager {
    constructor() {
        this.modal = document.getElementById('globalSettingsModal');
        this.overlay = document.getElementById('overlay');

        this._cacheInputs();
        this._setupColorPalette();
        this._bindEvents();
        this._subscribeToEvents();
        this._loadSettings();
    }

    _cacheInputs() {
        this.inputs = {};
        this.displays = {};

        // Cache all input elements
        ['effectBasis', 'effectDuration', 'desiredBehavior', 'rippleDirection',
         'rippleDelay', 'rippleLifeSpan', 'rippleSpeed', 'decayPerTick',
         'hueDeltaTick', 'numberOfRipples'].forEach(setting => {
            this.inputs[setting] = document.getElementById(setting);
        });

        // Cache display elements for range inputs
        this.displays.rippleSpeed = document.getElementById('rippleSpeedDisplay');
        this.displays.decayPerTick = document.getElementById('decayPerTickDisplay');

        // Effect name input
        this.effectNameInput = document.getElementById('effectNameInput');
    }

    _setupColorPalette() {
        this.colorPalette = new ColorPaletteManager({
            container: document.getElementById('globalColorContainer'),
            addButton: document.getElementById('addGlobalColorButton'),
            removeButton: document.getElementById('removeGlobalColorButton'),
            rainbowButton: document.getElementById('globalRainbowButton'),
            randomButton: document.getElementById('globalRandomButton'),
            similarButton: document.getElementById('globalSimilarButton'),
            maxColors: 25,
            minColors: 1
        });
    }

    _bindEvents() {
        // Range input display updates
        if (this.inputs.rippleSpeed) {
            this.inputs.rippleSpeed.addEventListener('input', () => {
                this.displays.rippleSpeed.textContent = formatSettingValue('rippleSpeed', this.inputs.rippleSpeed.value);
            });
        }

        if (this.inputs.decayPerTick) {
            this.inputs.decayPerTick.addEventListener('input', () => {
                this.displays.decayPerTick.textContent = formatSettingValue('decayPerTick', this.inputs.decayPerTick.value);
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen()) {
                this.close();
            }
            if (event.key === 'Enter' && this.isOpen()) {
                this.save();
            }
        });

        // Submit button
        document.getElementById('submitButton')?.addEventListener('click', () => {
            this.save();
        });

        // Discard button
        document.getElementById('discardButton')?.addEventListener('click', () => {
            this._loadSettings();
            this.close();
        });

        // Restore defaults button
        document.getElementById('restoreDefaultsButton')?.addEventListener('click', () => {
            store.resetToDefaults();
            this._loadSettings();
            this.close();
        });

        // Fire ripple button
        document.getElementById('fireRippleButton')?.addEventListener('click', () => {
            wsClient.fireRipple();
        });

        // Apply changes button (sends config to microcontroller)
        document.getElementById('applyChanges')?.addEventListener('click', () => {
            wsClient.sendConfiguration();
        });

        // Edit effect button opens this modal
        eventBus.subscribe('globalSettings:openModal', () => {
            if (this.isOpen()) {
                this.close();
            } else {
                this.open();
            }
        });
    }

    _subscribeToEvents() {
        eventBus.subscribe(Events.EFFECT_LOADED, () => {
            this._loadSettings();
        });

        eventBus.subscribe(Events.SETTINGS_CHANGED, ({ type }) => {
            if (type === 'reset' || type === 'restored' || type === 'firmwareSync') {
                this._loadSettings();
            }
        });

        // Subscribe to firmware state sync - update UI when firmware state is applied
        eventBus.subscribe(Events.FIRMWARE_STATE_SYNCED, ({ state }) => {
            console.log('GlobalSettingsManager: Firmware state synced, updating UI');
            this._loadSettings();
        });

        // Subscribe to WebSocket connection - could request sync on reconnect
        eventBus.subscribe(Events.WS_CONNECTED, () => {
            console.log('GlobalSettingsManager: WebSocket connected');
            // Firmware automatically sends state on connect, no action needed
        });
    }

    isOpen() {
        return this.modal.classList.contains('show');
    }

    open() {
        this._loadSettings();
        this.modal.classList.add('show');
        this.overlay.classList.add('show');
    }

    close() {
        this.modal.classList.remove('show');
        this.overlay.classList.remove('show');
    }

    save() {
        const settings = {};

        // Collect all settings from inputs
        Object.entries(this.inputs).forEach(([key, input]) => {
            if (input) {
                if (input.type === 'number' || input.type === 'range') {
                    settings[key] = Number(input.value);
                } else {
                    settings[key] = input.value;
                }
            }
        });

        // Collect colors
        settings.colors = this.colorPalette.getColors();

        // Update store
        store.setGlobalSettings(settings);

        // Update effect name if changed
        if (this.effectNameInput) {
            const newName = this.effectNameInput.value.trim();
            if (newName && newName !== store.currentEffect?.name) {
                store.updateEffectName(store.currentEffectId, newName);
            }
        }

        eventBus.publish(Events.GLOBAL_SETTINGS_SAVED, { settings });
        this.close();
    }

    _loadSettings() {
        const settings = store.globalSettings;

        // Load all settings into inputs
        Object.entries(this.inputs).forEach(([key, input]) => {
            if (input && settings[key] !== undefined) {
                input.value = settings[key];
            }
        });

        // Update display elements
        if (this.displays.rippleSpeed && settings.rippleSpeed !== undefined) {
            this.displays.rippleSpeed.textContent = formatSettingValue('rippleSpeed', settings.rippleSpeed);
        }
        if (this.displays.decayPerTick && settings.decayPerTick !== undefined) {
            this.displays.decayPerTick.textContent = formatSettingValue('decayPerTick', settings.decayPerTick);
        }

        // Load colors
        if (settings.colors) {
            this.colorPalette.setColors(settings.colors);
        }

        // Load effect name
        if (this.effectNameInput && store.currentEffect) {
            this.effectNameInput.value = store.currentEffect.name || '';
        }
    }
}

let globalSettingsManager = null;

export function initGlobalSettingsManager() {
    globalSettingsManager = new GlobalSettingsManager();
    return globalSettingsManager;
}

export function getGlobalSettingsManager() {
    return globalSettingsManager;
}

export function openGlobalSettingsModal() {
    if (globalSettingsManager) {
        globalSettingsManager.open();
    }
}

export function closeGlobalSettingsModal() {
    if (globalSettingsManager) {
        globalSettingsManager.close();
    }
}

// Legacy exports for backward compatibility
export function getGlobalSettings() {
    return store.globalSettings;
}

export function loadGlobalSettings() {
    if (globalSettingsManager) {
        globalSettingsManager._loadSettings();
    }
}

export function resetGlobalSettings() {
    store.resetToDefaults();
}

export default {
    initGlobalSettingsManager,
    getGlobalSettingsManager,
    openGlobalSettingsModal,
    closeGlobalSettingsModal,
    getGlobalSettings,
    loadGlobalSettings,
    resetGlobalSettings
};
