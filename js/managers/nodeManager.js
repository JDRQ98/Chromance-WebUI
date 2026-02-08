// File: /js/managers/nodeManager.js
// Refactored node manager using event bus and centralized state

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';

class Node {
    constructor(id, element, wrapper) {
        this.id = id;
        this.element = element;
        this.wrapper = wrapper;
        this.state = 'inactive';

        this.element.addEventListener('click', () => this.toggleSelect());
    }

    getSettings() {
        const nodeSettings = store.nodeSpecificSettings[this.id];
        return nodeSettings || store.globalSettings;
    }

    toggleSelect() {
        if (this.state === 'inactive' || this.state === 'active') {
            store.addSelectedNode(this.id);
            this.select();
        } else {
            store.removeSelectedNode(this.id);
            this.deselect();
        }
    }

    select() {
        this.state = this.state === 'active' ? 'activeandselected' : 'selected';
        this.updateStyle();
    }

    deselect() {
        this.state = this.state === 'activeandselected' ? 'active' : 'inactive';
        this.updateStyle();
    }

    activate() {
        this.state = this.state === 'selected' ? 'activeandselected' : 'active';
        this.updateStyle();
    }

    deactivate() {
        this.state = this.state === 'activeandselected' ? 'selected' : 'inactive';
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
        const settings = this.getSettings();
        let colors = settings.startingColor || settings.colors || ['#FF0000'];
        let duration = settings.rippleDelay || 3000;

        if (!Array.isArray(colors)) {
            colors = [colors];
        }

        if (typeof duration !== 'number') {
            duration = Number(duration);
        }

        if (colors.length === 0) {
            colors = ['#FF0000'];
        }

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
    constructor() {
        this.nodes = [];
        this.borderNodes = [0, 3, 5, 13, 15, 18];
        this.triNodes = [4, 6, 7, 11, 12, 14];
        this.quadNodes = [1, 2, 8, 10, 16, 17];

        this._initializeNodes();
        this._subscribeToEvents();
        this._bindButtons();

        // Initialize active nodes from store
        const activeNodes = store.activeNodes;
        if (activeNodes.length > 0) {
            this.activateNodes(activeNodes);
        }
    }

    _initializeNodes() {
        const nodeElements = document.querySelectorAll('.hex');
        nodeElements.forEach(element => {
            const id = Number(element.dataset.id);
            const wrapper = element.closest('.hex-wrap');
            const node = new Node(id, element, wrapper);
            this.nodes.push(node);
        });
    }

    _subscribeToEvents() {
        eventBus.subscribe(Events.NODES_ACTIVATED, ({ nodeIds }) => {
            this.activateNodes(nodeIds);
        });

        eventBus.subscribe(Events.NODES_DEACTIVATED, ({ nodeIds }) => {
            this.deactivateNodes(nodeIds);
        });

        eventBus.subscribe(Events.NODES_DESELECTED, ({ removed }) => {
            if (removed) {
                removed.forEach(id => {
                    const node = this.getNode(id);
                    if (node) node.deselect();
                });
            }
        });

        eventBus.subscribe(Events.SETTINGS_CHANGED, () => {
            this.updateStyles();
        });
    }

    _bindButtons() {
        document.getElementById('selectBiNodes')?.addEventListener('click', () => {
            this.selectNodes(this.borderNodes);
        });

        document.getElementById('selectTriNodes')?.addEventListener('click', () => {
            this.selectNodes(this.triNodes);
        });

        document.getElementById('selectQuadNodes')?.addEventListener('click', () => {
            this.selectNodes(this.quadNodes);
        });

        document.getElementById('selectAllActive')?.addEventListener('click', () => {
            this.selectNodes(store.activeNodes);
        });

        document.getElementById('deselectAll')?.addEventListener('click', () => {
            this.deselectAllNodes();
        });

        document.getElementById('deactivateAllNodes')?.addEventListener('click', () => {
            this.deactivateAllNodes();
        });
    }

    getNode(id) {
        return this.nodes.find(node => node.id === id);
    }

    getSelectedNodes() {
        return this.nodes.filter(node =>
            node.state === 'selected' || node.state === 'activeandselected'
        );
    }

    getActiveNodes() {
        return this.nodes.filter(node =>
            node.state === 'active' || node.state === 'activeandselected'
        );
    }

    selectNodes(ids) {
        ids.forEach(id => {
            const node = this.getNode(id);
            if (node && node.state !== 'selected' && node.state !== 'activeandselected') {
                store.addSelectedNode(id);
                node.select();
            }
        });
    }

    deselectNodes(ids) {
        ids.forEach(id => {
            const node = this.getNode(id);
            if (node) {
                store.removeSelectedNode(id);
                node.deselect();
            }
        });
    }

    deselectAllNodes() {
        this.nodes.forEach(node => {
            if (node.state === 'selected' || node.state === 'activeandselected') {
                node.deselect();
            }
        });
        store.clearSelectedNodes();
    }

    activateNodes(ids) {
        ids.forEach(id => {
            const node = this.getNode(id);
            if (node) {
                node.activate();
            }
        });
    }

    deactivateNodes(ids) {
        ids.forEach(id => {
            const node = this.getNode(id);
            if (node) {
                node.deactivate();
            }
        });
    }

    deactivateAllNodes() {
        this.nodes.forEach(node => node.deactivate());
        store.setActiveNodes([]);
    }

    updateStyles() {
        this.nodes.forEach(node => node.updateStyle());
    }
}

let nodeManager = null;

export function initNodeManager() {
    nodeManager = new NodeManager();
    return nodeManager;
}

export function getNodeManager() {
    return nodeManager;
}

// Legacy exports for backward compatibility
export function updateNodeStyles() {
    if (nodeManager) {
        nodeManager.updateStyles();
    }
}

export function setActiveNodes(nodeIds) {
    store.setActiveNodes(nodeIds);
}

export function getActiveNodes() {
    return store.activeNodes;
}

export default { initNodeManager, getNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes };
