// File: /js/core/stateStore.js
// Centralized state management with automatic event publishing

import eventBus, { Events } from './eventBus.js';
import { generateRainbowColors } from '../colorUtils.js';

const defaultGlobalSettings = {
    effectBasis: 'ripple',
    effectDuration: 3000,
    desiredBehavior: 'normal',
    rippleDirection: 'allDirections',
    rippleDelay: 3000,
    rippleLifeSpan: 3000,
    rippleSpeed: 0.5,
    decayPerTick: 0.985,
    hueDeltaTick: 200,
    numberOfRipples: 1,
    colors: generateRainbowColors(7)
};

const defaultEffect = {
    name: 'Default',
    globalSettings: { ...defaultGlobalSettings },
    nodeSpecificSettings: {},
    activeNodes: [9]
};

// Default sequence step structure
const defaultSequenceStep = {
    effectId: 1,
    duration: 5000,              // 5 seconds per step
    transitionType: 'instant',   // 'instant', 'fadeIn', 'fadeOut', 'crossfade'
    transitionDuration: 500      // Transition time in ms
};

// Default sequence structure
const defaultSequence = {
    name: 'Default Sequence',
    steps: [{ ...defaultSequenceStep }],
    loop: true,
    shuffleOnLoop: false
};

// Playback state structure
const defaultPlaybackState = {
    isPlaying: false,
    isPaused: false,
    currentSequenceId: null,
    currentStepIndex: 0,
    stepStartTime: null,
    elapsedTime: 0,
    inTransition: false
};

class StateStore {
    constructor() {
        this._state = {
            globalSettings: { ...defaultGlobalSettings },
            nodeSpecificSettings: {},
            activeNodes: [9],
            selectedNodes: [],
            effects: {},
            currentEffectId: 1,
            nextEffectId: 2,
            wsConnected: false,
            // Sequence state
            sequences: {},
            currentSequenceId: null,
            nextSequenceId: 1,
            playbackState: { ...defaultPlaybackState }
        };

        this._loadFromStorage();
    }

    _loadFromStorage() {
        try {
            const storedEffects = localStorage.getItem('effects');
            if (storedEffects) {
                this._state.effects = JSON.parse(storedEffects);
                const keys = Object.keys(this._state.effects).map(Number);
                if (keys.length > 0) {
                    this._state.nextEffectId = Math.max(...keys) + 1;
                }
            } else {
                this._state.effects = { 1: { ...defaultEffect } };
                this._saveEffectsToStorage();
            }

            const storedCurrentEffectId = localStorage.getItem('currentEffectId');
            if (storedCurrentEffectId) {
                this._state.currentEffectId = parseInt(storedCurrentEffectId, 10);
            }

            // Load sequences
            const storedSequences = localStorage.getItem('sequences');
            if (storedSequences) {
                this._state.sequences = JSON.parse(storedSequences);
                const seqKeys = Object.keys(this._state.sequences).map(Number);
                if (seqKeys.length > 0) {
                    this._state.nextSequenceId = Math.max(...seqKeys) + 1;
                }
            }

            const storedCurrentSequenceId = localStorage.getItem('currentSequenceId');
            if (storedCurrentSequenceId) {
                this._state.currentSequenceId = parseInt(storedCurrentSequenceId, 10);
            }

            // Load current effect's settings
            this._loadCurrentEffectSettings();
        } catch (error) {
            console.error('Error loading state from storage:', error);
            this._state.effects = { 1: { ...defaultEffect } };
        }
    }

    _loadCurrentEffectSettings() {
        const currentEffect = this._state.effects[this._state.currentEffectId];
        if (currentEffect) {
            this._state.globalSettings = this._deepClone(currentEffect.globalSettings);
            this._state.nodeSpecificSettings = this._deepClone(currentEffect.nodeSpecificSettings || {});
            this._state.activeNodes = [...(currentEffect.activeNodes || [9])];
        }
    }

    _saveEffectsToStorage() {
        localStorage.setItem('effects', JSON.stringify(this._state.effects));
    }

