let selectedNodes = [];  // Array to store selected nodes
let activeNodes = [9];  // Array to store active nodes; by default, node 9 is active.

// Border nodes (bi-nodes), quad nodes, and tri nodes
const borderNodes = [0, 3, 5, 13, 15, 18];
const triNodes = [4, 6, 7, 11, 12, 14];
const quadNodes = [1, 2, 8, 10, 16, 17];

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