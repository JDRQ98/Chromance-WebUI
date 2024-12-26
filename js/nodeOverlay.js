let selectedNodes = [];  // Array to store selected nodes
let activeNodes = [9];  // Array to store active nodes; by default, node 9 is active.
let globalSettings = {}; // Object to store global settings
let nodeSpecificSettings = {}; // Object to store node-specific settings

// Border nodes (bi-nodes), quad nodes, and tri nodes
const borderNodes = [0, 3, 5, 13, 15, 18];
const triNodes = [4, 6, 7, 11, 12, 14];
const quadNodes = [1, 2, 8, 10, 16, 17];
let modalInputs = {};

function setupGlobalSettingsModal() {
    const editGlobalSettingsButton = document.getElementById('editGlobalSettingsButton');
    const globalSettingsModal = document.getElementById('globalSettingsModal');
    const openGlobalSettingsButton = document.getElementById('openGlobalSettingsButton');
    const overlay = document.getElementById('overlay');

    editGlobalSettingsButton.addEventListener('click', () => {
        openGlobalSettingsModal();
        loadGlobalSettings(); // Load global settings into modal
    });

    openGlobalSettingsButton.addEventListener('click', () => {
        openGlobalSettingsModal();
        loadGlobalSettings(); // Load global settings into modal
    });

    function openGlobalSettingsModal() {
        globalSettingsModal.classList.add('show');
        overlay.classList.add('show');
    }

    window.closeGlobalSettingsModal = function () {
        globalSettingsModal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function initGlobalSettings() {
    const rippleSpeedInput = document.getElementById('rippleSpeed');
    const rippleSpeedDisplay = document.getElementById('rippleSpeedDisplay');
    const decayPerTickInput = document.getElementById('decayPerTick');
    const decayPerTickDisplay = document.getElementById('decayPerTickDisplay');

    rippleSpeedInput.addEventListener('input', () => {
        rippleSpeedDisplay.textContent = parseFloat(rippleSpeedInput.value).toFixed(2);
    });

    decayPerTickInput.addEventListener('input', () => {
        decayPerTickDisplay.textContent = parseFloat(decayPerTickInput.value).toFixed(3);
    });

    setupGlobalSettingsModal();
    // Load settings to localStorage if they are not present
    if (localStorage.getItem('globalSettings') === null) {
        resetGlobalSettings();
    } else {
        globalSettings = JSON.parse(localStorage.getItem('globalSettings'))
    }

    const restoreDefaultsButton = document.getElementById('restoreDefaultsButton');
    restoreDefaultsButton.addEventListener('click', () => {
        resetAllSettings();
    });

    const fireRippleButton = document.getElementById('fireRippleButton');
    fireRippleButton.addEventListener('click', () => {
        console.log("Fire ripple button clicked");
        //Add the logic for firing the ripple, using all the properties from the interface
    });
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', () => {
        console.log("Submit button clicked");
        saveGlobalSettings();
        closeGlobalSettingsModal();
    });

    const discardButton = document.getElementById('discardButton');
    discardButton.addEventListener('click', () => {
        console.log("Discard button clicked");
        loadGlobalSettings();
        closeGlobalSettingsModal();
    });

    const deactivateAllNodesButton = document.getElementById('deactivateAllNodes');
    deactivateAllNodesButton.addEventListener('click', () => {
        deactivateAllNodes();
    });

    // Cache modal inputs
    cacheModalInputs();

    //Add listener to the modal close button
    const closeModalButton = document.getElementById('closeModalButton');
    closeModalButton.addEventListener('click', () => {
        closeModal();
    });

    // Add listener to the ESC key to close modal
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    // Add listener to the ESC key to close global modal
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && document.getElementById('globalSettingsModal').classList.contains('show')) {
            closeGlobalSettingsModal();
        }
    });
}

function deactivateAllNodes() {
    activeNodes = [];
    selectedNodes = [];
    updateNodeStyles();
    updateModal();
}

