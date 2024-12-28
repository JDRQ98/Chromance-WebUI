// File: /js/modalManager.js
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { setSelectedNodes, getActiveNodes } from './nodeManager.js';

let modalInputs = {};
// Function to update the modal based on the currently selected nodes
function updateModal(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles) {
    const selectedIds = selectedNodes.map(node => node.dataset.id);
    const display = document.getElementById('selectedNodesDisplay');
    const modal = document.getElementById('modal');
    const activateCheckbox = document.getElementById('activateNodeCheckbox');
    const modalSettings = document.querySelector('.modal-settings');

    //Update node display
    if (selectedIds.length > 0) {
        display.textContent = 'Selected Nodes: ' + selectedIds.join(', ');
    } else {
        display.textContent = 'No nodes selected';
    }
    // Check the state of the nodes for activation
    if (selectedIds.length === 1) {
        const selectedNodeId = selectedIds[0];
        if (activeNodes.includes(Number(selectedNodeId))) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.add('show');
        } else {
            activateCheckbox.checked = false;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.remove('show');
        }
        if (selectedNodes.length > 0) {
            loadNodeSettings(selectedNodes[0], nodeSpecificSettings, globalSettings);
        }
    } else if (selectedIds.length > 1) {
        const allActive = selectedIds.every(id => activeNodes.includes(Number(id)));
        if (allActive) {
            activateCheckbox.checked = true;
            activateCheckbox.indeterminate = false;
            modalSettings.classList.add('show');
        } else {
            const noneActive = selectedIds.every(id => !activeNodes.includes(Number(id)));
            if (noneActive) {
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = false;
                modalSettings.classList.remove('show');
            } else {
                activateCheckbox.checked = false;
                activateCheckbox.indeterminate = true;
                modalSettings.classList.remove('show');
            }
        }
        if (selectedNodes.length > 0) {
            loadNodeSettings(selectedNodes[0], nodeSpecificSettings, globalSettings);
        }
        disableModalInputs();
    } else {
        activateCheckbox.checked = false;
        activateCheckbox.indeterminate = false;
        disableModalInputs();
        modal.classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }
    if (selectedIds.length > 0 && !modal.classList.contains('show')) {
        openModal();
    }
}
// Function to load node specific settings into the modal
function loadNodeSettings(node, nodeSpecificSettings, globalSettings) {
    const nodeId = node.dataset.id;
    const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
    const selectedIds = selectedNodes.map(node => node.dataset.id);

    // Set values from global or node settings
    let desiredBehaviorValue = nodeSpecificSettings[nodeId]?.desiredBehavior ?? globalSettings.desiredBehavior;
    let rippleDirectionValue = nodeSpecificSettings[nodeId]?.rippleDirection ?? globalSettings.rippleDirection;
    let rippleDelayValue = nodeSpecificSettings[nodeId]?.rippleDelay ?? globalSettings.rippleDelay;
    let rippleLifeSpanValue = nodeSpecificSettings[nodeId]?.rippleLifeSpan ?? globalSettings.rippleLifeSpan;
    let rippleSpeedValue = nodeSpecificSettings[nodeId]?.rippleSpeed ?? globalSettings.rippleSpeed;
    let decayPerTickValue = nodeSpecificSettings[nodeId]?.decayPerTick ?? globalSettings.decayPerTick;
    let hueDeltaTickValue = nodeSpecificSettings[nodeId]?.hueDeltaTick ?? globalSettings.hueDeltaTick;
    // Load colors into swatches
    const colorContainer = document.getElementById('modalColorContainer');
    colorContainer.innerHTML = ''; // Clear existing swatches

    let colorsValue = [];
    if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty('startingColor')) {
        colorsValue = nodeSpecificSettings[nodeId].startingColor
    } else {
        colorsValue = globalSettings.colors;
    }
    if (typeof colorsValue === 'string') {
        colorsValue = [colorsValue];
    }
    if (!colorsValue) {
        colorsValue = [];
    }
    colorsValue.forEach(color => {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.classList.add('color-swatch');
        colorContainer.appendChild(colorInput);
    });
    // Set edit checkbox states based on node specific settings
    const modal = document.getElementById('modal');
    const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
    editCheckboxes.forEach(checkbox => {
        const setting = checkbox.dataset.setting;
        let allSame = true;
        if (selectedIds.length === 1) {
            if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                checkbox.checked = true;
                checkbox.indeterminate = false;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = false;
            }
        } else if (selectedIds.length > 1) {
            allSame = selectedIds.every(id => {
                if (nodeSpecificSettings[id] && nodeSpecificSettings[id].hasOwnProperty(setting)) {
                    return nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]][setting] === nodeSpecificSettings[id][setting];
                } else {
                    return !(nodeSpecificSettings[selectedIds[0]] && nodeSpecificSettings[selectedIds[0]].hasOwnProperty(setting));
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
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
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
                } else if (setting === 'hueDeltaTick') {
                    hueDeltaTickValue = 'N/A';
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
    setModalInputValue('hueDeltaTick', hueDeltaTickValue)
    // Disable/enable color buttons based on checkbox state
    const colorEditCheckbox = Array.from(editCheckboxes).find(checkbox => checkbox.dataset.setting === 'startingColor');
    if (colorEditCheckbox) {
        const colorButtons = document.querySelectorAll('.color-button-container button')
        colorButtons.forEach(button => {
            button.disabled = !colorEditCheckbox.checked
        })
    }

    //Add event listener to edit checkbox buttons
    editCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const setting = this.dataset.setting;
            if (this.checked) {
                enableModalInput(setting, nodeId);
            } else {
                disableModalInput(setting, nodeId);
            }
            // Disable/enable color buttons based on checkbox state
            if (setting === 'startingColor') {
                const colorButtons = document.querySelectorAll('.color-button-container button')
                colorButtons.forEach(button => {
                    button.disabled = !this.checked
                })
            }
        });
    });
    modal.classList.add('show')
    document.getElementById('overlay').classList.add('show');
}
// Cache the modal input elements
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
        modalHueDeltaTick: modal.querySelector('#modalHueDeltaTick'),
    };
    // Add input listeners to the range elements to update the span elements
    modalInputs.modalRippleSpeed.addEventListener('input', () => {
        modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(modalInputs.modalRippleSpeed.value).toFixed(2);
    });
    modalInputs.modalDecayPerTick.addEventListener('input', () => {
        modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(modalInputs.modalDecayPerTick.value).toFixed(3);
    });
}
// Helper function to set values in modal input elements
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
//Helper function to get values from modal input elements
function getModalInputValue(setting) {
    return modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`]?.value;
}
// Helper function to enable modal input elements
function enableModalInput(setting, nodeId) {
    const inputElement = modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
    if (inputElement) {
        inputElement.disabled = false;
        if (setting === 'rippleSpeed') {
            modalInputs.modalRippleSpeedDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(2);
        }
        if (setting === 'decayPerTick') {
            modalInputs.modalDecayPerTickDisplay.textContent = parseFloat(getModalInputValue(setting)).toFixed(3);
        }
    }
}
// Helper function to disable modal input elements
function disableModalInput(setting, nodeId) {
    const inputElement = modalInputs[`modal${setting.charAt(0).toUpperCase() + setting.slice(1)}`];
    if (inputElement) {
        inputElement.disabled = true;
        if (nodeSpecificSettings[nodeId] && nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
            delete nodeSpecificSettings[nodeId][setting];
        }
    }
}
// Helper function to disable all modal input elements
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
    // Disable color buttons
    const colorButtons = document.querySelectorAll('.color-button-container button')
    colorButtons.forEach(button => {
        button.disabled = true
    })
}
// Function to save node settings
function saveNodeSettings(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles, updateCurrentEffect, setActiveNodes) {
    let newActiveNodes = [...activeNodes];
    selectedNodes.forEach(node => {
        const nodeId = node.dataset.id;
        const activateCheckbox = document.getElementById('activateNodeCheckbox');
        const nodeIdNumber = Number(nodeId);
        if (activateCheckbox.checked) {
            if (!newActiveNodes.includes(nodeIdNumber)) {
                newActiveNodes.push(nodeIdNumber);
            }
        } else {
            newActiveNodes = newActiveNodes.filter(activeNodeId => activeNodeId !== nodeIdNumber);
        }
        const modal = document.getElementById('modal');
        const editCheckboxes = modal.querySelectorAll('.edit-button-checkbox');
        let hasSettings = false;
        editCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const setting = checkbox.dataset.setting;
                if (!nodeSpecificSettings[nodeId]) {
                    nodeSpecificSettings[nodeId] = {};
                }
                if (setting === 'startingColor') {
                    nodeSpecificSettings[nodeId][setting] = Array.from(document.querySelectorAll('#modalColorContainer input')).map(input => input.value);
                } else {
                    nodeSpecificSettings[nodeId][setting] = getModalInputValue(setting);
                }
                hasSettings = true;
            } else if (nodeSpecificSettings[nodeId]) {
                const setting = checkbox.dataset.setting;
                if (nodeSpecificSettings[nodeId].hasOwnProperty(setting)) {
                    delete nodeSpecificSettings[nodeId][setting]
                }
            }
        });
        if (!hasSettings && nodeSpecificSettings[nodeId]) {
            delete nodeSpecificSettings[nodeId];
        }
    });
    setActiveNodes(newActiveNodes);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, newActiveNodes);
}
// Function to discard node settings
function discardNodeSettings(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles, updateCurrentEffect, setActiveNodes) {
    let newActiveNodes = [...activeNodes];
    selectedNodes.forEach(node => {
        const nodeId = node.dataset.id;
        const activateCheckbox = document.getElementById('activateNodeCheckbox');
        const nodeIdNumber = Number(nodeId);
        if (activateCheckbox.checked) {
            if (!newActiveNodes.includes(nodeIdNumber)) {
                newActiveNodes.push(nodeIdNumber);
            }
        } else {
            newActiveNodes = newActiveNodes.filter(activeNodeId => activeNodeId !== nodeIdNumber);
        }
        if (nodeSpecificSettings[nodeId]) {
            loadNodeSettings(node, nodeSpecificSettings, globalSettings)
        } else {
            delete nodeSpecificSettings[nodeId];
            loadNodeSettings(node, nodeSpecificSettings, globalSettings);
        }
    });
    setActiveNodes(newActiveNodes);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, newActiveNodes);
}
// Function to open the modal
function openModal() {
    document.getElementById('modal').classList.add('show');
    document.getElementById('overlay').classList.add('show');
}
// Function to close the modal
function closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect, setActiveNodes) {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('overlay').classList.remove('show');
    const newSelectedNodes = [];
    setSelectedNodes(newSelectedNodes);
    updateModal([], getActiveNodes(), nodeSpecificSettings, globalSettings, updateNodeStyles);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateCurrentEffect(globalSettings, nodeSpecificSettings, getActiveNodes(), setActiveNodes);
}
// Function to initialize the modal manager
function initModalManager(activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles, updateModal, updateCurrentEffect, setActiveNodes, getActiveNodes) {
    // Cache modal inputs
    cacheModalInputs();
    // Add listener to the close modal button
    const closeModalButton = document.getElementById('closeModalButton');
    closeModalButton.addEventListener('click', () => {
        const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
        closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect, setActiveNodes);
    });
    // Add listener for closing the modal with ESC key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
            closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect, setActiveNodes);
        }
    });
    // Add listener to the activate node checkbox
    document.getElementById('activateNodeCheckbox').addEventListener('change', function () {
        const modalSettings = document.querySelector('.modal-settings');
        const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
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
        saveNodeSettings(selectedNodes, activeNodes, nodeSpecificSettings, globalSettings, updateNodeStyles, updateCurrentEffect, setActiveNodes);

    });
    const saveNodeButton = document.getElementById('saveNodeButton');
    const discardNodeButton = document.getElementById('discardNodeButton');
    saveNodeButton.addEventListener('click', function () {
        const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
        saveNodeSettings(selectedNodes, getActiveNodes(), nodeSpecificSettings, globalSettings, updateNodeStyles, updateCurrentEffect, setActiveNodes);
        closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect, setActiveNodes);
    });
    discardNodeButton.addEventListener('click', function () {
        const selectedNodes = Array.from(document.querySelectorAll('.hex')).filter(node => node.closest('.hex-wrap').classList.contains('SelectedNode') || node.closest('.hex-wrap').classList.contains('ActiveandSelectedNode'));
        discardNodeSettings(selectedNodes, getActiveNodes(), nodeSpecificSettings, globalSettings, updateNodeStyles, updateCurrentEffect, setActiveNodes);
        closeModal(selectedNodes, updateNodeStyles, updateModal, globalSettings, nodeSpecificSettings, updateCurrentEffect, setActiveNodes);
    });
    // Add logic for adding more modal colors
    const addModalColorButton = document.getElementById('addModalColorButton');
    const modalColorContainer = document.getElementById('modalColorContainer');
    addModalColorButton.addEventListener('click', () => {
        if (modalColorContainer.children.length < 25) {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = '#ffffff'; // Default color
            colorInput.classList.add('color-swatch');
            // Add the event listener here
            colorInput.addEventListener('click', function () {
                this.showPicker();
            });
            modalColorContainer.appendChild(colorInput);
        }
    });
    // Add logic for removing modal colors
    const removeModalColorButton = document.getElementById('removeModalColorButton');
    removeModalColorButton.addEventListener('click', () => {
        if (modalColorContainer.children.length > 1) {
            modalColorContainer.removeChild(modalColorContainer.lastChild);
        }
    });
    // Add logic for rainbow modal colors button
    const modalRainbowButton = document.getElementById('modalRainbowButton');
    modalRainbowButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const rainbowColors = generateRainbowColors(colorCount);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        rainbowColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            // Add the event listener here
            colorInput.addEventListener('click', function () {
                this.showPicker();
            });
            colorContainer.appendChild(colorInput);
        });
    });
    // Add logic for random modal colors button
    const modalRandomButton = document.getElementById('modalRandomButton');
    modalRandomButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const randomColors = generateRandomColors(colorCount);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        randomColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            // Add the event listener here
            colorInput.addEventListener('click', function () {
                this.showPicker();
            });
            colorContainer.appendChild(colorInput);
        });
    });
    // Add logic for similar modal colors button
    const modalSimilarButton = document.getElementById('modalSimilarButton');
    modalSimilarButton.addEventListener('click', () => {
        const colorCount = document.querySelectorAll('#modalColorContainer input').length;
        const firstColor = document.querySelector('#modalColorContainer input')?.value;
        const similarColors = generateSimilarColors(colorCount, firstColor);
        const colorContainer = document.getElementById('modalColorContainer');
        colorContainer.innerHTML = ''; // Clear existing swatches
        similarColors.forEach(color => {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.classList.add('color-swatch');
            // Add the event listener here
            colorInput.addEventListener('click', function () {
                this.showPicker();
            });
            colorContainer.appendChild(colorInput);
        });
    });
}
export { initModalManager, updateModal, modalInputs, openModal, closeModal };