    _saveCurrentEffectIdToStorage() {
        localStorage.setItem('currentEffectId', String(this._state.currentEffectId));
    }

    _saveSequencesToStorage() {
        localStorage.setItem('sequences', JSON.stringify(this._state.sequences));
    }

    _saveCurrentSequenceIdToStorage() {
        if (this._state.currentSequenceId !== null) {
            localStorage.setItem('currentSequenceId', String(this._state.currentSequenceId));
        } else {
            localStorage.removeItem('currentSequenceId');
        }
    }

    _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // Getters
    get globalSettings() {
        return this._state.globalSettings;
    }

    get nodeSpecificSettings() {
        return this._state.nodeSpecificSettings;
    }

    get activeNodes() {
        return [...this._state.activeNodes];
    }

    get selectedNodes() {
        return [...this._state.selectedNodes];
    }

    get effects() {
        return this._state.effects;
    }

    get currentEffectId() {
        return this._state.currentEffectId;
    }

    get currentEffect() {
        return this._state.effects[this._state.currentEffectId];
    }

    get wsConnected() {
        return this._state.wsConnected;
    }

    // Sequence getters
    get sequences() {
        return this._state.sequences;
    }

    get currentSequenceId() {
        return this._state.currentSequenceId;
    }

    get currentSequence() {
        return this._state.currentSequenceId !== null
            ? this._state.sequences[this._state.currentSequenceId]
            : null;
    }

    get playbackState() {
        return { ...this._state.playbackState };
    }

    get isPlaying() {
        return this._state.playbackState.isPlaying;
    }

    get isPaused() {
        return this._state.playbackState.isPaused;
    }

    // Setters with automatic event publishing
    setGlobalSettings(settings) {
        const oldSettings = this._state.globalSettings;
        this._state.globalSettings = { ...oldSettings, ...settings };
        this._updateCurrentEffectSettings();
        eventBus.publish(Events.SETTINGS_CHANGED, {
            type: 'global',
            settings: this._state.globalSettings,
            changed: settings
        });
    }

    setNodeSpecificSettings(nodeId, settings) {
        if (!this._state.nodeSpecificSettings[nodeId]) {
            this._state.nodeSpecificSettings[nodeId] = {};
        }

        if (settings === null) {
            delete this._state.nodeSpecificSettings[nodeId];
        } else {
            this._state.nodeSpecificSettings[nodeId] = {
                ...this._state.nodeSpecificSettings[nodeId],
                ...settings
            };
        }

        this._updateCurrentEffectSettings();
        eventBus.publish(Events.SETTINGS_CHANGED, {
            type: 'node',
            nodeId,
            settings: this._state.nodeSpecificSettings[nodeId]
        });
    }

    deleteNodeSetting(nodeId, settingKey) {
        if (this._state.nodeSpecificSettings[nodeId]) {
            delete this._state.nodeSpecificSettings[nodeId][settingKey];
            if (Object.keys(this._state.nodeSpecificSettings[nodeId]).length === 0) {
                delete this._state.nodeSpecificSettings[nodeId];
            }
            this._updateCurrentEffectSettings();
        }
    }

    setActiveNodes(nodeIds) {
        const oldNodes = [...this._state.activeNodes];
        this._state.activeNodes = [...nodeIds];
        this._updateCurrentEffectSettings();

        const activated = nodeIds.filter(id => !oldNodes.includes(id));
        const deactivated = oldNodes.filter(id => !nodeIds.includes(id));

        if (activated.length > 0) {
            eventBus.publish(Events.NODES_ACTIVATED, { nodeIds: activated });
        }
        if (deactivated.length > 0) {
            eventBus.publish(Events.NODES_DEACTIVATED, { nodeIds: deactivated });
        }
    }

    activateNode(nodeId) {
        if (!this._state.activeNodes.includes(nodeId)) {
            this._state.activeNodes.push(nodeId);
            this._updateCurrentEffectSettings();
            eventBus.publish(Events.NODES_ACTIVATED, { nodeIds: [nodeId] });
        }
    }

