// File: /js/managers/sequenceManager.js
// Sequence UI manager - handles dropdown, playback controls, and progress display

import eventBus, { Events } from '../core/eventBus.js';
import store from '../core/stateStore.js';
import effectSequencer from '../core/effectSequencer.js';
import { openSequenceEditorModal } from '../components/sequenceEditorModal.js';

/**
 * SequenceManager - manages the sequence panel UI
 * 
 * Handles:
 * - Sequence dropdown selection
 * - Playback controls (play/pause/stop/skip)
 * - Progress display and animation
 * - CRUD button events (delegated to modal)
 */
class SequenceManager {
    constructor() {
        // DOM elements
        this.sequenceDropdown = document.getElementById('sequenceDropdown');
        this.playButton = document.getElementById('playSequenceButton');
        this.pauseButton = document.getElementById('pauseSequenceButton');
        this.stopButton = document.getElementById('stopSequenceButton');
        this.prevButton = document.getElementById('prevStepButton');
        this.nextButton = document.getElementById('nextStepButton');
        this.addButton = document.getElementById('addSequenceButton');
        this.editButton = document.getElementById('editSequenceButton');
        this.deleteButton = document.getElementById('deleteSequenceButton');
        this.stepDisplay = document.getElementById('currentStepDisplay');
        this.progressBar = document.getElementById('stepProgress');
        this.sequencePanel = document.getElementById('sequencePanel');

        // Animation frame for progress updates
        this._progressAnimationFrame = null;

        this._init();
    }

    _init() {
        this._populateDropdown();
        this._bindEvents();
        this._subscribeToEvents();
        this._updatePlaybackUI();
    }

    // ===== DROPDOWN MANAGEMENT =====

    _populateDropdown() {
        if (!this.sequenceDropdown) return;

        this.sequenceDropdown.innerHTML = '';

        // Add "No sequence" option
        const noSeqOption = document.createElement('option');
        noSeqOption.value = '';
        noSeqOption.text = '-- No Sequence --';
        this.sequenceDropdown.add(noSeqOption);

        const sequences = store.sequences;
        const sortedKeys = Object.keys(sequences).sort((a, b) => parseInt(a) - parseInt(b));

        sortedKeys.forEach(seqId => {
            const option = document.createElement('option');
            option.value = seqId;
            option.text = sequences[seqId].name || `Sequence ${seqId}`;
            this.sequenceDropdown.add(option);
        });

        // Set current selection
        if (store.currentSequenceId !== null) {
            this.sequenceDropdown.value = store.currentSequenceId;
        } else {
            this.sequenceDropdown.value = '';
        }
    }

    // ===== EVENT BINDING =====

    _bindEvents() {
        // Sequence dropdown change
        this.sequenceDropdown?.addEventListener('change', () => {
            const value = this.sequenceDropdown.value;
            const sequenceId = value ? parseInt(value, 10) : null;
            store.setCurrentSequence(sequenceId);
            this._updatePlaybackUI();
        });

        // Playback controls
        this.playButton?.addEventListener('click', () => {
            if (effectSequencer.isPlaying) {
                if (effectSequencer.isPaused) {
                    effectSequencer.resume();
                }
            } else {
                effectSequencer.play();
            }
        });

        this.pauseButton?.addEventListener('click', () => {
            effectSequencer.pause();
        });

        this.stopButton?.addEventListener('click', () => {
            effectSequencer.stop();
        });

        this.prevButton?.addEventListener('click', () => {
            effectSequencer.previous();
        });

        this.nextButton?.addEventListener('click', () => {
            effectSequencer.next();
        });

        // CRUD buttons
        this.addButton?.addEventListener('click', () => {
            this._createNewSequence();
        });

        this.editButton?.addEventListener('click', () => {
            if (store.currentSequenceId !== null) {
                openSequenceEditorModal(store.currentSequenceId);
            }
        });

        this.deleteButton?.addEventListener('click', () => {
            this._deleteCurrentSequence();
        });
    }

