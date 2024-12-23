let selectedNodes = [];  // Array to store selected nodes
let activeNodes = [9];  // Array to store active nodes; by default, node 9 is active.
let globalSettings = {}; // Object to store global settings
let nodeSpecificSettings = {}; // Object to store node-specific settings


// Border nodes (bi-nodes), quad nodes, and tri nodes
const borderNodes = [0, 3, 5, 13, 15, 18];
const triNodes = [4, 6, 7, 11, 12, 14];
const quadNodes = [1, 2, 8, 10, 16, 17];

function setupGlobalSettingsModal() {
    const editGlobalSettingsButton = document.getElementById('editGlobalSettingsButton');
    const globalSettingsModal = document.getElementById('globalSettingsModal');
    const overlay = document.getElementById('overlay');


    editGlobalSettingsButton.addEventListener('click', () => {
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
        startingNodes: 'center',
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
    };

    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
}

function saveGlobalSettings() {
    globalSettings = {
        startingNodes: document.getElementById('startingNodes').value,
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
    };
    localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
    console.log("Global settings are", globalSettings);
}

function loadGlobalSettings() {
    const storedSettings = JSON.parse(localStorage.getItem('globalSettings'));

    if (storedSettings) {
        document.getElementById('startingNodes').value = storedSettings.startingNodes;
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
        loadNodeSettings(node);
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

        // Disable all settings if more than one node is selected
        disableModalSettings();
    } else {
        // If no nodes are selected, reset the checkbox
        activateCheckbox.checked = false;
        activateCheckbox.indeterminate = false;
        // Disable all settings if no node is selected
        disableModalSettings();
        modalSettings.classList.remove('show');
    }
}

function loadNodeSettings(node) {
    const nodeId = node.dataset.id;
    const modal = document.getElementById('modal');
    const modalStartingNodes = document.getElementById('modalStartingNodes');
    const modalDesiredBehavior = document.getElementById('modalDesiredBehavior');
    const modalRippleDirection = document.getElementById('modalRippleDirection');
    const modalRippleDelay = document.getElementById('modalRippleDelay');
    const modalRippleLifeSpan = document.getElementById('modalRippleLifeSpan');
    const modalRippleSpeed = document.getElementById('modalRippleSpeed');
    const modalRippleSpeedDisplay = document.getElementById('modalRippleSpeedDisplay');
    const modalDecayPerTick = document.getElementById('modalDecayPerTick');
    const modalDecayPerTickDisplay = document.getElementById('modalDecayPerTickDisplay');
    const modalStartingColor = document.getElementById('modalStartingColor');
    const modalHueDeltaPeriod = document.getElementById('modalHueDeltaPeriod');
    const modalHueDeltaTick = document.getElementById('modalHueDeltaTick');
    const modalNumberOfColors = document.getElementById('modalNumberOfColors');

    // Set the inputs based on global settings or node specific settings
    if (nodeSpecificSettings[nodeId]) { // if node has some local settings
        modalStartingNodes.value = nodeSpecificSettings[nodeId].startingNodes
        modalDesiredBehavior.value = nodeSpecificSettings[nodeId].desiredBehavior
        modalRippleDirection.value = nodeSpecificSettings[nodeId].rippleDirection
        modalRippleDelay.value = nodeSpecificSettings[nodeId].rippleDelay
        modalRippleLifeSpan.value = nodeSpecificSettings[nodeId].rippleLifeSpan
        modalRippleSpeed.value = nodeSpecificSettings[nodeId].rippleSpeed
        modalRippleSpeedDisplay.textContent = parseFloat(nodeSpecificSettings[nodeId].rippleSpeed).toFixed(2)
        modalDecayPerTick.value = nodeSpecificSettings[nodeId].decayPerTick
        modalDecayPerTickDisplay.textContent = parseFloat(nodeSpecificSettings[nodeId].decayPerTick).toFixed(3)
        modalStartingColor.value = nodeSpecificSettings[nodeId].startingColor
        modalHueDeltaPeriod.value = nodeSpecificSettings[nodeId].hueDeltaPeriod
        modalHueDeltaTick.value = nodeSpecificSettings[nodeId].hueDeltaTick
        modalNumberOfColors.value = nodeSpecificSettings[nodeId].numberOfColors;
    } else { // if the node has no local settings
        modalStartingNodes.value = globalSettings.startingNodes
        modalDesiredBehavior.value = globalSettings.desiredBehavior
        modalRippleDirection.value = globalSettings.rippleDirection
        modalRippleDelay.value = globalSettings.rippleDelay
        modalRippleLifeSpan.value = globalSettings.rippleLifeSpan
        modalRippleSpeed.value = globalSettings.rippleSpeed
        modalRippleSpeedDisplay.textContent = parseFloat(globalSettings.rippleSpeed).toFixed(2)
        modalDecayPerTick.value = globalSettings.decayPerTick
        modalDecayPerTickDisplay.textContent = parseFloat(globalSettings.decayPerTick).toFixed(3)
        modalStartingColor.value = globalSettings.startingColor
        modalHueDeltaPeriod.value = globalSettings.hueDeltaPeriod
        modalHueDeltaTick.value = globalSettings.hueDeltaTick
        modalNumberOfColors.value = globalSettings.numberOfColors
    }


    // Set edit button checkbox state based on if there is node specific property
    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    editCheckboxes.forEach(checkbox => {
        const setting = checkbox.dataset.setting;
        if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });

    //Add listener to the edit checkbox buttons
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const setting = this.dataset.setting;
            if (this.checked) {
                enableModalSetting(setting, nodeId);
            } else {
                disableModalSetting(setting, nodeId);
            }
        });
    });

    // Display the modal
    modal.classList.add('show')
}