    deactivateNode(nodeId) {
        const index = this._state.activeNodes.indexOf(nodeId);
        if (index > -1) {
            this._state.activeNodes.splice(index, 1);
            this._updateCurrentEffectSettings();
            eventBus.publish(Events.NODES_DEACTIVATED, { nodeIds: [nodeId] });
        }
    }

    setSelectedNodes(nodeIds) {
        const oldSelected = [...this._state.selectedNodes];
        this._state.selectedNodes = [...nodeIds];

        eventBus.publish(Events.NODES_SELECTED, {
            nodeIds: this._state.selectedNodes,
            previousNodeIds: oldSelected
        });
    }

    addSelectedNode(nodeId) {
        if (!this._state.selectedNodes.includes(nodeId)) {
            this._state.selectedNodes.push(nodeId);
            eventBus.publish(Events.NODES_SELECTED, {
                nodeIds: this._state.selectedNodes,
                added: [nodeId]
            });
        }
    }

    removeSelectedNode(nodeId) {
        const index = this._state.selectedNodes.indexOf(nodeId);
        if (index > -1) {
            this._state.selectedNodes.splice(index, 1);
            eventBus.publish(Events.NODES_DESELECTED, {
                nodeIds: this._state.selectedNodes,
                removed: [nodeId]
            });
        }
    }

    clearSelectedNodes() {
        const oldSelected = [...this._state.selectedNodes];
        this._state.selectedNodes = [];
        if (oldSelected.length > 0) {
            eventBus.publish(Events.NODES_DESELECTED, {
                nodeIds: [],
                removed: oldSelected
            });
        }
    }

    // Effect management
    setCurrentEffect(effectId) {
        if (this._state.effects[effectId]) {
            this._state.currentEffectId = effectId;
            this._loadCurrentEffectSettings();
            this._saveCurrentEffectIdToStorage();
            eventBus.publish(Events.EFFECT_LOADED, {
                effectId,
                effect: this._state.effects[effectId]
            });
        }
    }

    _updateCurrentEffectSettings() {
        if (this._state.effects[this._state.currentEffectId]) {
            this._state.effects[this._state.currentEffectId] = {
                ...this._state.effects[this._state.currentEffectId],
                globalSettings: this._deepClone(this._state.globalSettings),
                nodeSpecificSettings: this._deepClone(this._state.nodeSpecificSettings),
                activeNodes: [...this._state.activeNodes]
            };
            this._saveEffectsToStorage();
        }
    }

    createEffect(name) {
        const effectId = this._state.nextEffectId;
        this._state.effects[effectId] = {
            name,
            globalSettings: this._deepClone(defaultGlobalSettings),
            nodeSpecificSettings: {},
            activeNodes: [9]
        };
        this._state.nextEffectId++;
        this._saveEffectsToStorage();

        eventBus.publish(Events.EFFECT_SAVED, {
            effectId,
            effect: this._state.effects[effectId],
            isNew: true
        });

        return effectId;
    }

    updateEffectName(effectId, name) {
        if (this._state.effects[effectId]) {
            this._state.effects[effectId].name = name;
            this._saveEffectsToStorage();
            eventBus.publish(Events.EFFECT_SAVED, {
                effectId,
                effect: this._state.effects[effectId]
            });
        }
    }

    deleteEffect(effectId) {
        if (this._state.effects[effectId]) {
            delete this._state.effects[effectId];

            const remainingKeys = Object.keys(this._state.effects);
            if (remainingKeys.length === 0) {
                this._state.effects = { 1: this._deepClone(defaultEffect) };
                this._state.currentEffectId = 1;
                this._state.nextEffectId = 2;
            } else if (String(this._state.currentEffectId) === String(effectId)) {
                this._state.currentEffectId = parseInt(remainingKeys[0], 10);
            }

            this._saveEffectsToStorage();
            this._loadCurrentEffectSettings();

            eventBus.publish(Events.EFFECT_DELETED, { effectId });
        }
    }

