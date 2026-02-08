// File: /js/components/sequenceEditorModal.js
// Sequence editor modal - create and edit sequences with step management

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';

/**
 * SequenceEditorModal - Modal for editing sequence properties and steps
 * 
 * Features:
 * - Sequence name editing
 * - Step list with add/remove/reorder
 * - Per-step effect selection, duration, and transition settings
 * - Loop and shuffle options
 * - Drag-and-drop step reordering
 */

let currentModal = null;
let currentSequenceId = null;
let editingSteps = [];  // Working copy of steps

/**
 * Open the sequence editor modal
 * @param {number} sequenceId - ID of sequence to edit
 */
export function openSequenceEditorModal(sequenceId) {
    const sequence = store.sequences[sequenceId];
    if (!sequence) {
        console.warn('Sequence not found:', sequenceId);
        return;
    }

    currentSequenceId = sequenceId;
    editingSteps = JSON.parse(JSON.stringify(sequence.steps));

    _createModal(sequence);
    _showModal();
}

/**
 * Close the sequence editor modal
 */
export function closeSequenceEditorModal() {
    _hideModal();
    _destroyModal();
    currentSequenceId = null;
    editingSteps = [];
}

// ===== MODAL CREATION =====

function _createModal(sequence) {
    _destroyModal();

    const modal = document.createElement('div');
    modal.id = 'sequenceEditorModal';
    modal.className = 'sequence-editor-modal modal';
    
    modal.innerHTML = `
        <div class="modal-content sequence-editor-content">
            <h2>Edit Sequence</h2>
            
            <div class="setting">
                <label for="seqEditorNameInput">Sequence Name:</label>
                <input type="text" id="seqEditorNameInput" value="${_escapeHtml(sequence.name)}" placeholder="Sequence name">
            </div>
            
            <div class="sequence-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="seqEditorLoopCheckbox" ${sequence.loop ? 'checked' : ''}>
                    Loop sequence
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="seqEditorShuffleCheckbox" ${sequence.shuffleOnLoop ? 'checked' : ''}>
                    Shuffle on loop
                </label>
            </div>
            
            <div class="step-list-header">
                <h3>Steps</h3>
                <button id="seqEditorAddStepButton" class="add-step-button" title="Add Step">+</button>
            </div>
            
            <div id="seqEditorStepList" class="step-list">
                <!-- Steps rendered dynamically -->
            </div>
            
            <div class="modal-buttons">
                <button id="seqEditorSaveButton" class="primary-button">Save</button>
                <button id="seqEditorCancelButton">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    currentModal = modal;

    _renderSteps();
    _bindModalEvents();
}

function _destroyModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
    }
}

function _showModal() {
    if (currentModal) {
        currentModal.classList.add('show');
        document.getElementById('overlay')?.classList.add('show');
    }
}

function _hideModal() {
    if (currentModal) {
        currentModal.classList.remove('show');
        document.getElementById('overlay')?.classList.remove('show');
    }
}

// ===== STEP RENDERING =====

function _renderSteps() {
    const stepList = document.getElementById('seqEditorStepList');
    if (!stepList) return;

    stepList.innerHTML = '';

    editingSteps.forEach((step, index) => {
        const stepEl = _createStepElement(step, index);
        stepList.appendChild(stepEl);
    });

    // Setup drag-and-drop
    _setupDragAndDrop(stepList);
}

function _createStepElement(step, index) {
    const stepEl = document.createElement('div');
    stepEl.className = 'sequence-step';
    stepEl.dataset.stepIndex = index;
    stepEl.draggable = true;

    const effects = store.effects;
    const effectOptions = Object.keys(effects)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => {
            const selected = parseInt(id) === step.effectId ? 'selected' : '';
            return `<option value="${id}" ${selected}>${_escapeHtml(effects[id].name || `Effect ${id}`)}</option>`;
        })
        .join('');

    stepEl.innerHTML = `
        <span class="step-drag-handle" title="Drag to reorder">≡</span>
        <span class="step-number">${index + 1}</span>
        
        <div class="step-settings">
            <div class="step-row">
                <label>Effect:</label>
                <select class="step-effect-select" data-field="effectId">
                    ${effectOptions}
                </select>
            </div>
            
            <div class="step-row">
                <label>Duration (ms):</label>
                <input type="number" class="step-duration" data-field="duration" 
                    min="500" max="60000" value="${step.duration}" placeholder="5000">
            </div>
            
            <div class="step-row">
                <label>Transition:</label>
                <select class="step-transition" data-field="transitionType">
                    <option value="instant" ${step.transitionType === 'instant' ? 'selected' : ''}>Instant</option>
                    <option value="fadeIn" ${step.transitionType === 'fadeIn' ? 'selected' : ''}>Fade In</option>
                    <option value="fadeOut" ${step.transitionType === 'fadeOut' ? 'selected' : ''}>Fade Out</option>
                    <option value="crossfade" ${step.transitionType === 'crossfade' ? 'selected' : ''}>Crossfade</option>
                </select>
            </div>
            
            <div class="step-row transition-duration-row" style="${step.transitionType === 'instant' ? 'display: none;' : ''}">
                <label>Transition (ms):</label>
                <input type="number" class="step-transition-duration" data-field="transitionDuration" 
                    min="0" max="5000" value="${step.transitionDuration || 500}" placeholder="500">
            </div>
        </div>
        
        <button class="remove-step-button" title="Remove step" ${editingSteps.length <= 1 ? 'disabled' : ''}>×</button>
    `;

    // Bind step-specific events
    _bindStepEvents(stepEl, index);

    return stepEl;
}

function _bindStepEvents(stepEl, index) {
    // Effect change
    const effectSelect = stepEl.querySelector('.step-effect-select');
    effectSelect?.addEventListener('change', (e) => {
        editingSteps[index].effectId = parseInt(e.target.value, 10);
    });

    // Duration change
    const durationInput = stepEl.querySelector('.step-duration');
    durationInput?.addEventListener('change', (e) => {
        editingSteps[index].duration = Math.max(500, Math.min(60000, parseInt(e.target.value, 10) || 5000));
        e.target.value = editingSteps[index].duration;
    });

    // Transition type change
    const transitionSelect = stepEl.querySelector('.step-transition');
    transitionSelect?.addEventListener('change', (e) => {
        editingSteps[index].transitionType = e.target.value;
        
        // Show/hide transition duration
        const durationRow = stepEl.querySelector('.transition-duration-row');
        if (durationRow) {
            durationRow.style.display = e.target.value === 'instant' ? 'none' : '';
        }
    });

    // Transition duration change
    const transitionDurationInput = stepEl.querySelector('.step-transition-duration');
    transitionDurationInput?.addEventListener('change', (e) => {
        editingSteps[index].transitionDuration = Math.max(0, Math.min(5000, parseInt(e.target.value, 10) || 500));
        e.target.value = editingSteps[index].transitionDuration;
    });

    // Remove step
    const removeButton = stepEl.querySelector('.remove-step-button');
    removeButton?.addEventListener('click', () => {
        if (editingSteps.length > 1) {
            editingSteps.splice(index, 1);
            _renderSteps();
        }
    });
}

// ===== DRAG AND DROP =====

function _setupDragAndDrop(stepList) {
    let draggedEl = null;
    let draggedIndex = -1;

    stepList.querySelectorAll('.sequence-step').forEach(stepEl => {
        stepEl.addEventListener('dragstart', (e) => {
            draggedEl = stepEl;
            draggedIndex = parseInt(stepEl.dataset.stepIndex, 10);
            stepEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        stepEl.addEventListener('dragend', () => {
            stepEl.classList.remove('dragging');
            draggedEl = null;
            draggedIndex = -1;
            
            // Remove all drag-over indicators
            stepList.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });

        stepEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedEl && stepEl !== draggedEl) {
                stepEl.classList.add('drag-over');
            }
        });

        stepEl.addEventListener('dragleave', () => {
            stepEl.classList.remove('drag-over');
        });

        stepEl.addEventListener('drop', (e) => {
            e.preventDefault();
            stepEl.classList.remove('drag-over');
            
            if (draggedEl && stepEl !== draggedEl) {
                const targetIndex = parseInt(stepEl.dataset.stepIndex, 10);
                
                // Reorder steps
                const [removed] = editingSteps.splice(draggedIndex, 1);
                editingSteps.splice(targetIndex, 0, removed);
                
                _renderSteps();
            }
        });
    });
}

// ===== MODAL EVENTS =====

function _bindModalEvents() {
    // Add step button
    document.getElementById('seqEditorAddStepButton')?.addEventListener('click', () => {
        _addStep();
    });

    // Save button
    document.getElementById('seqEditorSaveButton')?.addEventListener('click', () => {
        _saveSequence();
    });

    // Cancel button
    document.getElementById('seqEditorCancelButton')?.addEventListener('click', () => {
        closeSequenceEditorModal();
    });

    // Close on Escape
    currentModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSequenceEditorModal();
        }
    });

    // Close on overlay click
    const overlay = document.getElementById('overlay');
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay && currentModal?.classList.contains('show')) {
            closeSequenceEditorModal();
        }
    });
}

function _addStep() {
    // Create new step with first available effect
    const effectIds = Object.keys(store.effects);
    const defaultEffectId = effectIds.length > 0 ? parseInt(effectIds[0], 10) : 1;

    editingSteps.push({
        effectId: defaultEffectId,
        duration: 5000,
        transitionType: 'instant',
        transitionDuration: 500
    });

    _renderSteps();

    // Scroll to new step
    const stepList = document.getElementById('seqEditorStepList');
    if (stepList) {
        stepList.scrollTop = stepList.scrollHeight;
    }
}

function _saveSequence() {
    if (currentSequenceId === null) return;

    // Get updated name
    const nameInput = document.getElementById('seqEditorNameInput');
    const name = nameInput?.value.trim() || 'Unnamed Sequence';

    // Get options
    const loopCheckbox = document.getElementById('seqEditorLoopCheckbox');
    const shuffleCheckbox = document.getElementById('seqEditorShuffleCheckbox');
    const loop = loopCheckbox?.checked ?? true;
    const shuffleOnLoop = shuffleCheckbox?.checked ?? false;

    // Validate steps
    if (editingSteps.length === 0) {
        alert('Sequence must have at least one step.');
        return;
    }

    // Update sequence in store
    store.updateSequence(currentSequenceId, {
        name,
        steps: editingSteps,
        loop,
        shuffleOnLoop
    });

    closeSequenceEditorModal();
}

// ===== UTILITIES =====

function _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export default { openSequenceEditorModal, closeSequenceEditorModal };