function resetAllSettings() {
    resetGlobalSettings();
    nodeSpecificSettings = {};
    selectedNodes = [];
    activeNodes = [9];
    updateModal();
    updateNodeStyles();
}

function resetGlobalSettings() {
    globalSettings = {
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
        colors: ["#FF0000"] // Default color
    };

    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
}

function saveGlobalSettings() {
    globalSettings = {
        effectBasis: document.getElementById('effectBasis').value,
        effectDuration: Number(document.getElementById('effectDuration').value),
        desiredBehavior: document.getElementById('desiredBehavior').value,
        rippleDirection: document.getElementById('rippleDirection').value,
        rippleDelay: Number(document.getElementById('rippleDelay').value),
        rippleLifeSpan: Number(document.getElementById('rippleLifeSpan').value),
        rippleSpeed: Number(document.getElementById('rippleSpeed').value),
        decayPerTick: Number(document.getElementById('decayPerTick').value),
        hueDeltaTick: Number(document.getElementById('hueDeltaTick').value),
        numberOfRipples: document.getElementById('numberOfRipples').value,
        colors: Array.from(document.querySelectorAll('#globalColorContainer input')).map(input => input.value),
    };
    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
    console.log("Global settings are", globalSettings);
}

function loadGlobalSettings() {
    const storedSettings = JSON.parse(localStorage.getItem('globalSettings'));

    if (storedSettings) {
        document.getElementById('effectBasis').value = storedSettings.effectBasis;
        document.getElementById('effectDuration').value = storedSettings.effectDuration;
        document.getElementById('desiredBehavior').value = storedSettings.desiredBehavior;
        document.getElementById('rippleDirection').value = storedSettings.rippleDirection;
        document.getElementById('rippleDelay').value = storedSettings.rippleDelay;
        document.getElementById('rippleLifeSpan').value = storedSettings.rippleLifeSpan;
        document.getElementById('rippleSpeed').value = storedSettings.rippleSpeed;
        document.getElementById('rippleSpeedDisplay').textContent = parseFloat(storedSettings.rippleSpeed).toFixed(2);
        document.getElementById('decayPerTick').value = storedSettings.decayPerTick;
        document.getElementById('decayPerTickDisplay').textContent = parseFloat(storedSettings.decayPerTick).toFixed(3);
        document.getElementById('hueDeltaTick').value = storedSettings.hueDeltaTick;
        document.getElementById('numberOfRipples').value = storedSettings.numberOfRipples;

        // Load colors into swatches
        const colorContainer = document.getElementById('globalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        storedSettings.colors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            colorContainer.appendChild(colorInput);
        });
    }
    console.log("Loaded global settings are", storedSettings);
}

// Function to update the styling of nodes based on their activation/selection status
function updateNodeStyles() {
    document.querySelectorAll('.hex').forEach(node => {
        const nodeId = Number(node.dataset.id); // Convert ID to number
        const hexWrap = node.closest('.hex-wrap'); // Get the parent wrapper
        hexWrap.classList.remove('regularNode', 'SelectedNode', 'ActiveNode', 'ActiveandSelectedNode');

        if (activeNodes.includes(nodeId) && selectedNodes.includes(node)) {
            hexWrap.classList.add('ActiveandSelectedNode');
        } else if (activeNodes.includes(nodeId)) {
            hexWrap.classList.add('ActiveNode');
        } else if (selectedNodes.includes(node)) {
            hexWrap.classList.add('SelectedNode');
        } else {
            hexWrap.classList.add('regularNode');
        }
    });
}

