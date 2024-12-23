let selectedNode = null;

// Function to highlight the selected node in green
function highlightNode(node) {
    node.style.backgroundColor = 'green';
}

// Function to reset the node to its default color
function resetNode(node) {
    node.style.backgroundColor = '#000';
}

// Function to open the modal window
function openModal(node) {
    selectedNode = node;
    document.getElementById('modal').classList.add('show');
    document.getElementById('nodeName').value = `Node ${node.dataset.id}`; // Set node name
}

// Function to close the modal window
function closeModal() {
    if (selectedNode) {
        resetNode(selectedNode);
        selectedNode = null;
    }
    document.getElementById('modal').classList.remove('show');
}

function handleNodeClick(node) {
    if (selectedNode === node) {
        // If the clicked node is already selected, close the modal and reset the node
        closeModal();
    } else {
        // If a different node is clicked, reset the previous node, highlight the new one, and open the modal
        if (selectedNode) {
            resetNode(selectedNode); // Reset the previous node
        }
        highlightNode(node); // Highlight the clicked node
        openModal(node); // Open the modal for the clicked node
    }
}