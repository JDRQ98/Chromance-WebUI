// File: /js/nodeManager.js

class Node {
    constructor(id, element, wrapper, profileSettings) {
        this.id = id;
        this.element = element;
        this.wrapper = wrapper;
        this.state = 'inactive';
        this.profileSettings = profileSettings;
        this.element.addEventListener('click', () => this.toggleSelect());
    }
    getSettings() {
        return this.profileSettings;
    }
    toggleSelect() {
        console.log(`Node ${this.id} toggleSelect called. Current state: ${this.state}`);
        // Toggle between active and inactive
        if (this.state === 'inactive') {
            this.activate();
            window.nodeManager.addActiveNode(this);
        } else if (this.state === 'active') {
            this.deactivate();
            window.nodeManager.removeActiveNode(this);
        }
        // Live sync node changes to ESP32
        if (window.mainJS && window.mainJS.syncToMicrocontroller) {
            window.mainJS.syncToMicrocontroller();
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
        // Remove all style classes
        this.wrapper.classList.remove('regularNode', 'SelectedNode', 'ActiveNode', 'ActiveandSelectedNode');
        // Add the class according to the node's status
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
        let duration = this.profileSettings.DelayBetweenRipples_ms || 1000;
        
        if (!Array.isArray(colors)) {
            colors = [colors];
        }
        
        if (typeof duration !== 'number') {
            duration = Number(duration);
        }
        
        if (colors.length === 0) {
            colors = ['#FF0000']
        }
        
        // Set the CSS variables for the animation
        colors.forEach((color, index) => {
            this.wrapper.style.setProperty(`--active-node-color-${index}`, color);
        });
        
        // If there are less than 6 colors, repeat the colors to fill the gaps
        for (let i = colors.length; i < 6; i++) {
            this.wrapper.style.setProperty(`--active-node-color-${i}`, colors[i % colors.length]);
        }
        
        // Set the duration
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
        //Set node 9 as active by default
        this.activateNodes([9])
    }

    getNode(id) {
        return this.nodes.find(node => node.id === id);
    }
    getSelectedNodes() {
        return this.selectedNodes;
    }
    getActiveNodes() {
        return this.activeNodes;
    }
    addActiveNode(node) {
        if (!this.activeNodes.includes(node)) {
            this.activeNodes.push(node);
        }
    }
    
    removeActiveNode(node) {
        this.activeNodes = this.activeNodes.filter(activeNode => activeNode !== node);
    }
    
    addSelectedNode(node){
           if (!this.selectedNodes.includes(node)){
               this.selectedNodes.push(node)
           }
    }
    removeSelectedNode(node){
         this.selectedNodes = this.selectedNodes.filter(selectedNode => selectedNode !== node)
    }
    selectNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                if (!this.selectedNodes.includes(node)) {
                    this.selectedNodes.push(node)
                }
                node.toggleSelect();
            }
        });
        if (window.modal) {
            console.log("Updating modal from NodeManager selectNodes"); // ADDED LOG
            window.modal.updateModalDisplay(this.selectedNodes.map(node => node.element), this.activeNodes.map(node => node.id))
        }
    }
    deselectNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                 this.selectedNodes = this.selectedNodes.filter(selectedNode => selectedNode !== node)
                node.deselect();
            }
        });
        if (window.modal) {
            console.log("Updating modal from NodeManager deselectNodes"); // ADDED LOG
            window.modal.updateModalDisplay(this.selectedNodes.map(node => node.element), this.activeNodes.map(node => node.id))
        }
    }
    activateNodes(ids) {
      this.nodes.forEach(node => {
           if (ids.includes(node.id)) {
                if (!this.activeNodes.includes(node)){
                   this.activeNodes.push(node)
                }
                node.activate();
            }
        });
    }
    deactivateNodes(ids) {
        this.nodes.forEach(node => {
            if (ids.includes(node.id)) {
                 this.activeNodes = this.activeNodes.filter(activeNode => activeNode !== node);
                node.deactivate();
            }
        });
    }
    deactivateAllNodes(){
        this.nodes.forEach(node => {
            this.activeNodes = [];
             node.deactivate();
         });
        this.selectedNodes = [];
        if (window.modal) {
            console.log("Updating modal from NodeManager deactivateAllNodes"); // ADDED LOG
            window.modal.updateModalDisplay(this.selectedNodes.map(node => node.element), this.activeNodes.map(node => node.id))
        }
    }
     updateStyles() {
        this.nodes.forEach(node => node.updateStyle());
    }
      deselectAllNodes(){ //Added method
         this.selectedNodes.forEach(node => node.deselect());
          this.selectedNodes = [];
    }
     toggleBiNodes() {
        this.toggleNodes(this.borderNodes);
    }
    
    toggleTriNodes() {
        this.toggleNodes(this.triNodes);
    }
    
    toggleQuadNodes() {
        this.toggleNodes(this.quadNodes);
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
    }
      selectAllActive() {
          this.selectNodes(this.activeNodes.map(node => node.id));
     }
}


