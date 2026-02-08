// File: /js/core/eventBus.js
// Pub/sub system for decoupling modules

const eventBus = {
    listeners: new Map(),

    subscribe(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.listeners.get(event);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    },

    // Alias for subscribe (for compatibility with different naming conventions)
    on(event, handler) {
        return this.subscribe(event, handler);
    },

    publish(event, data) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    },

    // Alias for publish (for compatibility with different naming conventions)
    emit(event, data) {
        return this.publish(event, data);
    },

    once(event, handler) {
        const wrappedHandler = (data) => {
            handler(data);
            this.listeners.get(event)?.delete(wrappedHandler);
        };
        return this.subscribe(event, wrappedHandler);
    },

    off(event, handler) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    },

    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
};

export const Events = {
    // Settings events
    SETTINGS_CHANGED: 'settings:changed',
    GLOBAL_SETTINGS_SAVED: 'settings:global:saved',
    NODE_SETTINGS_SAVED: 'settings:node:saved',

    // Node events
    NODES_SELECTED: 'nodes:selected',
    NODES_DESELECTED: 'nodes:deselected',
    NODES_ACTIVATED: 'nodes:activated',
    NODES_DEACTIVATED: 'nodes:deactivated',

    // Effect events
    EFFECT_LOADED: 'effect:loaded',
    EFFECT_SAVED: 'effect:saved',
    EFFECT_DELETED: 'effect:deleted',

    // Modal events
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',

    // WebSocket events
    WS_CONNECTED: 'ws:connected',
    WS_DISCONNECTED: 'ws:disconnected',
    WS_MESSAGE: 'ws:message',
    WS_ERROR: 'ws:error',

    // Config events
    CONFIG_SENT: 'config:sent',
    CONFIG_ACK: 'config:ack',

    // Ripple events
    RIPPLE_FIRED: 'ripple:fired',
    RIPPLE_RECEIVED: 'ripple:received',

    // Sequence events
    SEQUENCE_CREATED: 'sequence:created',
    SEQUENCE_UPDATED: 'sequence:updated',
    SEQUENCE_DELETED: 'sequence:deleted',
    SEQUENCE_LOADED: 'sequence:loaded',

    // Playback events
    PLAYBACK_STARTED: 'playback:started',
    PLAYBACK_PAUSED: 'playback:paused',
    PLAYBACK_RESUMED: 'playback:resumed',
    PLAYBACK_STOPPED: 'playback:stopped',
    PLAYBACK_STEP_CHANGED: 'playback:stepChanged',
    PLAYBACK_PROGRESS: 'playback:progress',
    PLAYBACK_TRANSITION_START: 'playback:transitionStart',
    PLAYBACK_TRANSITION_END: 'playback:transitionEnd',
    PLAYBACK_LOOP: 'playback:loop',

    // Preview/Visualizer events
    PREVIEW_START: 'preview:start',
    PREVIEW_STOP: 'preview:stop',
    PREVIEW_STARTED: 'preview:started',
    PREVIEW_STOPPED: 'preview:stopped',
    PREVIEW_FRAME: 'preview:frame',
    PREVIEW_FIRE_RIPPLE: 'preview:fireRipple',
    
    // Active nodes events
    ACTIVE_NODES_CHANGED: 'activeNodes:changed',
    
    // Canvas interaction events
    CANVAS_NODE_CLICKED: 'canvas:nodeClicked',
    CANVAS_BACKGROUND_CLICKED: 'canvas:backgroundClicked',
    
    // Global settings changed (for simulator sync)
    GLOBAL_SETTINGS_CHANGED: 'globalSettings:changed',
    
    // Firmware state sync events
    FIRMWARE_STATE_SYNCED: 'firmware:stateSynced',
    FIRMWARE_STATE_RECEIVED: 'firmware:stateReceived',
    FIRMWARE_STATE_CONFLICT: 'firmware:stateConflict'
};

export { eventBus };
export default eventBus;