function enableModalSetting(setting, nodeId) {
    //  console.log("enabling modal setting " + setting)
    const modal = document.getElementById('modal');
    let inputElement = modal.querySelector(`#modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`);
    if (inputElement) {
        inputElement.disabled = false;

        // Store a node specific setting for this node, create settings object for node if it doesn't exist
        if (!nodeSpecificSettings[nodeId]) {
            nodeSpecificSettings[nodeId] = {};
        }

        // Set the current property from current value
        nodeSpecificSettings[nodeId][setting] = inputElement.value;

        inputElement.addEventListener('change', function () {
            nodeSpecificSettings[nodeId][setting] = inputElement.value;
            // Update range value
            if (setting === 'rippleSpeed') {
                document.getElementById('modalRippleSpeedDisplay').textContent = parseFloat(inputElement.value).toFixed(2);
            }
            if (setting === 'decayPerTick') {
                document.getElementById('modalDecayPerTickDisplay').textContent = parseFloat(inputElement.value).toFixed(3);
            }
        });


    }
}

function disableModalSetting(setting, nodeId) {
    //  console.log("disabling modal setting " + setting)
    const modal = document.getElementById('modal');
    let inputElement = modal.querySelector(`#modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`);
    if (inputElement) {
        inputElement.disabled = true;

        // remove the settings property from the node if it exists
        if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
            delete nodeSpecificSettings[nodeId][setting];

            // Set the input element to global default value
            if (setting === 'startingNodes') {
                inputElement.value = globalSettings.startingNodes;
            } else if (setting === 'desiredBehavior') {
                inputElement.value = globalSettings.desiredBehavior;
            } else if (setting === 'rippleDirection') {
                inputElement.value = globalSettings.rippleDirection;
            } else if (setting === 'rippleDelay') {
                inputElement.value = globalSettings.rippleDelay;
            } else if (setting === 'rippleLifeSpan') {
                inputElement.value = globalSettings.rippleLifeSpan;
            } else if (setting === 'rippleSpeed') {
                inputElement.value = globalSettings.rippleSpeed;
                document.getElementById('modalRippleSpeedDisplay').textContent = parseFloat(globalSettings.rippleSpeed).toFixed(2)
            } else if (setting === 'decayPerTick') {
                inputElement.value = globalSettings.decayPerTick
                document.getElementById('modalDecayPerTickDisplay').textContent = parseFloat(globalSettings.decayPerTick).toFixed(3)
            } else if (setting === 'startingColor') {
                inputElement.value = globalSettings.startingColor
            } else if (setting === 'hueDeltaPeriod') {
                inputElement.value = globalSettings.hueDeltaPeriod
            } else if (setting === 'hueDeltaTick') {
                inputElement.value = globalSettings.hueDeltaTick
            } else if (setting === 'numberOfColors') {
                inputElement.value = globalSettings.numberOfColors;
            }

        }

    }
}

function disableModalSettings() {
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
    editCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const setting = checkbox.dataset.setting;
            let inputElement = modal.querySelector(`#modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`);
            if (inputElement) {
                // Store a node specific setting for this node, create settings object for node if it doesn't exist
                if (!nodeSpecificSettings[nodeId]) {
                    nodeSpecificSettings[nodeId] = {};
                }
                nodeSpecificSettings[nodeId][setting] = inputElement.value;
            }

        } else if (nodeSpecificSettings[nodeId]) {
            const setting = checkbox.dataset.setting;
            if (nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                delete nodeSpecificSettings[nodeId][setting]
            }
        }
    });
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


    // If there are node specific settings, delete them, to load defaults from global settings
    if (nodeSpecificSettings[nodeId]) {
        delete nodeSpecificSettings[nodeId];
    }


    // Load settings from global or node-specific settings
    loadNodeSettings(node);
    //  Update the styling of nodes based on their activation status
    updateNodeStyles();

}

// Function to open the modal window
function openModal() {
    document.getElementById('modal').classList.add('show');
}

// Function to close the modal window and deselect all nodes
function closeModal() {
    selectedNodes = [];  // Clear the selected nodes
    updateNodeStyles();
    document.getElementById('modal').classList.remove('show');
    updateModal();  // Update modal to reflect no nodes selected
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

    if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
        openModal();  // Open the modal if there are selected nodes
    }

    if (selectedNodes.length == 0) {
        closeModal();  // close the modal if all nodes were de-selected
    }
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
    updateModal();
});