function updateModal(node) {
    const selectedIds = selectedNodes.map(node => node.dataset.id);
    const display = document.getElementById('selectedNodesDisplay');
    if (selectedIds.length > 0) {
        display.textContent = 'Selected Nodes: ' + selectedIds.join(', ');
    } else {
        display.textContent = 'No nodes selected';
    }

    // Get the modal
    const modal = document.getElementById('modal');
    const activateCheckbox = document.getElementById('activateNodeCheckbox');
    const modalSettings = document.querySelector('.modal-settings');
    if (selectedIds.length === 1) { // Only 1 node is selected
        const selectedNodeId = selectedIds[0];
        // Check if the selected node is contained within activeNodes
        if (activeNodes.includes(Number(selectedNodeId))) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.add('show');
        } else {
            activateCheckbox.checked = false;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.remove('show');
        }

        // Load settings from global or node-specific settings
        if (selectedNodes.length > 0) {
            loadNodeSettings(selectedNodes[0]);
        }

    } else if (selectedIds.length > 1) { // More than 1 node is selected
        // Check if all selected nodes are active
        const allActive = selectedIds.every(id => activeNodes.includes(Number(id)));
        if (allActive) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.add('show');
        } else {
            // Check if none are active
            const noneActive = selectedIds.every(id => !activeNodes.includes(Number(id)));
            if (noneActive) {
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = false;
                modalSettings.classList.remove('show');
            } else {
                // Some are active and some are not, set to indeterminate
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = true;
                modalSettings.classList.remove('show');
            }
        }
        // Load settings from global or node-specific settings
        if (selectedNodes.length > 0) {
            loadNodeSettings(selectedNodes[0]);
        }

        // Disable all settings if more than one node is selected
        disableModalInputs();
    } else {
        // If no nodes are selected, reset the checkbox
        activateCheckbox.checked = false;
        activateCheckbox.indeterminate = false;
        // Disable all settings if no node is selected
        disableModalInputs();
        modalSettings.classList.remove('show');

        // Close the modal if no nodes are selected
        closeModal();

    }

    if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
        openModal();  // Open the modal if there are selected nodes
    }
}

