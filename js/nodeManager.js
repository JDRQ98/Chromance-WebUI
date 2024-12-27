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
}

// Function to update the styling of nodes based on their activation/selection status
function updateNodeStyles(globalSettings, nodeSpecificSettings) {
    document.querySelectorAll('.hex').forEach(node => {
        updateNodeStyle(node, globalSettings, nodeSpecificSettings);
    });
}


function deactivateAllNodes(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings) {
    activeNodes = [];
    selectedNodes = [];
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateModal(nodeSpecificSettings, globalSettings);
}

function initNodeManager(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, closeModal, updateCurrentEffect) {
    const nodes = document.querySelectorAll('.hex');
    nodes.forEach(node => {
        node.addEventListener('click', function () {
            handleNodeClick(node, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
        });
    });
    const deactivateAllNodesButton = document.getElementById('deactivateAllNodes');
    deactivateAllNodesButton.addEventListener('click', () => {
        deactivateAllNodes(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings);
        updateCurrentEffect(globalSettings, nodeSpecificSettings, activeNodes);
    });

    // Event listeners for selecting node categories
    document.getElementById('selectBiNodes').addEventListener('click', () => selectNodes(borderNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('selectTriNodes').addEventListener('click', () => selectNodes(triNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('selectQuadNodes').addEventListener('click', () => selectNodes(quadNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('deselectAll').addEventListener('click', () => closeModal(updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
    document.getElementById('selectAllActive').addEventListener('click', () => selectNodes(activeNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect));
}

// Function to handle node click and toggle selection
function handleNodeClick(node, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    if (selectedNodes.includes(node)) {
        selectedNodes = selectedNodes.filter(n => n !== node);
    } else {
        selectedNodes.push(node);
    }
    updateNodeStyle(node, globalSettings, nodeSpecificSettings);
    updateModal(nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, activeNodes);
}

// Function to select all nodes in a given category
function selectNodes(nodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect) {
    nodes.forEach(id => {
        const node = document.querySelector(`.hex[data-id="${id}"]`);
        handleNodeClick(node, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect);
    });
    updateModal(nodeSpecificSettings, globalSettings, updateNodeStyles);
    if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
        openModal();
    }
}

export {
    selectedNodes,
    activeNodes,
    updateNodeStyles,
    updateNodeStyle,
    initNodeManager,
    handleNodeClick,
    deactivateAllNodes,
    selectNodes
};