    resetToDefaults() {
        this._state.globalSettings = this._deepClone(defaultGlobalSettings);
        this._state.nodeSpecificSettings = {};
        this._state.activeNodes = [9];
        this._updateCurrentEffectSettings();
        eventBus.publish(Events.SETTINGS_CHANGED, { type: 'reset' });
    }

    setWsConnected(connected) {
        this._state.wsConnected = connected;
        eventBus.publish(connected ? Events.WS_CONNECTED : Events.WS_DISCONNECTED, {});
    }

    // Get configuration for sending to microcontroller
    getConfiguration() {
        return {
            globalSettings: this._deepClone(this._state.globalSettings),
            activeNodes: [...this._state.activeNodes],
            nodeSpecificSettings: this._deepClone(this._state.nodeSpecificSettings)
        };
    }

    // Create a snapshot for modal undo functionality
    createSnapshot() {
        return {
            activeNodes: [...this._state.activeNodes],
            nodeSpecificSettings: this._deepClone(this._state.nodeSpecificSettings)
        };
    }

    restoreSnapshot(snapshot) {
        this._state.activeNodes = [...snapshot.activeNodes];
        this._state.nodeSpecificSettings = this._deepClone(snapshot.nodeSpecificSettings);
        this._updateCurrentEffectSettings();
        eventBus.publish(Events.SETTINGS_CHANGED, { type: 'restored' });
    }

    // ===== SEQUENCE MANAGEMENT =====

    createSequence(name) {
        const sequenceId = this._state.nextSequenceId;
        this._state.sequences[sequenceId] = {
            name,
            steps: [this._deepClone(defaultSequenceStep)],
            loop: true,
            shuffleOnLoop: false
        };
        this._state.nextSequenceId++;
        this._saveSequencesToStorage();

        eventBus.publish(Events.SEQUENCE_CREATED, {
            sequenceId,
            sequence: this._state.sequences[sequenceId]
        });

        return sequenceId;
    }

    setCurrentSequence(sequenceId) {
        if (sequenceId === null || this._state.sequences[sequenceId]) {
            this._state.currentSequenceId = sequenceId;
            this._saveCurrentSequenceIdToStorage();
            eventBus.publish(Events.SEQUENCE_LOADED, {
                sequenceId,
                sequence: sequenceId !== null ? this._state.sequences[sequenceId] : null
            });
        }
    }

