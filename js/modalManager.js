// File: /js/modalManager.js
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { getActiveNodes } from './nodeManager.js';

class Modal {
    constructor(modalElement, overlayElement, selectedNodesDisplay, modalSettings, profileSettings) {
        this.modalElement = modalElement;
        this.overlayElement = overlayElement;
        this.selectedNodesDisplay = selectedNodesDisplay;
        this.modalSettings = modalSettings
        this.editNodeButton = document.getElementById('editNodeButton'); // Get from document since it's now in the main container
        this.profileSettings = profileSettings;
        this.modalInputs = {};
        this.cacheModalInputs();
        this.activeNodes = [];
        this.selectedNodes = [];
        this.initialSettings = {
            activeNodes: [],
            profileSettings: {}
        };
        window.modal = this;
        console.log('Modal constructor called') // ADDED LOG
        // Add listener for closing the modal with overlay
        this.overlayElement.addEventListener('click', (event) => {
            if (event.target === this.overlayElement) {
                this.closeModal(setActiveNodes, updateNodeStyles, updateCurrentEffect);
            }
        });
    }
    cacheModalInputs() {
        this.modalInputs = {
            modalDesiredBehavior: this.modalElement.querySelector('#modalDesiredBehavior'),
            modalRippleDirection: this.modalElement.querySelector('#modalRippleDirection'),
            modalRippleDelay: this.modalElement.querySelector('#modalRippleDelay'),
            modalRippleLifeSpan: this.modalElement.querySelector('#modalRippleLifeSpan'),
            modalRippleSpeed: this.modalElement.querySelector('#modalRippleSpeed'),
            modalRippleSpeedDisplay: this.modalElement.querySelector('#modalRippleSpeedDisplay'),
            modalDecayPerTick: this.modalElement.querySelector('#modalDecayPerTick'),
            modalDecayPerTickDisplay: this.modalElement.querySelector('#modalDecayPerTickDisplay'),
            modalHueDeltaTick: this.modalElement.querySelector('#modalHueDeltaTick'),
        };
        // Add input listeners to the range elements to update the span elements
        this.modalInputs.modalRippleSpeed.addEventListener('input', () => {
            this.modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(this.modalInputs.modalRippleSpeed.value).toFixed(2);
        });
        this.modalInputs.modalDecayPerTick.addEventListener('input', () => {
            this.modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(this.modalInputs.modalDecayPerTick.value).toFixed(3);
        });
        // Add click event listener to the edit node button with toggle functionality
        if (this.editNodeButton) {
            this.editNodeButton.addEventListener('click', () => {
                if (this.modalElement.classList.contains('show')) {
                    this.closeModal();
                } else {
                    this.openModal();
                }
            });
        }
    }
    openModal() {
        this.takeSnapshot();
        this.loadNodeSettings();
        this.modalElement.classList.add('show');
        this.overlayElement.classList.add('show');
    }
    closeModal(setActiveNodes, updateNodeStyles) {
        this.modalElement.classList.remove('show');
        this.overlayElement.classList.remove('show');
        if (window.nodeManager) {
            window.nodeManager.deselectAllNodes();//Call node manager's method to deselect all
        }
        this.selectedNodes = []; // Clear selected nodes array
        if (setActiveNodes && updateNodeStyles) {
            setActiveNodes(getActiveNodes());
            updateNodeStyles(this.profileSettings);
        }
    }
    updateModalDisplay(selectedNodes, activeNodes) {
        console.log('Modal updateModalDisplay called with:', selectedNodes, activeNodes); // ADDED LOG
        this.activeNodes = activeNodes;
        this.selectedNodes = selectedNodes;
        
        // Load current profile settings (modal-settings is always visible now)
        this.loadNodeSettings();
    }
    // Function to load node specific settings into the modal
    takeSnapshot() {
        this.initialSettings.activeNodes = [...this.activeNodes]; // Take a snapshot of active nodes
        this.initialSettings.profileSettings = JSON.parse(JSON.stringify(this.profileSettings)); // Deep clone profile settings
        console.log('Taking a snapshot with these settings', this.initialSettings)
    }
    // Function to load profile settings into the modal
    loadNodeSettings() {

        // Set values from profile settings
        let desiredBehaviorValue = this.profileSettings.Behavior ?? 0;
        let rippleDirectionValue = this.profileSettings.Direction ?? -1;
        let rippleDelayValue = this.profileSettings.DelayBetweenRipples_ms ?? 1000;
        let rippleLifeSpanValue = this.profileSettings.RippleLifeSpan ?? 3000;
        let rippleSpeedValue = this.profileSettings.RippleSpeed ?? 1.0;
        let decayPerTickValue = this.profileSettings.Decay ?? 0.985;
        let hueDeltaTickValue = this.profileSettings.RainbowDeltaPerTick ?? 100;
        // Load colors into swatches
        const colorContainer = this.modalElement.querySelector('#modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        let colorsValue = this.profileSettings.Colors || ['#FF0000'];
        if (typeof colorsValue === 'string') {
            colorsValue = [colorsValue];
        }
        if (!colorsValue || colorsValue.length === 0) {
            colorsValue = ['#FF0000'];
        }
        
        console.log('Loading colors:', colorsValue); // Debug log
        
        colorsValue.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            colorInput.disabled = false; // Always enabled now
            colorContainer.appendChild(colorInput);
        });
        // All inputs are now always enabled - no checkbox logic needed
        this.setModalInputValue('desiredBehavior', desiredBehaviorValue)
        this.setModalInputValue('rippleDirection', rippleDirectionValue)
        this.setModalInputValue('rippleDelay', rippleDelayValue)
        this.setModalInputValue('rippleLifeSpan', rippleLifeSpanValue)
        this.setModalInputValue('rippleSpeed', rippleSpeedValue)
        this.setModalInputValue('decayPerTick', decayPerTickValue)
        this.setModalInputValue('hueDeltaTick', hueDeltaTickValue)
        // All color buttons and inputs are now always enabled
        const colorButtons = this.modalElement.querySelectorAll('.color-button-container button');
        colorButtons.forEach(button => {
            button.disabled = false;
        });
        