function loadNodeSettings(node) {
    const nodeId = node.dataset.id;
    const selectedIds = selectedNodes.map(node => node.dataset.id);

    // Set the inputs based on global settings or node specific settings
    let desiredBehaviorValue = nodeSpecificSettings[nodeId]?.desiredBehavior ?? globalSettings.desiredBehavior;
    let rippleDirectionValue = nodeSpecificSettings[nodeId]?.rippleDirection ?? globalSettings.rippleDirection;
    let rippleDelayValue = nodeSpecificSettings[nodeId]?.rippleDelay ?? globalSettings.rippleDelay;
    let rippleLifeSpanValue = nodeSpecificSettings[nodeId]?.rippleLifeSpan ?? globalSettings.rippleLifeSpan;
    let rippleSpeedValue = nodeSpecificSettings[nodeId]?.rippleSpeed ?? globalSettings.rippleSpeed;
    let decayPerTickValue = nodeSpecificSettings[nodeId]?.decayPerTick ?? globalSettings.decayPerTick;
    let hueDeltaTickValue = nodeSpecificSettings[nodeId]?.hueDeltaTick ?? globalSettings.hueDeltaTick;

    // Load colors into swatches
    const colorContainer = document.getElementById('modalColorContainer');
    colorContainer.innerHTML = ''; // Clear existing swatches
    let colorsValue = [];
    if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty('startingColor')) {
        colorsValue = nodeSpecificSettings[nodeId].startingColor
    } else {
        colorsValue = globalSettings.colors;
    }

    if (typeof colorsValue === 'string') {
        colorsValue = [colorsValue];
    }
    if (!colorsValue) {
        colorsValue = [];
    }

    colorsValue.forEach(color => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorContainer.appendChild(colorInput);
    });

    // Set edit button checkbox state based on if there is node specific property
    const modal = document.getElementById('modal');
    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    editCheckboxes.forEach(checkbox => {
        const setting = checkbox.dataset.setting;
        let allSame = true;
        if (selectedIds.length === 1) {
            if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                checkbox.checked = true;
                checkbox.indeterminate = false;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = false;
            }
        } else if (selectedIds.length > 1) {
            // Check if all selected nodes have the same setting
            allSame = selectedIds.every(id => {
                if (nodeSpecificSettings[id] && nodeSpecificSettings[id].hasOwnProperty(setting)) {
                    const isSame = nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]][setting] === nodeSpecificSettings[id][setting];
                    return isSame;
                } else {
                    const hasSetting = !(nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]].hasOwnProperty(setting));
                    return hasSetting;
                }
            });
            if (allSame) {
                checkbox.checked = selectedIds.every(id => {
                    if (nodeSpecificSettings[id] && nodeSpecificSettings[id].hasOwnProperty(setting)) {
                        return nodeSpecificSettings[selectedIds[0]][setting] === nodeSpecificSettings[id][setting];
                    } else {
                        return !(nodeSpecificSettings[id] && nodeSpecificSettings[id].hasOwnProperty(setting));
                    }
                })
                checkbox.indeterminate = false;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
                if (setting === 'desiredBehavior') {
                    desiredBehaviorValue = 'N/A';
                } else if (setting === 'rippleDirection') {
                    rippleDirectionValue = 'N/A';
                } else if (setting === 'rippleDelay') {
                    rippleDelayValue = 'N/A';
                } else if (setting === 'rippleLifeSpan') {
                    rippleLifeSpanValue = 'N/A';
                } else if (setting === 'rippleSpeed') {
                    rippleSpeedValue = 'N/A';
                } else if (setting === 'decayPerTick') {
                    decayPerTickValue = 'N/A';
                } else if (setting === 'hueDeltaTick') {
                    hueDeltaTickValue = 'N/A';
                }
            }
        }
    });
    setModalInputValue('desiredBehavior', desiredBehaviorValue)
    setModalInputValue('rippleDirection', rippleDirectionValue)
    setModalInputValue('rippleDelay', rippleDelayValue)
    setModalInputValue('rippleLifeSpan', rippleLifeSpanValue)
    setModalInputValue('rippleSpeed', rippleSpeedValue)
    setModalInputValue('decayPerTick', decayPerTickValue)
    setModalInputValue('hueDeltaTick', hueDeltaTickValue)

    //Add listener to the edit checkbox buttons
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const setting = this.dataset.setting;
            if (this.checked) {
                enableModalInput(setting, nodeId);
            } else {
                disableModalInput(setting, nodeId);
            }
        });
    });

    // Display the modal
    modal.classList.add('show')
    document.getElementById('overlay').classList.add('show');
}

function cacheModalInputs() {
    const modal = document.getElementById('modal');
    modalInputs = {
        modalDesiredBehavior: modal.querySelector('#modalDesiredBehavior'),
        modalRippleDirection: modal.querySelector('#modalRippleDirection'),
        modalRippleDelay: modal.querySelector('#modalRippleDelay'),
        modalRippleLifeSpan: modal.querySelector('#modalRippleLifeSpan'),
        modalRippleSpeed: modal.querySelector('#modalRippleSpeed'),
        modalRippleSpeedDisplay: modal.querySelector('#modalRippleSpeedDisplay'),
        modalDecayPerTick: modal.querySelector('#modalDecayPerTick'),
        modalDecayPerTickDisplay: modal.querySelector('#modalDecayPerTickDisplay'),
        modalHueDeltaTick: modal.querySelector('#modalHueDeltaTick'),
    };
}
function setModalInputValue(setting, value) {
    if (modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`]) {
        const inputElement = modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
        inputElement.value = value;
        // Update display if range
        if (setting === 'rippleSpeed') {
            modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(value).toFixed(2);
        }
        if (setting === 'decayPerTick') {
            modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(value).toFixed(3);
        }
    }
}
function getModalInputValue(setting) {
    return modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`]?.value;
}

