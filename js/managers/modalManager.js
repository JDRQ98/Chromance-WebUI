// File: /js/managers/modalManager.js
// Refactored modal manager using event bus and centralized state

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';
import ColorPaletteManager from '../components/colorPaletteManager.js';
import { getModalInputId, formatSettingValue, hasDisplayElement, getDisplayId, modalSettings } from '../utils/settingsUtils.js';

class ModalManager {
    constructor() {
        this.modalElement = document.getElementById('modal');
        this.overlayElement = document.getElementById('overlay');
        this.selectedNodesDisplay = document.getElementById('selectedNodesDisplay');
        this.activateCheckbox = document.getElementById('activateNodeCheckbox');
        this.modalSettings = document.querySelector('.modal-settings');
        this.editNodeButton = this.modalElement.querySelector('#editNodeButton');

        this.snapshot = null;
        this.selectedNodeIds = [];

        this._cacheInputs();
        this._setupColorPalette();
        this._bindEvents();
        this._subscribeToEvents();
    }

    _cacheInputs() {
        this.inputs = {};
        ['desiredBehavior', 'rippleDirection', 'rippleDelay', 'rippleLifeSpan',
         'rippleSpeed', 'decayPerTick', 'hueDeltaTick'].forEach(setting => {
            const id = getModalInputId(setting);
            this.inputs[setting] = document.getElementById(id);
        });

        // Display elements for range inputs
        this.displays = {
            rippleSpeed: document.getElementById('modalRippleSpeedDisplay'),
            decayPerTick: document.getElementById('modalDecayPerTickDisplay')
        };
    }

    _setupColorPalette() {
        this.colorPalette = new ColorPaletteManager({
            container: document.getElementById('modalColorContainer'),
            addButton: document.getElementById('addModalColorButton'),
            removeButton: document.getElementById('removeModalColorButton'),
            rainbowButton: document.getElementById('modalRainbowButton'),
            randomButton: document.getElementById('modalRandomButton'),
            similarButton: document.getElementById('modalSimilarButton'),
            maxColors: 25,
            minColors: 1,
            disabled: true
        });
    }

    _bindEvents() {
        // Activate checkbox
        this.activateCheckbox.addEventListener('change', () => this._handleActivateChange());

        // Slider click helper
        const slider = this.modalElement.querySelector('.slider');
        if (slider) {
            slider.addEventListener('click', () => this.activateCheckbox.click());
        }

        // Edit node button
        this.editNodeButton.addEventListener('click', () => {
            this.modalSettings.classList.toggle('show');
        });

        // Overlay click to close
        this.overlayElement.addEventListener('click', (e) => {
            if (e.target === this.overlayElement) {
                this.discard();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.discard();
            }
        });

        // Save/Discard buttons
        document.getElementById('saveNodeButton').addEventListener('click', () => this.save());
        document.getElementById('discardNodeButton').addEventListener('click', () => this.discard());

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

        // Edit checkboxes
        this._bindEditCheckboxes();
    }