let nodeManager;

function initNodeManager(updateNodeStyles, updateModal, profileSettings) {
    nodeManager = new NodeManager(profileSettings);
       // Event listeners for toggling node categories
    console.log('initNodeManager called') // ADDED LOG
    document.getElementById('toggleBiNodes').addEventListener('click', () => {
         console.log('toggleBiNodes button pressed') // ADDED LOG
          nodeManager.toggleBiNodes();
           updateNodeStyles(profileSettings);
           if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('toggleTriNodes').addEventListener('click', () => {
         console.log('toggleTriNodes button pressed') // ADDED LOG
        nodeManager.toggleTriNodes();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('toggleQuadNodes').addEventListener('click', () => {
         console.log('toggleQuadNodes button pressed') // ADDED LOG
        nodeManager.toggleQuadNodes();
        updateNodeStyles(profileSettings);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('deactivateAllNodes').addEventListener('click', () => {
          console.log('deactivateAllNodes button pressed') // ADDED LOG
         nodeManager.deactivateAllNodes()
        updateModal([], nodeManager.getActiveNodes().map(node => node.id), profileSettings, updateNodeStyles);
        if (window.mainJS && window.mainJS.syncToMicrocontroller) window.mainJS.syncToMicrocontroller();
    });
    document.getElementById('applyChanges').addEventListener('click', () => {
        console.log('Apply Changes button pressed');
        // Call the function to send the configuration to the microcontroller.
        window.mainJS.sendConfigurationToMicrocontroller();  // Access through window to avoid scope issues
    });
    
    document.getElementById('discardChanges').addEventListener('click', async () => {
        console.log('Discard Changes button pressed');
        // Use smart discard that handles both new and existing profiles
        if (window.mainJS && window.mainJS.smartDiscard) {
            await window.mainJS.smartDiscard();
        } else {
            // Fallback: just reset active nodes to default
            nodeManager.deactivateAllNodes();
            nodeManager.activateNodes([9]); // Default to node 9
            updateNodeStyles(profileSettings);
        }
    });
      updateNodeStyles(profileSettings);
}


//Functions to be used outside this module
function updateNodeStyles(profileSettings) {
    if (nodeManager) {
        nodeManager.profileSettings = profileSettings;
        nodeManager.updateStyles();
    }
}
function setActiveNodes(newActiveNodes) {
    if (nodeManager) {
        nodeManager.deactivateNodes(nodeManager.getActiveNodes().map(node => node.id))
        nodeManager.activateNodes(newActiveNodes)
    }
}
function getActiveNodes() {
     if (nodeManager) {
         return nodeManager.getActiveNodes().map(node => node.id)
     }
     return [];
}
export {
    initNodeManager,
    updateNodeStyles,
    setActiveNodes,
    getActiveNodes
};