function enableModalInput(setting, nodeId) {
    const inputElement = modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
    if (inputElement) {
        inputElement.disabled = false;
        // Update display if range
        if (setting === 'rippleSpeed') {
            modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(2);
        }
        if (setting === 'decayPerTick') {
            modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(3);
        }
    }
}

function disableModalInput(setting, nodeId) {
    const inputElement = modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
    if (inputElement) {
        inputElement.disabled = true;

        // remove the settings property from the node if it exists
        if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
            delete nodeSpecificSettings[nodeId][setting];
        }
    }
}

function disableModalInputs() {
    const modal = document.getElementById('modal');
    const inputs = modal.querySelectorAll('input:not(#activateNodeCheckbox):not(.edit-button-checkbox), select')
    inputs.forEach(input => {
        input.disabled = true;
    })

    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    editCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function saveNodeSettings(node) {
    const nodeId = node.dataset.id;
    const modal = document.getElementById('modal');
    const activateCheckbox = document.getElementById('activateNodeCheckbox');

    // Update activeNodes immediately
    if (activateCheckbox.checked) {
        // Add all selected nodes to activeNodes (ensure no duplicates)
        const nodeIdNumber = Number(nodeId); // Convert ID to number
        if (!activeNodes.includes(nodeIdNumber)) {
            activeNodes.push(nodeIdNumber); // Add only if not already present
        }
    } else {
        // Remove all selected nodes from activeNodes
        const nodeIdNumber = Number(nodeId); // Convert ID to number
        activeNodes = activeNodes.filter(activeNodeId => activeNodeId !== nodeIdNumber);
    }

    // Only save properties from the modal that are specific to the node
    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    let hasSettings = false;
    editCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const setting = checkbox.dataset.setting;
            // Create node specific object if doesn't exist
            if (!nodeSpecificSettings[nodeId]) {
                nodeSpecificSettings[nodeId] = {};
            }
            if (setting === 'startingColor') {
                nodeSpecificSettings[nodeId][setting] = Array.from(document.querySelectorAll('#modalColorContainer input')).map(input => input.value);
            } else {
                nodeSpecificSettings[nodeId][setting] = getModalInputValue(setting);
            }

            hasSettings = true;
        } else if (nodeSpecificSettings[nodeId]) {
            const setting = checkbox.dataset.setting;
            if (nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                delete nodeSpecificSettings[nodeId][setting]
            }
        }
    });

    // Remove empty object from nodeSpecificSettings if no properties were set
    if (!hasSettings && nodeSpecificSettings[nodeId]) {
        delete nodeSpecificSettings[nodeId];
    }

    // Update the styling of nodes based on their activation status
    updateNodeStyles();
}

function discardNodeSettings(node) {
    const nodeId = node.dataset.id;
    const modal = document.getElementById('modal');
    const activateCheckbox = document.getElementById('activateNodeCheckbox');
    // Update activeNodes immediately
    if (activateCheckbox.checked) {
        // Add all selected nodes to activeNodes (ensure no duplicates)
        const nodeIdNumber = Number(nodeId); // Convert ID to number
        if (!activeNodes.includes(nodeIdNumber)) {
            activeNodes.push(nodeIdNumber); // Add only if not already present
        }
    } else {
        // Remove all selected nodes from activeNodes
        const nodeIdNumber = Number(nodeId); // Convert ID to number
        activeNodes = activeNodes.filter(activeNodeId => activeNodeId !== nodeIdNumber);
    }

    // If there are node specific settings, load them, otherwise delete them to load defaults from global settings
    if (nodeSpecificSettings[nodeId]) {
        loadNodeSettings(node)
    } else {
        delete nodeSpecificSettings[nodeId];
        // Load settings from global or node-specific settings
        loadNodeSettings(node);
    }

    //  Update the styling of nodes based on their activation status
    updateNodeStyles();

}

