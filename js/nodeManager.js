// File: /js/nodeManager.js — Node selection operates on selected event's ActiveNodes

class Node {
    constructor(id, element, wrapper, profileSettings) {
        this.id = id;
        this.element = element;
        this.wrapper = wrapper;
        this.state = 'inactive';
        this.profileSettings = profileSettings;
        this.element.addEventListener('click', () => this.toggleSelect());
    }

    toggleSelect() {
        if (this.state === 'inactive') {
            this.activate();
            window.nodeManager.addActiveNode(this);
        } else if (this.state === 'active') {
            this.deactivate();
            window.nodeManager.removeActiveNode(this);
        }
        // Update the selected event's ActiveNodes array
        window.nodeManager.syncActiveNodesToEvent();
        if (window.mainJS && window.mainJS.syncToMicrocontroller) {
            window.mainJS.syncToMicrocontroller();
        }
    }

    activate() {
        this.state = this.state === 'selected' ? 'activeandselected' : 'active';
        this.updateStyle();
    }

    deactivate() {
        this.state = this.state === 'activeandselected' ? 'selected' : 'inactive';
        this.updateStyle();
    }

    select() {
        this.state = this.state === 'active' ? 'activeandselected' : 'selected';
        this.updateStyle();
    }

    deselect() {
        this.state = this.state === 'activeandselected' ? 'active' : 'inactive';
        this.updateStyle();
    }

    updateStyle() {
        this.wrapper.classList.remove('regularNode', 'SelectedNode', 'ActiveNode', 'ActiveandSelectedNode');
        if (this.state === 'activeandselected') {
            this.wrapper.classList.add('ActiveandSelectedNode');
            this.applyColorAnimation();
        } else if (this.state === 'active') {
            this.wrapper.classList.add('ActiveNode');
            this.applyColorAnimation();
        } else if (this.state === 'selected') {
            this.wrapper.classList.add('SelectedNode');
        } else {
            this.wrapper.classList.add('regularNode');
        }
    }

    applyColorAnimation() {
        let colors = this.profileSettings.Colors || ['#FF0000'];
        let duration = this.profileSettings.ProfilePeriod_ms || 5000;
        if (!Array.isArray(colors)) colors = [colors];
        if (colors.length === 0) colors = ['#FF0000'];
        if (typeof duration !== 'number') duration = Number(duration);

        colors.forEach((color, index) => {
            this.wrapper.style.setProperty(`--active-node-color-${index}`, color);
        });
        for (let i = colors.length; i < 6; i++) {
            this.wrapper.style.setProperty(`--active-node-color-${i}`, colors[i % colors.length]);
        }
        this.wrapper.style.setProperty('--pulse-duration', `${duration / 1000}s`);
    }
}

class NodeManager {
    constructor(profileSettings) {
        this.nodes = [];
        this.profileSettings = profileSettings;
        this.selectedNodes = [];
        this.activeNodes = [];
        this.borderNodes = [0, 3, 5, 13, 15, 18];
        this.triNodes = [4, 6, 7, 11, 12, 14];
        this.quadNodes = [1, 2, 8, 10, 16, 17];
        this.initializeNodes();
        window.nodeManager = this;
    }

    initializeNodes() {
        const nodeElements = document.querySelectorAll('.hex');
        nodeElements.forEach(element => {
            const id = Number(element.dataset.id);
            const wrapper = element.closest('.hex-wrap');
            const node = new Node(id, element, wrapper, this.profileSettings);
            this.nodes.push(node);
        });
        this.activateNodes([9]);
    }

    getNode(id) { return this.nodes.find(n => n.id === id); }
    getActiveNodes() { return this.activeNodes; }

    addActiveNode(node) {
        if (!this.activeNodes.includes(node)) this.activeNodes.push(node);
    }

    removeActiveNode(node) {
        this.activeNodes = this.activeNodes.filter(n => n !== node);
    }

    activateNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                if (!this.activeNodes.includes(node)) this.activeNodes.push(node);
                node.activate();
            }
        });
    }

    deactivateNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                this.activeNodes = this.activeNodes.filter(n => n !== node);
                node.deactivate();
            }
        });
    }

    deactivateAllNodes() {
        this.nodes.forEach(node => node.deactivate());
        this.activeNodes = [];
        this.selectedNodes = [];
    }

    deselectAllNodes() {
        this.selectedNodes.forEach(node => node.deselect());
        this.selectedNodes = [];
    }

    toggleNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                if (node.state === 'inactive') {
                    node.activate();
                    this.addActiveNode(node);
                } else if (node.state === 'active') {
                    node.deactivate();
                    this.removeActiveNode(node);
                }
            }
        });
        this.syncActiveNodesToEvent();
    }

    toggleBiNodes() { this.toggleNodes(this.borderNodes); }
    toggleTriNodes() { this.toggleNodes(this.triNodes); }
    toggleQuadNodes() { this.toggleNodes(this.quadNodes); }

    updateStyles() {
        this.nodes.forEach(node => node.updateStyle());
    }

    // Sync the current active node state to the selected event's ActiveNodes array
    syncActiveNodesToEvent() {
        if (!window.mainJS) return;
        const idx = window.mainJS.getSelectedEventIndex();
        const ps = window.mainJS.ProfileSettings || this.profileSettings;
        if (!ps.Events || !ps.Events[idx]) return;

        const arr = new Array(19).fill(0);
        this.activeNodes.forEach(node => { arr[node.id] = 1; });
        ps.Events[idx].ActiveNodes = arr;
    }
}

let nodeManager;

function initNodeManager(updateNodeStyles, updateModal, profileSettings) {
    nodeManager = new NodeManager(profileSettings);

    document.getElementById('toggleBiNodes').addEventListener('click', () => {
        nodeManager.toggleBiNodes();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('toggleTriNodes').addEventListener('click', () => {
        nodeManager.toggleTriNodes();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('toggleQuadNodes').addEventListener('click', () => {
        nodeManager.toggleQuadNodes();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('deactivateAllNodes').addEventListener('click', () => {
        nodeManager.deactivateAllNodes();
        nodeManager.syncActiveNodesToEvent();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('applyChanges').addEventListener('click', () => {
        if (window.mainJS) window.mainJS.sendConfigurationToMicrocontroller();
    });
    document.getElementById('discardChanges').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    updateNodeStyles(profileSettings);
}

function updateNodeStyles(profileSettings) {
    if (nodeManager) {
        nodeManager.profileSettings = profileSettings;
        nodeManager.updateStyles();
    }
}

function setActiveNodes(newActiveNodeIds) {
    if (nodeManager) {
        nodeManager.deactivateNodes(nodeManager.getActiveNodes().map(n => n.id));
        nodeManager.activateNodes(newActiveNodeIds);
    }
}

function getActiveNodes() {
    if (nodeManager) return nodeManager.getActiveNodes().map(n => n.id);
    return [];
}

export { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes };
