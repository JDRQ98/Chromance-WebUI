// File: /js/core/effectSequencer.js
// Core sequencer engine for effect playlists with timer and transition support

import eventBus, { Events } from './eventBus.js';
import store from './stateStore.js';
import wsClient from './wsClient.js';

/**
 * Effect Sequencer - manages playback of effect sequences
 * 
 * Features:
 * - Timer-based step progression with accurate timing
 * - Transition support: instant, fadeIn, fadeOut, crossfade
 * - Playback controls: play, pause, resume, stop, skip, previous
 * - Loop and shuffle support
 * - Sends configurations to ESP32 via WebSocket
 */
class EffectSequencer {
    constructor() {
        this._tickInterval = null;
        this._tickRate = 50;  // ms between ticks (20 FPS for smooth progress)
        this._transitionTimer = null;
        
        // Bind methods for event handlers
        this._tick = this._tick.bind(this);
        
        // Subscribe to external stop events
        eventBus.subscribe(Events.PLAYBACK_STOPPED, () => {
            this._cleanup();
        });
    }

    // ===== PLAYBACK CONTROL =====

    /**
     * Start playing a sequence
     * @param {number} sequenceId - ID of sequence to play
     */
    play(sequenceId = null) {
        const seqId = sequenceId ?? store.currentSequenceId;
        
        if (seqId === null) {
            console.warn('No sequence to play');
            return false;
        }

        const sequence = store.sequences[seqId];
        if (!sequence || !sequence.steps || sequence.steps.length === 0) {
            console.warn('Invalid sequence or no steps');
            return false;
        }

        // Stop any current playback
        this.stop();

        // Start new playback
        store.startPlayback(seqId);
        
        // Apply first step's effect immediately
        this._applyStep(0);
        
        // Start the tick loop
        this._startTickLoop();

        return true;
    }

    /**
     * Pause current playback
     */
    pause() {
        if (store.isPlaying && !store.isPaused) {
            store.pausePlayback();
            this._stopTickLoop();
        }
    }

    /**
     * Resume paused playback
     */
    resume() {
        if (store.isPlaying && store.isPaused) {
            store.resumePlayback();
            this._startTickLoop();
        }
    }