        const colorInputs = this.modalElement.querySelectorAll('#modalColorContainer input');
        colorInputs.forEach(input => {
            input.disabled = false;
        });
    }
    //Helper function to set values in modal input elements
    setModalInputValue(setting, value) {
        if (this.modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`]) {
            const inputElement = this.modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
            inputElement.value = value;
            // Update display if range
            if (setting === 'rippleSpeed') {
                this.modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(value).toFixed(2);
            }
            if (setting === 'decayPerTick') {
                this.modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(value).toFixed(3);
            }
        }
    }
    //Helper function to get values from modal input elements
    getModalInputValue(setting) {
        return this.modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`]?.value;
    }
    // Helper function to enable modal input elements (now always enabled)
    enableModalInput(setting) {
        const inputElement = this.modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
        if (inputElement) {
            inputElement.disabled = false;
            if (setting === 'rippleSpeed') {
                this.modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(this.getModalInputValue(setting)).toFixed(2);
            }
            if (setting === 'decayPerTick') {
                this.modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(this.getModalInputValue(setting)).toFixed(3);
            }
        }
    }
    
    // Helper function to disable modal input elements (no longer needed)
    disableModalInput(setting) {
        // No longer needed - all inputs are always enabled
    }
    
    // Helper function to disable all modal input elements (no longer needed)
    disableModalInputs() {
        // No longer needed - all inputs are always enabled
    }
    // Function to save profile settings
    saveNodeSettings(setActiveNodes, updateNodeStyles) {
        // Update all settings from modal inputs
        this.profileSettings.Colors = Array.from(this.modalElement.querySelectorAll('#modalColorContainer input')).map(input => input.value);
        this.profileSettings.NumberOfColors = this.profileSettings.Colors.length;
        this.profileSettings.Behavior = parseInt(this.getModalInputValue('desiredBehavior') ?? 0);
        this.profileSettings.Direction = parseInt(this.getModalInputValue('rippleDirection') ?? -1);
        this.profileSettings.DelayBetweenRipples_ms = parseInt(this.getModalInputValue('rippleDelay') ?? 1000);
        this.profileSettings.RippleLifeSpan = parseInt(this.getModalInputValue('rippleLifeSpan') ?? 3000);
        this.profileSettings.RippleSpeed = parseFloat(this.getModalInputValue('rippleSpeed') ?? 1.0);
        this.profileSettings.Decay = parseFloat(this.getModalInputValue('decayPerTick') ?? 0.985);
        this.profileSettings.RainbowDeltaPerTick = parseInt(this.getModalInputValue('hueDeltaTick') ?? 100);

        // Update active nodes from current state
        setActiveNodes(this.activeNodes);
        updateNodeStyles(this.profileSettings);
        window.nodeManager.deselectAllNodes();
    }
    // Function to discard node settings
    discardNodeSettings(setActiveNodes, updateNodeStyles) {
        console.log('Restoring settings to:', this.initialSettings)
        setActiveNodes(this.initialSettings.activeNodes);
        this.profileSettings = JSON.parse(JSON.stringify(this.initialSettings.profileSettings));
        updateNodeStyles(this.profileSettings);
        window.nodeManager.deselectAllNodes();
    }
}


let modal;

