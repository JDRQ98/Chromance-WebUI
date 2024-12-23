let selectedNodes = [];  // Array to store selected nodes
let activeNodes = [9];  // Array to store active nodes; by default, node 9 is active.
let globalSettings = {}; // Object to store global settings

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

    window.closeGlobalSettingsModal = function (){
        globalSettingsModal.classList.remove('show');
        overlay.classList.remove('show');
    }
}

function initGlobalSettings(){
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
    if(localStorage.getItem('globalSettings') === null){
        resetGlobalSettings();
    } else {
         globalSettings = JSON.parse(localStorage.getItem('globalSettings'))
    }

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
}

function resetGlobalSettings(){
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
    /* current implementation stores global settings in user's local storage! 
    WIP: this should be changed to fetch the global settings from the microcontroller back-end.
    For now, it's okay like this for testing purposes */

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
        if (activeNodes.includes(nodeId) && selectedNodes.includes(node)) {
            node.style.backgroundColor = 'purple'; // Active and selected nodes are purple
        } else if (activeNodes.includes(nodeId)) {
            node.style.backgroundColor = 'blue'; // Active nodes are blue
        } else if (selectedNodes.includes(node)) {
            node.style.backgroundColor = 'green'; // Selected but inactive nodes are green
        } else {
            node.style.backgroundColor = '#000'; // Inactive and unselected nodes are black
        }
    });
}

// Function to update the modal with selected nodes
function updateModal() {
    const selectedIds = selectedNodes.map(node => node.dataset.id);
    const display = document.getElementById('selectedNodesDisplay');
    if (selectedIds.length > 0) {
        display.textContent = 'Selected Nodes: ' + selectedIds.join(', ');
    } else {
        display.textContent = 'No nodes selected';
    }

    const activateCheckbox = document.getElementById('activateNodeCheckbox');
    if (selectedIds.length === 1) { // Only 1 node is selected
        const selectedNodeId = selectedIds[0];
        // Check if the selected node is contained within activeNodes
        if (activeNodes.includes(Number(selectedNodeId))) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
        } else {
            activateCheckbox.checked = false;
            activateCheckbox.indeterminate = false;
        }
    } else if (selectedIds.length > 1) { // More than 1 node is selected
        // Check if all selected nodes are active
        const allActive = selectedIds.every(id => activeNodes.includes(Number(id)));
        if (allActive) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
        } else {
            // Check if none are active
            const noneActive = selectedIds.every(id => !activeNodes.includes(Number(id)));
            if (noneActive) {
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = false;
            } else {
                // Some are active and some are not, set to indeterminate
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = true;
            }
        }
    } else {
        // If no nodes are selected, reset the checkbox
        activateCheckbox.checked = false;
        activateCheckbox.indeterminate = false;
    }
}

// Function to open the modal window
function openModal() {
    document.getElementById('modal').classList.add('show');
    updateModal();  // Update modal with selected nodes
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

    updateModal();  // Update modal to reflect selection

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

// Close the modal when the close button is clicked
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('deselectAll').addEventListener('click', closeModal);

// Toggle activation of selected nodes when checkbox is clicked
document.getElementById('activateNodeCheckbox').addEventListener('change', function() {
    if (this.checked) {
        // Add all selected nodes to activeNodes (ensure no duplicates)
        selectedNodes.forEach(node => {
            const nodeId = Number(node.dataset.id); // Convert ID to number
            if (!activeNodes.includes(nodeId)) {
                activeNodes.push(nodeId); // Add only if not already present
            }
        });
    } else {
        // Remove all selected nodes from activeNodes
        selectedNodes.forEach(node => {
            const nodeId = Number(node.dataset.id); // Convert ID to number
            activeNodes = activeNodes.filter(activeNodeId => activeNodeId !== nodeId);
        });
    }

    // Update the styling of nodes based on their activation status
    updateNodeStyles();
});