    /**
     * Toggle pause/resume
     */
    togglePause() {
        if (store.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Stop playback completely
     */
    stop() {
        this._cleanup();
        store.stopPlayback();
    }

    /**
     * Skip to a specific step
     * @param {number} stepIndex - Index of step to skip to
     */
    skipTo(stepIndex) {
        if (!store.isPlaying) return;

        const sequence = this._getCurrentSequence();
        if (!sequence || stepIndex < 0 || stepIndex >= sequence.steps.length) {
            return;
        }

        // Cancel any ongoing transition
        this._cancelTransition();

        store.setCurrentStep(stepIndex);
        this._applyStep(stepIndex);
    }

    /**
     * Skip to next step
     */
    next() {
        if (!store.isPlaying) return;

        const playbackState = store.playbackState;
        const sequence = this._getCurrentSequence();
        
        if (!sequence) return;

        let nextIndex = playbackState.currentStepIndex + 1;
        
        if (nextIndex >= sequence.steps.length) {
            if (sequence.loop) {
                nextIndex = 0;
                eventBus.publish(Events.PLAYBACK_LOOP, {
                    sequenceId: playbackState.currentSequenceId
                });
            } else {
                // End of sequence
                this.stop();
                return;
            }
        }

        this.skipTo(nextIndex);
    }

    /**
     * Go to previous step
     */
    previous() {
        if (!store.isPlaying) return;

        const playbackState = store.playbackState;
        const sequence = this._getCurrentSequence();
        
        if (!sequence) return;

        let prevIndex = playbackState.currentStepIndex - 1;
        
        if (prevIndex < 0) {
            if (sequence.loop) {
                prevIndex = sequence.steps.length - 1;
            } else {
                prevIndex = 0;
            }
        }

        this.skipTo(prevIndex);
    }

    // ===== STATE ACCESSORS =====

    get isPlaying() {
        return store.isPlaying;
    }

    get isPaused() {
        return store.isPaused;
    }

    get currentStep() {
        return store.playbackState.currentStepIndex;
    }

    /**
     * Get progress within current step (0-1)
     */
    get progress() {
        const playbackState = store.playbackState;
        if (!playbackState.isPlaying) return 0;

        const sequence = this._getCurrentSequence();
        if (!sequence) return 0;

        const step = sequence.steps[playbackState.currentStepIndex];
        if (!step) return 0;

        const elapsed = this._getElapsedTime();
        return Math.min(elapsed / step.duration, 1);
    }

    /**
     * Get total elapsed time in current step (ms)
     */
    get elapsedTime() {
        return this._getElapsedTime();
    }

    // ===== INTERNAL METHODS =====

    _getCurrentSequence() {
        const playbackState = store.playbackState;
        return store.sequences[playbackState.currentSequenceId] || null;
    }

    _getElapsedTime() {
        const playbackState = store.playbackState;
        if (!playbackState.isPlaying) return 0;

        if (playbackState.isPaused) {
            return playbackState.elapsedTime;
        }

        return playbackState.elapsedTime + (performance.now() - playbackState.stepStartTime);
    }

    _startTickLoop() {
        this._stopTickLoop();
        this._tickInterval = setInterval(this._tick, this._tickRate);
    }

    _stopTickLoop() {
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }
    }

    _tick() {
        const playbackState = store.playbackState;
        
        if (!playbackState.isPlaying || playbackState.isPaused) {
            return;
        }

        const sequence = this._getCurrentSequence();
        if (!sequence) {
            this.stop();
            return;
        }

        const currentStep = sequence.steps[playbackState.currentStepIndex];
        if (!currentStep) {
            this.stop();
            return;
        }

        const elapsed = this._getElapsedTime();
        const progress = Math.min(elapsed / currentStep.duration, 1);

        // Publish progress update
        eventBus.publish(Events.PLAYBACK_PROGRESS, {
            sequenceId: playbackState.currentSequenceId,
            stepIndex: playbackState.currentStepIndex,
            elapsed,
            duration: currentStep.duration,
            progress
        });

        // Check if step is complete
        if (elapsed >= currentStep.duration) {
            this._advanceToNextStep();
        }
    }

    _advanceToNextStep() {
        const playbackState = store.playbackState;
        const sequence = this._getCurrentSequence();
        
        if (!sequence) return;

        let nextIndex = playbackState.currentStepIndex + 1;
        
        if (nextIndex >= sequence.steps.length) {
            if (sequence.loop) {
                nextIndex = 0;
                
                // Shuffle steps if enabled
                if (sequence.shuffleOnLoop) {
                    this._shuffleSequenceSteps();
                }
                
                eventBus.publish(Events.PLAYBACK_LOOP, {
                    sequenceId: playbackState.currentSequenceId
                });
            } else {
                // End of sequence
                this.stop();
                return;
            }
        }

        // Get current and next steps for transition
        const currentStep = sequence.steps[playbackState.currentStepIndex];
        const nextStep = sequence.steps[nextIndex];

        // Execute transition
        this._executeTransition(currentStep, nextStep, nextIndex);
    }

    _executeTransition(fromStep, toStep, toIndex) {
        const playbackState = store.playbackState;
        const transitionType = toStep.transitionType || 'instant';
        const transitionDuration = toStep.transitionDuration || 0;

        if (transitionType === 'instant' || transitionDuration <= 0) {
            // Instant transition
            store.setCurrentStep(toIndex);
            this._applyStep(toIndex);
            return;
        }

        // Start transition
        store.setInTransition(true);
        eventBus.publish(Events.PLAYBACK_TRANSITION_START, {
            sequenceId: playbackState.currentSequenceId,
            fromStep: playbackState.currentStepIndex,
            toStep: toIndex,
            transitionType,
            transitionDuration
        });

        switch (transitionType) {
            case 'fadeOut':
                this._executeFadeOutTransition(toIndex, transitionDuration);
                break;
            case 'fadeIn':
                this._executeFadeInTransition(toIndex, transitionDuration);
                break;
            case 'crossfade':
                this._executeCrossfadeTransition(toIndex, transitionDuration);
                break;
            default:
                store.setCurrentStep(toIndex);
                this._applyStep(toIndex);
        }
    }

    _executeFadeOutTransition(toIndex, duration) {
        // Fade out: disable ripple firing, let current ripples fade, then switch
        // Send a config with MasterFireRippleEnabled = false and high decay
        this._sendTransitionConfig({
            loop_MasterFireRippleEnabled: false
        });

        this._transitionTimer = setTimeout(() => {
            store.setInTransition(false);
            store.setCurrentStep(toIndex);
            this._applyStep(toIndex);
            this._finishTransition(toIndex);
        }, duration);
    }

    _executeFadeInTransition(toIndex, duration) {
        // Fade in: switch to new effect but start with low brightness
        // Then gradually restore
        store.setCurrentStep(toIndex);
        
        // Apply effect with disabled firing first
        const config = this._getStepConfig(toIndex);
        if (config) {
            config.globalSettings.decayPerTick = 1.0;  // Max decay (invisible)
            this._sendConfig(config);
        }

        // Gradually enable
        this._transitionTimer = setTimeout(() => {
            store.setInTransition(false);
            this._applyStep(toIndex);  // Apply full config
            this._finishTransition(toIndex);
        }, duration);
    }

    _executeCrossfadeTransition(toIndex, duration) {
        // Crossfade: fire both effects briefly
        // First half: both effects running
        // Second half: only new effect
        const halfDuration = duration / 2;

        // Apply new effect (old ripples still visible due to decay)
        store.setCurrentStep(toIndex);
        this._applyStep(toIndex);

        this._transitionTimer = setTimeout(() => {
            store.setInTransition(false);
            this._finishTransition(toIndex);
        }, duration);
    }

    _finishTransition(stepIndex) {
        const playbackState = store.playbackState;
        eventBus.publish(Events.PLAYBACK_TRANSITION_END, {
            sequenceId: playbackState.currentSequenceId,
            stepIndex
        });
    }

    _cancelTransition() {
        if (this._transitionTimer) {
            clearTimeout(this._transitionTimer);
            this._transitionTimer = null;
        }
        store.setInTransition(false);
    }

    _applyStep(stepIndex) {
        const config = this._getStepConfig(stepIndex);
        if (config) {
            this._sendConfig(config);
        }
    }

    _getStepConfig(stepIndex) {
        const sequence = this._getCurrentSequence();
        if (!sequence) return null;

        const step = sequence.steps[stepIndex];
        if (!step) return null;

        return store.getEffectConfiguration(step.effectId);
    }

    async _sendConfig(config) {
        if (!config) return;

        try {
            if (wsClient.isConnected) {
                await wsClient.updateConfig(config);
            } else {
                // Fallback to HTTP
                await fetch('http://hexagono.local/updateInternalVariables', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
            }
        } catch (error) {
            console.error('Failed to send sequencer config:', error);
        }
    }

    async _sendTransitionConfig(overrides) {
        // Send a config with specific overrides for transitions
        // This modifies the current effect's config with transition-specific values
        const playbackState = store.playbackState;
        const sequence = this._getCurrentSequence();
        if (!sequence) return;

        const step = sequence.steps[playbackState.currentStepIndex];
        if (!step) return;

        const config = store.getEffectConfiguration(step.effectId);
        if (!config) return;

        // Apply overrides
        Object.assign(config.globalSettings, overrides);

        await this._sendConfig(config);
    }

    _shuffleSequenceSteps() {
        // Fisher-Yates shuffle in-place
        // Note: This shuffles the store's sequence steps
        const playbackState = store.playbackState;
        const sequence = store.sequences[playbackState.currentSequenceId];
        if (!sequence) return;

        const steps = sequence.steps;
        for (let i = steps.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [steps[i], steps[j]] = [steps[j], steps[i]];
        }

        // Note: We're modifying in-place without saving to storage
        // This is intentional - shuffle is transient during playback
    }

    _cleanup() {
        this._stopTickLoop();
        this._cancelTransition();
    }
}

// Singleton instance
const effectSequencer = new EffectSequencer();
export default effectSequencer;