// Function to open the modal window
function openModal() {
    document.getElementById('modal').classList.add('show');
    document.getElementById('overlay').classList.add('show');
}

// Function to close the modal window and deselect all nodes
function closeModal() {
    selectedNodes = [];  // Clear the selected nodes
    updateNodeStyles();
    document.getElementById('modal').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
}

// Function to handle node click and toggle selection
function handleNodeClick(node) {
    if (selectedNodes.includes(node)) {
        // If node is already selected, deselect it
        selectedNodes = selectedNodes.filter(n => n !== node);  // Remove from selected nodes
        updateNodeStyles();
    } else {
        // If node is not selected, select it
        selectedNodes.push(node);  // Add to selected nodes
        updateNodeStyles();
    }

    updateModal(node);  // Update modal to reflect selection
}

// Function to select all nodes in a given category
function selectNodes(nodes) {
    nodes.forEach(id => {
        const node = document.querySelector(`.hex[data-id="${id}"]`);
        handleNodeClick(node);
    });

    updateModal();  // Update modal with current selection

    if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
        openModal();  // Open the modal if nodes were selected
    }
}

// Event listeners for selecting node categories
document.getElementById('selectBiNodes').addEventListener('click', () => selectNodes(borderNodes));
document.getElementById('selectTriNodes').addEventListener('click', () => selectNodes(triNodes));
document.getElementById('selectQuadNodes').addEventListener('click', () => selectNodes(quadNodes));
document.getElementById('deselectAll').addEventListener('click', closeModal);
document.getElementById('selectAllActive').addEventListener('click', () => selectNodes(activeNodes));


// Toggle activation of selected nodes when checkbox is clicked
document.getElementById('activateNodeCheckbox').addEventListener('change', function () {
    const modalSettings = document.querySelector('.modal-settings');
    if (selectedNodes.length === 1) {
        const selectedNode = selectedNodes[0];
        if (this.checked) {
            modalSettings.classList.add('show');
        } else {
            modalSettings.classList.remove('show');
        }
    } else if (selectedNodes.length > 1) {
        if (this.checked) {
            modalSettings.classList.add('show');
        } else {
            modalSettings.classList.remove('show');
        }
    }
    // Update activeNodes immediately
    if (selectedNodes.length === 1) {
        saveNodeSettings(selectedNodes[0]);
        updateNodeStyles()
    } else if (selectedNodes.length > 1) {
        selectedNodes.forEach(node => {
            saveNodeSettings(node);
        })
        updateNodeStyles()
    }
});

const saveNodeButton = document.getElementById('saveNodeButton');
const discardNodeButton = document.getElementById('discardNodeButton');

saveNodeButton.addEventListener('click', function () {
    if (selectedNodes.length === 1) {
        saveNodeSettings(selectedNodes[0]);
    } else {
        selectedNodes.forEach(node => {
            saveNodeSettings(node);
        })
    }

    selectedNodes = [];  // Clear the selected nodes
    updateNodeStyles();
    document.getElementById('modal').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
    updateModal();
});

discardNodeButton.addEventListener('click', function () {
    if (selectedNodes.length === 1) {
        discardNodeSettings(selectedNodes[0]);
    } else {
        selectedNodes.forEach(node => {
            discardNodeSettings(node);
        })
    }
    selectedNodes = [];  // Clear the selected nodes
    updateNodeStyles();
    document.getElementById('modal').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
    updateModal();
});
// Add logic for adding more global colors
const addGlobalColorButton = document.getElementById('addGlobalColorButton');
const globalColorContainer = document.getElementById('globalColorContainer');
addGlobalColorButton.addEventListener('click', () => {
    if (globalColorContainer.children.length < 25) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#ffffff'; // Default color
        colorInput.classList.add('color-swatch');
        globalColorContainer.appendChild(colorInput);
    }
});

