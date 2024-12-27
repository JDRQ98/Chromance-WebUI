// File: /js/effectsManager.js
// effectsManager.js
import { activeNodes as importedActiveNodes } from './nodeManager.js';
import { selectedNodes as importedSelectedNodes } from './nodeManager.js';
let currentEffectId = 1; // Variable to track the current effect ID
let effects = {}; // Variable to store saved effects
let nextEffectId = 1;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings) {
    const effectDropdown = document.getElementById('effectDropdown');
    const selectedEffectId = effectDropdown.value;

    if (effects[selectedEffectId]) {
        currentEffectId = selectedEffectId;
        // Deep clone the settings to avoid modifying the original objects
        Object.assign(globalSettings, deepClone(effects[selectedEffectId].globalSettings));
        Object.assign(nodeSpecificSettings, deepClone(effects[selectedEffectId].nodeSpecificSettings));
        //Load active nodes
        if (effects[selectedEffectId].activeNodes) {
            importedActiveNodes.length = 0;
            effects[selectedEffectId].activeNodes.forEach(nodeId => importedActiveNodes.push(nodeId));
        } else {
            importedActiveNodes.length = 0;
        }
    } else {
        resetAllSettings(globalSettings, nodeSpecificSettings);
        importedActiveNodes.length = 0;
    }
    loadGlobalSettings(globalSettings);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    // Pass an empty array for selectedNodes during initial load
    updateModal([], importedActiveNodes, nodeSpecificSettings, globalSettings, updateNodeStyles);
}
function updateCurrentEffect(globalSettings, nodeSpecificSettings, activeNodes) {
    effects[currentEffectId] = {
        name: document.getElementById('effectDropdown').options[document.getElementById('effectDropdown').selectedIndex].text,
        globalSettings: deepClone(globalSettings), // Deep clone the settings
        nodeSpecificSettings: deepClone(nodeSpecificSettings),
        activeNodes: deepClone(activeNodes),// Deep clone the active nodes
    };
    localStorage.setItem('effects', JSON.stringify(effects));
}
function updateEffectTitle(titleElement) {
    const effectDropdown = document.getElementById('effectDropdown');
    const selectedOption = effectDropdown.options[effectDropdown.selectedIndex];
    const effectName = selectedOption ? selectedOption.text : 'Default';
    titleElement.textContent = `Effect editor: ${effectName}`;
}
function populateEffectDropdown() {
    const effectDropdown = document.getElementById('effectDropdown');
    const selectedEffectId = effectDropdown.value;
    effectDropdown.innerHTML = ''; // Clear existing options
    // Sort the keys of the object so that they appear in order on the dropdown
    const sortedKeys = Object.keys(effects).sort((a, b) => parseInt(a) - parseInt(b));
    sortedKeys.forEach(effectId => {
        const option = document.createElement('option');
        option.value = effectId;
        option.text = effects[effectId].name || `Effect ${effectId}`;
        effectDropdown.add(option);
    });
    // If no effects are present, add default value
    if (sortedKeys.length === 0) {
        const option = document.createElement('option');
        option.value = 1;
        option.text = `Default`;
        effectDropdown.add(option);
        currentEffectId = 1;
    }
    effectDropdown.value = currentEffectId;
}
function initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings) {
    // Load effects from localStorage
    const storedEffects = localStorage.getItem('effects');
    if (storedEffects) {
        effects = JSON.parse(storedEffects);
        // Determine next available effect ID
        if (Object.keys(effects).length > 0) {
            nextEffectId = Math.max(...Object.keys(effects).map(Number)) + 1;
        }
    } else {
        //Set default effect
        effects[1] = {
            name: 'Default',
            globalSettings: {
                effectBasis: 'ripple',
                effectDuration: 3000,
                desiredBehavior: 'normal',
                rippleDirection: 'allDirections',
                rippleDelay: 3000,
                rippleLifeSpan: 3000,
                rippleSpeed: 0.5,
                decayPerTick: 0.985,
                hueDeltaTick: 200,
                numberOfRipples: 1,
                colors: ["#FF0000"], // Default color
            },
            nodeSpecificSettings: {},
            activeNodes: [9]
        }
        localStorage.setItem('effects', JSON.stringify(effects));
        nextEffectId = 2; // Set the next effect ID to 2 if the default is set.
    }
    // Load settings for the current effect
    populateEffectDropdown();
    loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
    const titleElement = document.getElementById('effectTitle');
    updateEffectTitle(titleElement);
    // Update global settings when selecting an effect from the dropdown
    const effectDropdown = document.getElementById('effectDropdown');
    effectDropdown.addEventListener('change', function () {
        updateCurrentEffect(globalSettings, nodeSpecificSettings, importedActiveNodes);
        loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
        updateEffectTitle(titleElement);
    });

    // Add effect logic
    const addEffectButton = document.getElementById('addEffectButton');
    addEffectButton.addEventListener('click', () => {
        openEffectNameModal(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings, `Effect ${nextEffectId}`);
    });

    // Edit effect logic
    const editEffectButton = document.getElementById('editEffectButton');
    editEffectButton.addEventListener('click', () => {
        const selectedEffectId = document.getElementById('effectDropdown').value;
        const selectedOption = document.getElementById('effectDropdown').options[document.getElementById('effectDropdown').selectedIndex];
        const selectedEffectName = selectedOption.text;
        openEffectNameModal(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings, selectedEffectName, selectedEffectId);
    });
    // Delete effect logic
    const deleteEffectButton = document.getElementById('deleteEffectButton');
    deleteEffectButton.addEventListener('click', () => {
        const selectedEffectId = document.getElementById('effectDropdown').value;
        const effectDropdown = document.getElementById('effectDropdown');
        const selectedOption = effectDropdown.options[effectDropdown.selectedIndex];
        delete effects[selectedEffectId];
        localStorage.setItem('effects', JSON.stringify(effects));
        //Remove the selected option from the dropdown
        effectDropdown.remove(effectDropdown.selectedIndex);

        let remainingKeys = Object.keys(effects);
        //If there are no more effects, create a new default effect
        if (remainingKeys.length === 0) {
            effects[1] = {
                name: 'Default',
                globalSettings: {
                    effectBasis: 'ripple',
                    effectDuration: 3000,
                    desiredBehavior: 'normal',
                    rippleDirection: 'allDirections',
                    rippleDelay: 3000,
                    rippleLifeSpan: 3000,
                    rippleSpeed: 0.5,
                    decayPerTick: 0.985,
                    hueDeltaTick: 200,
                    numberOfRipples: 1,
                    colors: ["#FF0000"], // Default color
                },
                nodeSpecificSettings: {},
                activeNodes: [9]
            };
            localStorage.setItem('effects', JSON.stringify(effects));
            currentEffectId = 1;
            nextEffectId = 2;
            populateEffectDropdown();
        } else {
            // Select the first remaining option

            currentEffectId = remainingKeys[0];
            effectDropdown.value = currentEffectId;

        }

        loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
        updateEffectTitle(titleElement);
    });
}
// Function to open the modal to name or edit the effect
function openEffectNameModal(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings, initialName = '', effectId = null) {
    const modal = document.createElement('div');
    modal.classList.add('modal', 'effect-name-modal');
    modal.innerHTML = `
        <h2>${initialName ? 'Edit Effect Name' : 'New Effect Name'}</h2>
        <input type="text" id="effectNameInput" placeholder="Enter effect name" value="${initialName}">
        <div class="modal-buttons">
            <button id="saveEffectNameButton">Save</button>
            <button id="cancelEffectNameButton">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('overlay').classList.add('show');
    const effectNameInput = document.getElementById('effectNameInput');
    effectNameInput.focus(); // Focus on the input

    //Disable the buttons
    document.getElementById('addEffectButton').disabled = true;
    document.getElementById('editEffectButton').disabled = true;
    document.getElementById('deleteEffectButton').disabled = true;
    // Handle closing of the modal and saving the new effect
    document.getElementById('saveEffectNameButton').addEventListener('click', () => {
        const effectName = document.getElementById('effectNameInput').value;
        if (effectName.trim() !== '') {
            if (effectId) {
                const effectDropdown = document.getElementById('effectDropdown');
                const selectedOption = effectDropdown.options[effectDropdown.selectedIndex];
                selectedOption.text = effectName;
                effects[effectId].name = effectName; // Edit existing effect
                localStorage.setItem('effects', JSON.stringify(effects));
                loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
                const titleElement = document.getElementById('effectTitle');
                updateEffectTitle(titleElement);
                closeEffectNameModal(modal);

            } else { // New Effect
                effects[nextEffectId] = {
                    name: effectName,
                    globalSettings: {
                        effectBasis: 'ripple',
                        effectDuration: 3000,
                        desiredBehavior: 'normal',
                        rippleDirection: 'allDirections',
                        rippleDelay: 3000,
                        rippleLifeSpan: 3000,
                        rippleSpeed: 0.5,
                        decayPerTick: 0.985,
                        hueDeltaTick: 200,
                        numberOfRipples: 1,
                        colors: ["#FF0000"], // Default color
                    },
                    nodeSpecificSettings: {},
                    activeNodes: [9] //default active node
                };
                localStorage.setItem('effects', JSON.stringify(effects));
                currentEffectId = nextEffectId;
                nextEffectId++;
                populateEffectDropdown();
                const effectDropdown = document.getElementById('effectDropdown');
                effectDropdown.value = currentEffectId;

                loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
                const titleElement = document.getElementById('effectTitle');
                updateEffectTitle(titleElement);
                closeEffectNameModal(modal);
            }
        }
    });
    // Handle closing of the modal and discarding the new effect
    document.getElementById('cancelEffectNameButton').addEventListener('click', () => {
        closeEffectNameModal(modal);
    });
    // Handle closing of the modal with ESC key
    modal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeEffectNameModal(modal);
        }
        if (event.key === 'Enter') {
            document.getElementById('saveEffectNameButton').click();
        }
    });
    // Handle closing of the modal when clicking outside
    document.getElementById('overlay').addEventListener('click', (event) => {
        if (event.target === event.currentTarget) {
            closeEffectNameModal(modal);
        }
    });
}
function closeEffectNameModal(modal) {
    modal.remove();
    document.getElementById('overlay').classList.remove('show');
    //Enable the buttons
    document.getElementById('addEffectButton').disabled = false;
    document.getElementById('editEffectButton').disabled = false;
    document.getElementById('deleteEffectButton').disabled = false;
}

export { initEffectsManager, loadCurrentEffect, updateCurrentEffect, currentEffectId };