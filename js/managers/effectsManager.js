// File: /js/managers/effectsManager.js
// Refactored effects manager using event bus and centralized state

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';

class EffectsManager {
    constructor() {
        this.effectDropdown = document.getElementById('effectDropdown');
        this.titleElement = document.getElementById('effectTitle');

        this._populateDropdown();
        this._updateTitle();
        this._bindEvents();
        this._subscribeToEvents();
    }

    _populateDropdown() {
        this.effectDropdown.innerHTML = '';

        const effects = store.effects;
        const sortedKeys = Object.keys(effects).sort((a, b) => parseInt(a) - parseInt(b));

        sortedKeys.forEach(effectId => {
            const option = document.createElement('option');
            option.value = effectId;
            option.text = effects[effectId].name || `Effect ${effectId}`;
            this.effectDropdown.add(option);
        });

        if (sortedKeys.length === 0) {
            const option = document.createElement('option');
            option.value = 1;
            option.text = 'Default';
            this.effectDropdown.add(option);
        }

        this.effectDropdown.value = store.currentEffectId;
    }

    _updateTitle() {
        const effect = store.currentEffect;
        const effectName = effect?.name || 'Default';
        this.titleElement.textContent = `Effect editor: ${effectName}`;
    }

    _bindEvents() {
        // Effect dropdown change
        this.effectDropdown.addEventListener('change', () => {
            const effectId = parseInt(this.effectDropdown.value, 10);
            store.setCurrentEffect(effectId);
        });

        // Add effect button
        document.getElementById('addEffectButton')?.addEventListener('click', () => {
            this._openEffectNameModal();
        });

        // Edit effect button
        document.getElementById('editEffectButton')?.addEventListener('click', () => {
            eventBus.publish('globalSettings:openModal', {});
        });

        // Delete effect button
        document.getElementById('deleteEffectButton')?.addEventListener('click', () => {
            this._deleteCurrentEffect();
        });
    }

    _subscribeToEvents() {
        eventBus.subscribe(Events.EFFECT_LOADED, ({ effectId }) => {
            this.effectDropdown.value = effectId;
            this._updateTitle();
        });

        eventBus.subscribe(Events.EFFECT_SAVED, () => {
            this._populateDropdown();
            this._updateTitle();
        });

        eventBus.subscribe(Events.EFFECT_DELETED, () => {
            this._populateDropdown();
            this._updateTitle();
        });
    }

    _openEffectNameModal(existingEffectId = null) {
        const modal = document.createElement('div');
        modal.classList.add('modal', 'effect-name-modal');

        const existingName = existingEffectId ? store.effects[existingEffectId]?.name : '';
        const title = existingEffectId ? 'Edit Effect Name' : 'New Effect Name';
        const placeholder = existingName || `Effect ${Object.keys(store.effects).length + 1}`;

        modal.innerHTML = `
            <h2>${title}</h2>
            <input type="text" id="newEffectNameInput" placeholder="Enter effect name" value="${existingName}">
            <div class="modal-buttons">
                <button id="saveEffectNameButton">Save</button>
                <button id="cancelEffectNameButton">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('overlay').classList.add('show');

        const input = document.getElementById('newEffectNameInput');
        input.focus();
        input.select();

        // Disable main buttons
        this._setButtonsDisabled(true);

        const closeModal = () => {
            modal.remove();
            document.getElementById('overlay').classList.remove('show');
            this._setButtonsDisabled(false);
        };

        document.getElementById('saveEffectNameButton').addEventListener('click', () => {
            const name = input.value.trim();
            if (name) {
                if (existingEffectId) {
                    store.updateEffectName(existingEffectId, name);
                } else {
                    const newId = store.createEffect(name);
                    store.setCurrentEffect(newId);
                }
                closeModal();
            }
        });

        document.getElementById('cancelEffectNameButton').addEventListener('click', closeModal);

        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeModal();
            if (event.key === 'Enter') document.getElementById('saveEffectNameButton').click();
        });
    }

    _deleteCurrentEffect() {
        const currentId = store.currentEffectId;
        store.deleteEffect(currentId);
    }

    _setButtonsDisabled(disabled) {
        ['addEffectButton', 'editEffectButton', 'deleteEffectButton'].forEach(id => {
            const button = document.getElementById(id);
            if (button) button.disabled = disabled;
        });
    }
}

let effectsManager = null;

export function initEffectsManager() {
    effectsManager = new EffectsManager();
    return effectsManager;
}

export function getEffectsManager() {
    return effectsManager;
}

// Legacy exports for backward compatibility
export function updateCurrentEffect() {
    // State is now automatically persisted via stateStore
}

export function getCurrentEffectId() {
    return store.currentEffectId;
}

export function getEffects() {
    return store.effects;
}

export default { initEffectsManager, getEffectsManager, updateCurrentEffect, getCurrentEffectId, getEffects };