// Helper: read current modal inputs into profileSettings and sync to ESP32
function readModalAndSync(modal) {
    const ps = modal.profileSettings;
    ps.Colors = Array.from(modal.modalElement.querySelectorAll('#modalColorContainer input')).map(input => input.value);
    ps.NumberOfColors = ps.Colors.length;
    ps.Behavior = parseInt(modal.getModalInputValue('desiredBehavior') ?? 0);
    ps.Direction = parseInt(modal.getModalInputValue('rippleDirection') ?? -1);
    ps.DelayBetweenRipples_ms = parseInt(modal.getModalInputValue('rippleDelay') ?? 1000);
    ps.RippleLifeSpan = parseInt(modal.getModalInputValue('rippleLifeSpan') ?? 3000);
    ps.RippleSpeed = parseFloat(modal.getModalInputValue('rippleSpeed') ?? 1.0);
    ps.Decay = parseFloat(modal.getModalInputValue('decayPerTick') ?? 0.985);
    ps.RainbowDeltaPerTick = parseInt(modal.getModalInputValue('hueDeltaTick') ?? 100);
    if (window.mainJS && window.mainJS.syncToMicrocontroller) {
        window.mainJS.syncToMicrocontroller();
    }
}

function initModalManager(profileSettings, updateNodeStyles, updateModal, setActiveNodes, getActiveNodes) {
    const modalElement = document.getElementById('modal');
    const overlayElement = document.getElementById('overlay');
    const selectedNodesDisplay = document.getElementById('selectedNodesDisplay');
    const modalSettings = document.querySelector('.modal-settings');

    modal = new Modal(modalElement, overlayElement, selectedNodesDisplay, modalSettings, profileSettings);

    // Live sync: attach change listeners to all modal inputs
    Object.values(modal.modalInputs).forEach(input => {
        if (input && input.tagName) {
            input.addEventListener('change', () => readModalAndSync(modal));
        }
    });

    // Live sync: delegate change events on color container for dynamically added color inputs
    const modalColorContainer = document.getElementById('modalColorContainer');
    modalColorContainer.addEventListener('change', () => readModalAndSync(modal));

    // Add listener for closing the modal with ESC key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            modal.closeModal(setActiveNodes, updateNodeStyles);
        }
    });
    const saveNodeButton = document.getElementById('saveNodeButton');
    const discardNodeButton = document.getElementById('discardNodeButton');
    saveNodeButton.addEventListener('click', function () {
        modal.saveNodeSettings(setActiveNodes, updateNodeStyles);
        modal.closeModal(setActiveNodes, updateNodeStyles);
    });
    discardNodeButton.addEventListener('click', function () {
        modal.discardNodeSettings(setActiveNodes, updateNodeStyles);
        modal.closeModal(setActiveNodes, updateNodeStyles);
    });
    // Add logic for adding more modal colors
    const addModalColorButton = document.getElementById('addModalColorButton');
    addModalColorButton.addEventListener('click', () => {
        if (modalColorContainer.children.length < 25) {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = '#ffffff'; // Default color
            colorInput.classList.add('color-swatch');
            colorInput.disabled = false; // Always enabled
            modalColorContainer.appendChild(colorInput);
            readModalAndSync(modal);
        }
    });
    // Add logic for removing modal colors
    const removeModalColorButton = document.getElementById('removeModalColorButton');
    removeModalColorButton.addEventListener('click', () => {
        if (modalColorContainer.children.length > 1) {
            modalColorContainer.removeChild(modalColorContainer.lastChild);
            readModalAndSync(modal);
        }
    });
    // Add logic for rainbow modal colors button
    const modalRainbowButton = document.getElementById('modalRainbowButton');
    modalRainbowButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const rainbowColors = generateRainbowColors(colorCount);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        rainbowColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            colorInput.disabled = false; // Always enabled
            colorContainer.appendChild(colorInput);
        });
        readModalAndSync(modal);
    });
    // Add logic for random modal colors button
    const modalRandomButton = document.getElementById('modalRandomButton');
    modalRandomButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const randomColors = generateRandomColors(colorCount);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        randomColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            colorInput.disabled = false; // Always enabled
            colorContainer.appendChild(colorInput);
        });
        readModalAndSync(modal);
    });
    // Add logic for similar modal colors button
    const modalSimilarButton = document.getElementById('modalSimilarButton');
    modalSimilarButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const firstColor = document.querySelector('#modalColorContainer input')?.value;
        const similarColors = generateSimilarColors(colorCount, firstColor);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        similarColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            colorInput.disabled = false; // Always enabled
            colorContainer.appendChild(colorInput);
        });
        readModalAndSync(modal);
    });
}

function updateModal(selectedNodes, activeNodes, profileSettings, updateNodeStyles) {
    if (modal) {
        modal.profileSettings = profileSettings;
        modal.updateModalDisplay(selectedNodes, activeNodes);
    }
}
export { initModalManager, updateModal };