    updateSequence(sequenceId, updates) {
        if (this._state.sequences[sequenceId]) {
            this._state.sequences[sequenceId] = {
                ...this._state.sequences[sequenceId],
                ...updates
            };
            this._saveSequencesToStorage();
            eventBus.publish(Events.SEQUENCE_UPDATED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
        }
    }

    updateSequenceName(sequenceId, name) {
        this.updateSequence(sequenceId, { name });
    }

    updateSequenceSteps(sequenceId, steps) {
        this.updateSequence(sequenceId, { steps: this._deepClone(steps) });
    }

    addSequenceStep(sequenceId, step = null) {
        if (this._state.sequences[sequenceId]) {
            const newStep = step ? this._deepClone(step) : this._deepClone(defaultSequenceStep);
            this._state.sequences[sequenceId].steps.push(newStep);
            this._saveSequencesToStorage();
            eventBus.publish(Events.SEQUENCE_UPDATED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
            return this._state.sequences[sequenceId].steps.length - 1;
        }
        return -1;
    }

    updateSequenceStep(sequenceId, stepIndex, updates) {
        const sequence = this._state.sequences[sequenceId];
        if (sequence && sequence.steps[stepIndex]) {
            sequence.steps[stepIndex] = {
                ...sequence.steps[stepIndex],
                ...updates
            };
            this._saveSequencesToStorage();
            eventBus.publish(Events.SEQUENCE_UPDATED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
        }
    }

    removeSequenceStep(sequenceId, stepIndex) {
        const sequence = this._state.sequences[sequenceId];
        if (sequence && sequence.steps.length > 1 && sequence.steps[stepIndex]) {
            sequence.steps.splice(stepIndex, 1);
            this._saveSequencesToStorage();
            eventBus.publish(Events.SEQUENCE_UPDATED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
        }
    }

    reorderSequenceSteps(sequenceId, fromIndex, toIndex) {
        const sequence = this._state.sequences[sequenceId];
        if (sequence && sequence.steps[fromIndex] && toIndex >= 0 && toIndex < sequence.steps.length) {
            const [removed] = sequence.steps.splice(fromIndex, 1);
            sequence.steps.splice(toIndex, 0, removed);
            this._saveSequencesToStorage();
            eventBus.publish(Events.SEQUENCE_UPDATED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
        }
    }

    deleteSequence(sequenceId) {
        if (this._state.sequences[sequenceId]) {
            // Stop playback if this sequence is playing
            if (this._state.playbackState.currentSequenceId === sequenceId) {
                this.stopPlayback();
            }

            delete this._state.sequences[sequenceId];

            // Clear current sequence if deleted
            if (this._state.currentSequenceId === sequenceId) {
                const remainingKeys = Object.keys(this._state.sequences);
                this._state.currentSequenceId = remainingKeys.length > 0
                    ? parseInt(remainingKeys[0], 10)
                    : null;
            }

            this._saveSequencesToStorage();
            this._saveCurrentSequenceIdToStorage();

            eventBus.publish(Events.SEQUENCE_DELETED, { sequenceId });
        }
    }

    // ===== PLAYBACK STATE MANAGEMENT =====

    setPlaybackState(updates) {
        this._state.playbackState = {
            ...this._state.playbackState,
            ...updates
        };
    }

    startPlayback(sequenceId) {
        if (this._state.sequences[sequenceId]) {
            this._state.playbackState = {
                isPlaying: true,
                isPaused: false,
                currentSequenceId: sequenceId,
                currentStepIndex: 0,
                stepStartTime: performance.now(),
                elapsedTime: 0,
                inTransition: false
            };
            eventBus.publish(Events.PLAYBACK_STARTED, {
                sequenceId,
                sequence: this._state.sequences[sequenceId]
            });
        }
    }

    pausePlayback() {
        if (this._state.playbackState.isPlaying && !this._state.playbackState.isPaused) {
            this._state.playbackState.isPaused = true;
            this._state.playbackState.elapsedTime +=
                performance.now() - this._state.playbackState.stepStartTime;
            eventBus.publish(Events.PLAYBACK_PAUSED, {
                sequenceId: this._state.playbackState.currentSequenceId,
                stepIndex: this._state.playbackState.currentStepIndex
            });
        }
    }

    resumePlayback() {
        if (this._state.playbackState.isPlaying && this._state.playbackState.isPaused) {
            this._state.playbackState.isPaused = false;
            this._state.playbackState.stepStartTime = performance.now();
            eventBus.publish(Events.PLAYBACK_RESUMED, {
                sequenceId: this._state.playbackState.currentSequenceId,
                stepIndex: this._state.playbackState.currentStepIndex
            });
        }
    }

    stopPlayback() {
        const wasPlaying = this._state.playbackState.isPlaying;
        const sequenceId = this._state.playbackState.currentSequenceId;
        
        this._state.playbackState = { ...defaultPlaybackState };
        
        if (wasPlaying) {
            eventBus.publish(Events.PLAYBACK_STOPPED, { sequenceId });
        }
    }

    setCurrentStep(stepIndex) {
        const sequence = this._state.sequences[this._state.playbackState.currentSequenceId];
        if (sequence && stepIndex >= 0 && stepIndex < sequence.steps.length) {
            const previousStep = this._state.playbackState.currentStepIndex;
            this._state.playbackState.currentStepIndex = stepIndex;
            this._state.playbackState.stepStartTime = performance.now();
            this._state.playbackState.elapsedTime = 0;
            
            eventBus.publish(Events.PLAYBACK_STEP_CHANGED, {
                sequenceId: this._state.playbackState.currentSequenceId,
                previousStep,
                currentStep: stepIndex,
                step: sequence.steps[stepIndex]
            });
        }
    }

    setInTransition(inTransition) {
        this._state.playbackState.inTransition = inTransition;
    }

    // Get configuration for a specific effect (for sequencer)
    getEffectConfiguration(effectId) {
        const effect = this._state.effects[effectId];
        if (effect) {
            return {
                globalSettings: this._deepClone(effect.globalSettings),
                activeNodes: [...(effect.activeNodes || [9])],
                nodeSpecificSettings: this._deepClone(effect.nodeSpecificSettings || {})
            };
        }
        return null;
    }

    // ===== FIRMWARE STATE SYNCHRONIZATION =====

    /**
     * Apply state received from firmware to local store
     * This syncs the WebUI with the current hardware state
     * @param {Object} firmwareState - Mapped firmware state
     */
    applyFirmwareState(firmwareState) {
        if (!firmwareState) return;

        console.log('Applying firmware state to local store:', firmwareState);

        // Merge firmware settings with current global settings
        // Only update settings that came from firmware
        if (firmwareState.globalSettings) {
            const mergedSettings = {
                ...this._state.globalSettings,
                ...firmwareState.globalSettings
            };
            
            // Don't overwrite local-only settings like colors and effectBasis
            // unless they are explicitly provided
            if (!firmwareState.globalSettings.colors) {
                mergedSettings.colors = this._state.globalSettings.colors;
            }
            if (!firmwareState.globalSettings.effectBasis) {
                mergedSettings.effectBasis = this._state.globalSettings.effectBasis;
            }
            if (!firmwareState.globalSettings.effectDuration) {
                mergedSettings.effectDuration = this._state.globalSettings.effectDuration;
            }
            if (!firmwareState.globalSettings.numberOfRipples) {
                mergedSettings.numberOfRipples = this._state.globalSettings.numberOfRipples;
            }

            this._state.globalSettings = mergedSettings;
        }

        // Update active nodes if provided
        if (firmwareState.activeNodes && firmwareState.activeNodes.length > 0) {
            this._state.activeNodes = [...firmwareState.activeNodes];
        }

        // Update current effect with synced settings
        this._updateCurrentEffectSettings();

        // Publish event for UI components to update
        eventBus.publish(Events.SETTINGS_CHANGED, {
            type: 'firmwareSync',
            settings: this._state.globalSettings,
            activeNodes: this._state.activeNodes
        });
    }

    /**
     * Get global settings (convenience method)
     */
    getGlobalSettings() {
        return this._deepClone(this._state.globalSettings);
    }

    /**
     * Get list of active node IDs
     */
    getActiveNodeIds() {
        return [...this._state.activeNodes];
    }

    /**
     * Check if local state differs from firmware state
     * @param {Object} firmwareState - State from firmware
     * @returns {boolean} - True if there are differences
     */
    hasStateDifference(firmwareState) {
        if (!firmwareState || !firmwareState.globalSettings) return false;

        const local = this._state.globalSettings;
        const remote = firmwareState.globalSettings;

        // Check key settings that exist on both sides
        const keysToCheck = [
            'rippleDelay', 'rippleLifeSpan', 'rippleSpeed',
            'decayPerTick', 'hueDeltaTick', 'desiredBehavior', 'rippleDirection'
        ];

        for (const key of keysToCheck) {
            if (remote[key] !== undefined && local[key] !== remote[key]) {
                console.log(`State difference detected in ${key}: local=${local[key]}, firmware=${remote[key]}`);
                return true;
            }
        }

        // Check active nodes
        if (firmwareState.activeNodes) {
            const localNodes = new Set(this._state.activeNodes);
            const remoteNodes = new Set(firmwareState.activeNodes);
            
            if (localNodes.size !== remoteNodes.size) return true;
            for (const node of localNodes) {
                if (!remoteNodes.has(node)) return true;
            }
        }

        return false;
    }
}

const store = new StateStore();
export default store;
