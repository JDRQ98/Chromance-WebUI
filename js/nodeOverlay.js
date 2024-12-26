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
        startingColor: '#FF0000',
        hueDeltaPeriod: 0,
        hueDeltaTick: 200,
        numberOfColors: 7,
        numberOfRipples: 1
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
        startingColor: document.getElementById('startingColor').value,
        hueDeltaPeriod: Number(document.getElementById('hueDeltaPeriod').value),
        hueDeltaTick: Number(document.getElementById('hueDeltaTick').value),
        numberOfColors: Number(document.getElementById('numberOfColors').value),
        numberOfRipples: document.getElementById('numberOfRipples').value,
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
        document.getElementById('startingColor').value = storedSettings.startingColor;
        document.getElementById('hueDeltaPeriod').value = storedSettings.hueDeltaPeriod;
        document.getElementById('hueDeltaTick').value = storedSettings.hueDeltaTick;
        document.getElementById('numberOfColors').value = storedSettings.numberOfColors;
        document.getElementById('numberOfRipples').value = storedSettings.numberOfRipples;
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
    console.log("loadNodeSettings called for node:", nodeId, "selectedNodes:", selectedIds);

    // Set the inputs based on global settings or node specific settings
    let desiredBehaviorValue = nodeSpecificSettings[nodeId]?.desiredBehavior ?? globalSettings.desiredBehavior;
    let rippleDirectionValue = nodeSpecificSettings[nodeId]?.rippleDirection ?? globalSettings.rippleDirection;
    let rippleDelayValue = nodeSpecificSettings[nodeId]?.rippleDelay ?? globalSettings.rippleDelay;
    let rippleLifeSpanValue = nodeSpecificSettings[nodeId]?.rippleLifeSpan ?? globalSettings.rippleLifeSpan;
    let rippleSpeedValue = nodeSpecificSettings[nodeId]?.rippleSpeed ?? globalSettings.rippleSpeed;
    let decayPerTickValue = nodeSpecificSettings[nodeId]?.decayPerTick ?? globalSettings.decayPerTick;
    let startingColorValue = nodeSpecificSettings[nodeId]?.startingColor ?? globalSettings.startingColor;
    let hueDeltaPeriodValue = nodeSpecificSettings[nodeId]?.hueDeltaPeriod ?? globalSettings.hueDeltaPeriod;
    let hueDeltaTickValue = nodeSpecificSettings[nodeId]?.hueDeltaTick ?? globalSettings.hueDeltaTick;
    let numberOfColorsValue = nodeSpecificSettings[nodeId]?.numberOfColors ?? globalSettings.numberOfColors;


    // Set edit button checkbox state based on if there is node specific property
    const modal = document.getElementById('modal');
    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    editCheckboxes.forEach(checkbox => {
        const setting = checkbox.dataset.setting;
        let allSame = true;
        console.log("  Checking setting:", setting);
        if (selectedIds.length === 1) {
            if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                checkbox.checked = true;
                checkbox.indeterminate = false;
                console.log("    Single node, setting exists, checkbox checked");
                enableModalInput(setting, nodeId);
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = false;
                console.log("    Single node, setting does not exist, checkbox unchecked");
                disableModalInput(setting, nodeId);
            }
        } else if (selectedIds.length > 1) {
            // Check if all selected nodes have the same setting
            allSame = selectedIds.every(id => {
                if (nodeSpecificSettings[id] && nodeSpecificSettings[id].hasOwnProperty(setting)) {
                    const isSame = nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]][setting] === nodeSpecificSettings[id][setting];
                    console.log(`   Node ${id} has setting ${setting} and it's equal to ${isSame} `);
                    return isSame;
                } else {
                    const hasSetting = !(nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]].hasOwnProperty(setting));
                    console.log(`   Node ${id} has no setting ${setting} and it's equal to ${hasSetting} `);
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
                console.log("   Multiple nodes, all have same setting, checkbox checked:", checkbox.checked);
                if (checkbox.checked) {
                    enableModalInput(setting, nodeId);
                }
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
                console.log("   Multiple nodes, settings differ, checkbox indeterminate");
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
                } else if (setting === 'startingColor') {
                    startingColorValue = 'N/A';
                } else if (setting === 'hueDeltaPeriod') {
                    hueDeltaPeriodValue = 'N/A';
                } else if (setting === 'hueDeltaTick') {
                    hueDeltaTickValue = 'N/A';
                } else if (setting === 'numberOfColors') {
                    numberOfColorsValue = 'N/A';
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
    setModalInputValue('startingColor', startingColorValue)
    setModalInputValue('hueDeltaPeriod', hueDeltaPeriodValue)
    setModalInputValue('hueDeltaTick', hueDeltaTickValue)
    setModalInputValue('numberOfColors', numberOfColorsValue)


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
        modalStartingColor: modal.querySelector('#modalStartingColor'),
        modalHueDeltaPeriod: modal.querySelector('#modalHueDeltaPeriod'),
        modalHueDeltaTick: modal.querySelector('#modalHueDeltaTick'),
        modalNumberOfColors: modal.querySelector('#modalNumberOfColors'),
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

        inputElement.addEventListener('change', function () {
            // Update display if range
            if (setting === 'rippleSpeed') {
                modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(2);
            }
            if (setting === 'decayPerTick') {
                modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(3);
            }
        });
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
            nodeSpecificSettings[nodeId][setting] = getModalInputValue(setting);
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