// Add logic for removing global colors
const removeGlobalColorButton = document.getElementById('removeGlobalColorButton');
removeGlobalColorButton.addEventListener('click', () => {
    if (globalColorContainer.children.length > 1) {
        globalColorContainer.removeChild(globalColorContainer.lastChild);
    }
});

// Add logic for adding more modal colors
const addModalColorButton = document.getElementById('addModalColorButton');
const modalColorContainer = document.getElementById('modalColorContainer');
addModalColorButton.addEventListener('click', () => {
    if (modalColorContainer.children.length < 25) {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = '#ffffff'; // Default color
        colorInput.classList.add('color-swatch');
        modalColorContainer.appendChild(colorInput);
    }
});

// Add logic for removing modal colors
const removeModalColorButton = document.getElementById('removeModalColorButton');
removeModalColorButton.addEventListener('click', () => {
    if (modalColorContainer.children.length > 1) {
        modalColorContainer.removeChild(modalColorContainer.lastChild);
    }
});
// Add logic for rainbow global colors button
const globalRainbowButton = document.getElementById('globalRainbowButton');
globalRainbowButton.addEventListener('click', () => {
    const colorCount = document.querySelectorAll('#globalColorContainer input').length;
    const rainbowColors = generateRainbowColors(colorCount);
    const colorContainer = document.getElementById('globalColorContainer');
    colorContainer.innerHTML = ''; // Clear existing swatches

    rainbowColors.forEach(color => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorContainer.appendChild(colorInput);
    });
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
        colorContainer.appendChild(colorInput);
    });
});
// Add logic for random global colors button
const globalRandomButton = document.getElementById('globalRandomButton');
globalRandomButton.addEventListener('click', () => {
    const colorCount = document.querySelectorAll('#globalColorContainer input').length;
    const randomColors = generateRandomColors(colorCount);
    const colorContainer = document.getElementById('globalColorContainer');
    colorContainer.innerHTML = ''; // Clear existing swatches

    randomColors.forEach(color => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorContainer.appendChild(colorInput);
    });
});

// Add logic for random global colors button
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
        colorContainer.appendChild(colorInput);
    });
});
// Add logic for similar global colors button
const globalSimilarButton = document.getElementById('globalSimilarButton');
globalSimilarButton.addEventListener('click', () => {
    const colorCount = document.querySelectorAll('#globalColorContainer input').length;
    const firstColor = document.querySelector('#globalColorContainer input')?.value;
    const similarColors = generateSimilarColors(colorCount, firstColor);
    const colorContainer = document.getElementById('globalColorContainer');
    colorContainer.innerHTML = ''; // Clear existing swatches
    similarColors.forEach(color => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorContainer.appendChild(colorInput);
    });
});
// Add logic for similar global colors button
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
        colorContainer.appendChild(colorInput);
    });
});

// Utility function to generate rainbow colors
function generateRainbowColors(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const hue = (i * (360 / numColors)) % 360;
        const color = hslToHex(hue, 100, 50);
        colors.push(color);
    }
    return colors;
}

// Utility function to generate random colors
function generateRandomColors(numColors) {
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const color = getRandomHexColor();
        colors.push(color);
    }
    return colors;
}
// Utility function to generate similar colors
function generateSimilarColors(numColors, baseColor) {
    const colors = [];
    if (baseColor) {
        const baseHsl = hexToHsl(baseColor)
        colors.push(baseColor)
        for (let i = 1; i < numColors; i++) {
            const hue = (baseHsl.h + (Math.random() * 60 - 30)) % 360;
            const saturation = Math.max(0, Math.min(100, baseHsl.s + (Math.random() * 20 - 10)));
            const lightness = Math.max(0, Math.min(100, baseHsl.l + (Math.random() * 20 - 10)));
            const color = hslToHex(hue, saturation, lightness);
            colors.push(color);
        }
    }
    return colors;
}
function getRandomHexColor() {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return "#" + randomColor;
}
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToHsl(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}