    _bindEditCheckboxes() {
        const editCheckboxes = this.modalElement.querySelectorAll('.edit-button-checkbox');
        editCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const setting = checkbox.dataset.setting;
                if (setting === 'startingColor') {
                    this.colorPalette.setDisabled(!checkbox.checked);
                } else {
                    const input = this.inputs[setting];
                    if (input) {
                        input.disabled = !checkbox.checked;
                    }
                }
            });
        });
    }

    _subscribeToEvents() {
        eventBus.subscribe(Events.NODES_SELECTED, ({ nodeIds }) => {
            this.selectedNodeIds = nodeIds;
            if (nodeIds.length > 0) {
                this._updateDisplay();
                this.open();
            } else {
                this.close();
            }
        });

        eventBus.subscribe(Events.NODES_DESELECTED, ({ nodeIds }) => {
            this.selectedNodeIds = nodeIds;
            if (nodeIds.length === 0) {
                this.close();
            } else {
                this._updateDisplay();
            }
        });
    }

    isOpen() {
        return this.modalElement.classList.contains('show');
    }

    open() {
        if (!this.isOpen()) {
            this.snapshot = store.createSnapshot();
            this.modalElement.classList.add('show');
            this.overlayElement.classList.add('show');
            eventBus.publish(Events.MODAL_OPEN, {});
        }
    }

    close() {
        this.modalElement.classList.remove('show');
        this.overlayElement.classList.remove('show');
        this.modalSettings.classList.remove('show');
        store.clearSelectedNodes();
        eventBus.publish(Events.MODAL_CLOSE, {});
    }

    save() {
        const activeNodes = store.activeNodes;
        let newActiveNodes = [...activeNodes];

        this.selectedNodeIds.forEach(nodeId => {
            const id = Number(nodeId);
            if (this.activateCheckbox.checked) {
                if (!newActiveNodes.includes(id)) {
                    newActiveNodes.push(id);
                }
            } else {
                newActiveNodes = newActiveNodes.filter(n => n !== id);
            }

            // Save node-specific settings
            this._saveNodeSettings(nodeId);
        });

        store.setActiveNodes(newActiveNodes);
        this.close();
    }

    discard() {
        if (this.snapshot) {
            store.restoreSnapshot(this.snapshot);
            this.snapshot = null;
        }
        this.close();
    }

    _saveNodeSettings(nodeId) {
        const editCheckboxes = this.modalElement.querySelectorAll('.edit-button-checkbox');
        const settings = {};
        let hasSettings = false;

        editCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const setting = checkbox.dataset.setting;
                if (setting === 'startingColor') {
                    settings[setting] = this.colorPalette.getColors();
                } else if (this.inputs[setting]) {
                    settings[setting] = this.inputs[setting].value;
                }
                hasSettings = true;
            }
        });

        if (hasSettings) {
            store.setNodeSpecificSettings(nodeId, settings);
        } else {
            store.setNodeSpecificSettings(nodeId, null);
        }
    }

    _updateDisplay() {
        // Update selected nodes display
        if (this.selectedNodeIds.length > 0) {
            this.selectedNodesDisplay.textContent = 'Selected Nodes: ' + this.selectedNodeIds.join(', ');
        } else {
            this.selectedNodesDisplay.textContent = 'No nodes selected';
            return;
        }

        const activeNodes = store.activeNodes;

        // Update activate checkbox state
        if (this.selectedNodeIds.length === 1) {
            const id = Number(this.selectedNodeIds[0]);
            this.activateCheckbox.checked = activeNodes.includes(id);
            this.activateCheckbox.indeterminate = false;
            this._loadNodeSettings(this.selectedNodeIds[0]);
            this.modalSettings.classList.remove('show');
        } else {
            const allActive = this.selectedNodeIds.every(id => activeNodes.includes(Number(id)));
            const noneActive = this.selectedNodeIds.every(id => !activeNodes.includes(Number(id)));

            if (allActive) {
                this.activateCheckbox.checked = true;
                this.activateCheckbox.indeterminate = false;
            } else if (noneActive) {
                this.activateCheckbox.checked = false;
                this.activateCheckbox.indeterminate = false;
            } else {
                this.activateCheckbox.checked = false;
                this.activateCheckbox.indeterminate = true;
            }

            this._loadNodeSettings(this.selectedNodeIds[0]);
            this._disableAllInputs();
        }
    }

    _loadNodeSettings(nodeId) {
        const nodeSettings = store.nodeSpecificSettings[nodeId] || {};
        const globalSettings = store.globalSettings;

        // Load values for each setting
        const settingsToLoad = {
            desiredBehavior: nodeSettings.desiredBehavior ?? globalSettings.desiredBehavior,
            rippleDirection: nodeSettings.rippleDirection ?? globalSettings.rippleDirection,
            rippleDelay: nodeSettings.rippleDelay ?? globalSettings.rippleDelay,
            rippleLifeSpan: nodeSettings.rippleLifeSpan ?? globalSettings.rippleLifeSpan,
            rippleSpeed: nodeSettings.rippleSpeed ?? globalSettings.rippleSpeed,
            decayPerTick: nodeSettings.decayPerTick ?? globalSettings.decayPerTick,
            hueDeltaTick: nodeSettings.hueDeltaTick ?? globalSettings.hueDeltaTick
        };

        Object.entries(settingsToLoad).forEach(([setting, value]) => {
            if (this.inputs[setting]) {
                this.inputs[setting].value = value;
                this.inputs[setting].disabled = true;
            }
            if (this.displays[setting]) {
                this.displays[setting].textContent = formatSettingValue(setting, value);
            }
        });

        // Load colors
        const colors = nodeSettings.startingColor || globalSettings.colors;
        this.colorPalette.setColors(Array.isArray(colors) ? colors : [colors]);
        this.colorPalette.disable();

        // Update edit checkboxes
        this._updateEditCheckboxes(nodeId);
    }

    _updateEditCheckboxes(nodeId) {
        const nodeSettings = store.nodeSpecificSettings[nodeId] || {};
        const editCheckboxes = this.modalElement.querySelectorAll('.edit-button-checkbox');

        editCheckboxes.forEach(checkbox => {
            const setting = checkbox.dataset.setting;
            const hasNodeSetting = nodeSettings.hasOwnProperty(setting);

            if (this.selectedNodeIds.length === 1) {
                checkbox.checked = hasNodeSetting;
                checkbox.indeterminate = false;

                if (hasNodeSetting) {
                    if (setting === 'startingColor') {
                        this.colorPalette.enable();
                    } else if (this.inputs[setting]) {
                        this.inputs[setting].disabled = false;
                    }
                }
            } else {
                // Multiple nodes - check consistency
                const allHave = this.selectedNodeIds.every(id => {
                    const ns = store.nodeSpecificSettings[id];
                    return ns && ns.hasOwnProperty(setting);
                });
                const noneHave = this.selectedNodeIds.every(id => {
                    const ns = store.nodeSpecificSettings[id];
                    return !ns || !ns.hasOwnProperty(setting);
                });

                if (allHave || noneHave) {
                    checkbox.checked = allHave;
                    checkbox.indeterminate = false;
                } else {
                    checkbox.checked = false;
                    checkbox.indeterminate = true;
                }
            }
        });
    }

    _disableAllInputs() {
        Object.values(this.inputs).forEach(input => {
            if (input) input.disabled = true;
        });

        const editCheckboxes = this.modalElement.querySelectorAll('.edit-button-checkbox');
        editCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        this.colorPalette.disable();
    }

    _handleActivateChange() {
        // Handle any visual updates when checkbox changes
    }
}

let modalManager = null;

export function initModalManager() {
    modalManager = new ModalManager();
    return modalManager;
}

export function getModalManager() {
    return modalManager;
}

export default { initModalManager, getModalManager };
