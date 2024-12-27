// File: /js/nodeManager.js
// nodeManager.js
let selectedNodes = []; // Array to store selected nodes
let activeNodes = []; // Array to store active nodes; by default, node 9 is active.

// Border nodes (bi-nodes), quad nodes, and tri nodes
const borderNodes = [0, 3, 5, 13, 15, 18];
const triNodes = [4, 6, 7, 11, 12, 14];
const quadNodes = [1, 2, 8, 10, 16, 17];

// Function to update the styling of a single node based on their activation/selection status
function updateNodeStyle(node, globalSettings, nodeSpecificSettings) {
    const nodeId = Number(node.dataset.id);
    const hexWrap = node.closest('.hex-wrap');
    // Remove all style classes
    hexWrap.classList.remove('regularNode', 'SelectedNode', 'ActiveNode', 'ActiveandSelectedNode');

    // Add the class according to the node's status
    if (activeNodes.includes(nodeId) && selectedNodes.includes(node)) {
        hexWrap.classList.add('ActiveandSelectedNode');
    } else if (activeNodes.includes(nodeId)) {
        hexWrap.classList.add('ActiveNode');
    } else if (selectedNodes.includes(node)) {
        hexWrap.classList.add('SelectedNode');
    } else {
        hexWrap.classList.add('regularNode');
    }
}

// Function to update the styling of nodes based on their activation/selection status
function updateNodeStyles(globalSettings, nodeSpecificSettings) {
    // Cache the node elements for efficiency
    const nodes = document.querySelectorAll('.hex');
    nodes.forEach(node => {
        updateNodeStyle(node, globalSettings, nodeSpecificSettings);
    });
}

function setActiveNodes(newActiveNodes) {
    activeNodes = newActiveNodes;
}

function getActiveNodes() {
    return activeNodes;
}
function setSelectedNodes(newSelectedNodes) {
    selectedNodes = newSelectedNodes;
}

function deactivateAllNodes(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    activeNodes = [];
    selectedNodes = [];
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateModal([], activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, activeNodes);
}

function initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, closeModal, updateCurrentEffect) {
    // Get the container element that wraps the hex nodes
    const container = document.getElementById('container');

    // Use event delegation for node clicks
    container.addEventListener('click', (event) => {
        // Check if the clicked element is a hex node
        if (event.target.classList.contains('hex')) {
            handleNodeClick(event.target, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
        }
    });
    const deactivateAllNodesButton = document.getElementById('deactivateAllNodes');
    deactivateAllNodesButton.addEventListener('click', () => {
        deactivateAllNodes(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    });

    // Event listeners for selecting node categories
    document.getElementById('selectBiNodes').addEventListener('click', () => selectNodes(borderNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('selectTriNodes').addEventListener('click', () => selectNodes(triNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('selectQuadNodes').addEventListener('click', () => selectNodes(quadNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('deselectAll').addEventListener('click', () => {
        const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
        closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    });
    document.getElementById('selectAllActive').addEventListener('click', () => selectNodes(activeNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
}

// Function to handle node click and toggle selection
function handleNodeClick(node, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    const nodeId = Number(node.dataset.id);
    if (selectedNodes.includes(node)) {
        selectedNodes = selectedNodes.filter(n => n !== node);
    } else {
        selectedNodes.push(node);
    }
    updateNodeStyle(node, globalSettings, nodeSpecificSettings);
    updateModal(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, activeNodes);
}

// Function to select all nodes in a given category
function selectNodes(nodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    nodes.forEach(id => {
        const node = document.querySelector(`.hex[data-id="${id}"]`);
        handleNodeClick(node, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    });
    updateModal(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles);
    if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
        openModal();
    }
}
// Function to close the modal window and deselect all nodes
function closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    selectedNodes.forEach(node => {
        if (selectedNodes.includes(node)) {
            selectedNodes = selectedNodes.filter(n => n !== node);
            updateNodeStyle(node, globalSettings, nodeSpecificSettings);
        }
    });
    updateModal([], activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles);
}
export {
    selectedNodes,
    activeNodes,
    updateNodeStyles,
    updateNodeStyle,
    initNodeManager,
    handleNodeClick,
    deactivateAllNodes,
    selectNodes,
    setActiveNodes,
    getActiveNodes,
    setSelectedNodes
};