    _subscribeToEvents() {
        // Sequence events
        eventBus.subscribe(Events.SEQUENCE_CREATED, () => {
            this._populateDropdown();
        });

        eventBus.subscribe(Events.SEQUENCE_UPDATED, () => {
            this._populateDropdown();
        });

        eventBus.subscribe(Events.SEQUENCE_DELETED, () => {
            this._populateDropdown();
            this._updatePlaybackUI();
        });

        eventBus.subscribe(Events.SEQUENCE_LOADED, ({ sequenceId }) => {
            if (this.sequenceDropdown) {
                this.sequenceDropdown.value = sequenceId !== null ? sequenceId : '';
            }
            this._updatePlaybackUI();
        });

        // Playback events
        eventBus.subscribe(Events.PLAYBACK_STARTED, () => {
            this._updatePlaybackUI();
            this._startProgressAnimation();
        });

        eventBus.subscribe(Events.PLAYBACK_PAUSED, () => {
            this._updatePlaybackUI();
            this._stopProgressAnimation();
        });

        eventBus.subscribe(Events.PLAYBACK_RESUMED, () => {
            this._updatePlaybackUI();
            this._startProgressAnimation();
        });

        eventBus.subscribe(Events.PLAYBACK_STOPPED, () => {
            this._updatePlaybackUI();
            this._stopProgressAnimation();
            this._resetProgress();
        });

        eventBus.subscribe(Events.PLAYBACK_STEP_CHANGED, ({ currentStep }) => {
            this._updateStepDisplay(currentStep);
        });

        eventBus.subscribe(Events.PLAYBACK_PROGRESS, ({ stepIndex, progress }) => {
            this._updateProgress(stepIndex, progress);
        });
    }

    // ===== UI UPDATES =====

    _updatePlaybackUI() {
        const isPlaying = effectSequencer.isPlaying;
        const isPaused = effectSequencer.isPaused;
        const hasSequence = store.currentSequenceId !== null;

        // Update button states
        if (this.playButton) {
            this.playButton.disabled = !hasSequence;
            this.playButton.textContent = isPlaying && !isPaused ? '▶' : '▶️';
            this.playButton.classList.toggle('playing', isPlaying && !isPaused);
        }

        if (this.pauseButton) {
            this.pauseButton.disabled = !isPlaying || isPaused;
            this.pauseButton.classList.toggle('paused', isPaused);
        }

        if (this.stopButton) {
            this.stopButton.disabled = !isPlaying;
        }

        if (this.prevButton) {
            this.prevButton.disabled = !isPlaying;
        }

        if (this.nextButton) {
            this.nextButton.disabled = !isPlaying;
        }

        if (this.editButton) {
            this.editButton.disabled = !hasSequence || isPlaying;
        }

        if (this.deleteButton) {
            this.deleteButton.disabled = !hasSequence || isPlaying;
        }

        // Update dropdown state
        if (this.sequenceDropdown) {
            this.sequenceDropdown.disabled = isPlaying;
        }

        // Update step display
        if (isPlaying) {
            this._updateStepDisplay(effectSequencer.currentStep);
        } else {
            this._resetProgress();
        }
    }

    _updateStepDisplay(stepIndex) {
        const sequence = store.currentSequence;
        if (!sequence || !this.stepDisplay) return;

        const step = sequence.steps[stepIndex];
        if (!step) return;

        const effectName = store.effects[step.effectId]?.name || `Effect ${step.effectId}`;
        this.stepDisplay.textContent = `Step ${stepIndex + 1}/${sequence.steps.length}: ${effectName}`;
    }

    _updateProgress(stepIndex, progress) {
        if (this.progressBar) {
            this.progressBar.value = progress * 100;
        }
    }

    _resetProgress() {
        if (this.stepDisplay) {
            this.stepDisplay.textContent = 'Step: --';
        }
        if (this.progressBar) {
            this.progressBar.value = 0;
        }
    }

    _startProgressAnimation() {
        this._stopProgressAnimation();
        
        const animate = () => {
            if (effectSequencer.isPlaying && !effectSequencer.isPaused) {
                this._updateProgress(effectSequencer.currentStep, effectSequencer.progress);
                this._progressAnimationFrame = requestAnimationFrame(animate);
            }
        };
        
        this._progressAnimationFrame = requestAnimationFrame(animate);
    }

    _stopProgressAnimation() {
        if (this._progressAnimationFrame) {
            cancelAnimationFrame(this._progressAnimationFrame);
            this._progressAnimationFrame = null;
        }
    }

    // ===== CRUD OPERATIONS =====

    _createNewSequence() {
        const name = prompt('Enter sequence name:', `Sequence ${Object.keys(store.sequences).length + 1}`);
        if (name && name.trim()) {
            const sequenceId = store.createSequence(name.trim());
            store.setCurrentSequence(sequenceId);
            // Optionally open editor immediately
            openSequenceEditorModal(sequenceId);
        }
    }

    _deleteCurrentSequence() {
        const currentSeq = store.currentSequence;
        if (!currentSeq) return;

        const confirmDelete = confirm(`Delete sequence "${currentSeq.name}"?`);
        if (confirmDelete) {
            store.deleteSequence(store.currentSequenceId);
        }
    }
}

// Singleton instance
let sequenceManager = null;

export function initSequenceManager() {
    // Only initialize if sequence panel exists
    if (document.getElementById('sequencePanel')) {
        sequenceManager = new SequenceManager();
    }
    return sequenceManager;
}

export function getSequenceManager() {
    return sequenceManager;
}

export default { initSequenceManager, getSequenceManager };
