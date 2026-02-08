// File: /js/core/wsClient.js
// WebSocket client with auto-reconnect, message queue, and state synchronization

import eventBus, { Events } from './eventBus.js';
import store from './stateStore.js';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.url = this._getWebSocketUrl();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.baseReconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.messageQueue = [];
        this.messageId = 0;
        this.pendingAcks = new Map();
        this.ackTimeout = 5000;
        this.isConnecting = false;
        
        // State sync tracking
        this.lastFirmwareStateHash = null;
        this.stateSyncPending = false;
    }

    _getWebSocketUrl() {
        // Use current host or default to hexagono.local
        const host = window.location.hostname || 'hexagono.local';
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${host}/ws`;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        console.log(`WebSocket connecting to ${this.url}...`);

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                store.setWsConnected(true);

                // Process queued messages
                this._flushMessageQueue();
                
                // Request current state from firmware
                // Note: Firmware already sends state on connect, but we can also request it
                this.stateSyncPending = true;
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
                this.isConnecting = false;
                store.setWsConnected(false);
                this._scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
                eventBus.publish(Events.WS_ERROR, { error });
            };

            this.ws.onmessage = (event) => {
                this._handleMessage(event.data);
            };
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.isConnecting = false;
            this._scheduleReconnect();
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            eventBus.publish(Events.WS_ERROR, {
                error: new Error('Max reconnection attempts reached')
            });
            return;
        }

        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        this.reconnectAttempts++;
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => this.connect(), delay);
    }

    _handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('WebSocket received:', message);

            eventBus.publish(Events.WS_MESSAGE, message);

            switch (message.type) {
                case 'ACK':
                    this._handleAck(message);
                    break;

                case 'STATE':
                    this._handleState(message.payload);
                    break;

                case 'RIPPLE_FIRED':
                    eventBus.publish(Events.RIPPLE_RECEIVED, message.payload);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    _handleAck(message) {
        const { ackId, success } = message;
        const pending = this.pendingAcks.get(ackId);

        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingAcks.delete(ackId);

            if (success) {
                pending.resolve(message);
            } else {
                pending.reject(new Error('Server rejected message'));
            }

            eventBus.publish(Events.CONFIG_ACK, { id: ackId, success });
        }
    }

    /**
     * Handle STATE message from firmware - sync to local store
     */
    _handleState(payload) {
        console.log('Received state from firmware:', payload);
        
        // Calculate hash of firmware state for conflict detection
        const firmwareHash = this._calculateStateHash(payload);
        
        // Check if this is a new state (different from last known)
        if (this.lastFirmwareStateHash !== null && this.lastFirmwareStateHash !== firmwareHash) {
            console.log('Firmware state changed, syncing to local store');
        }
        
        this.lastFirmwareStateHash = firmwareHash;
        
        // Map firmware state to local store format
        const mappedState = this._mapFirmwareStateToLocal(payload);
        
        // Apply to store if this is initial sync or explicit request
        if (this.stateSyncPending) {
            this.stateSyncPending = false;
            store.applyFirmwareState(mappedState);
            eventBus.publish(Events.FIRMWARE_STATE_SYNCED, { state: mappedState });
            console.log('Firmware state synced to local store');
        } else {
            // Broadcast for UI components that want to show firmware state
            eventBus.publish(Events.FIRMWARE_STATE_RECEIVED, { state: mappedState, hash: firmwareHash });
        }
    }

    /**
     * Map firmware state payload to local store format
     */
    _mapFirmwareStateToLocal(payload) {
        // Map behavior number to string
        const behaviorMap = {
            0: 'normal',
            1: 'feisty',
            2: 'angry',
            3: 'pastel'
        };
        
        // Map direction number to string
        const directionMap = {
            [-1]: 'allDirections',
            0: 'outward',
            3: 'inward'
        };
        
        return {
            globalSettings: {
                rippleDelay: payload.rippleDelay,
                rippleLifeSpan: payload.rippleLifeSpan,
                rippleSpeed: payload.rippleSpeed,
                decayPerTick: payload.decayPerTick,
                hueDeltaTick: payload.hueDeltaTick,
                desiredBehavior: behaviorMap[payload.behavior] || 'normal',
                rippleDirection: directionMap[payload.direction] || 'allDirections',
                numberOfColors: payload.numberOfColors || 1
            },
            activeNodes: payload.activeNodes || [],
            masterEnabled: payload.masterEnabled
        };
    }

    /**
     * Calculate a simple hash for state comparison
     */
    _calculateStateHash(state) {
        const str = JSON.stringify(state);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }

    send(type, payload = {}) {
        const id = ++this.messageId;
        const message = { type, id, payload };

        if (this.ws?.readyState === WebSocket.OPEN) {
            return this._sendMessage(message);
        } else {
            // Queue message for later
            return new Promise((resolve, reject) => {
                this.messageQueue.push({ message, resolve, reject });
            });
        }
    }

    _sendMessage(message) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingAcks.delete(message.id);
                reject(new Error('Message acknowledgment timeout'));
            }, this.ackTimeout);

            this.pendingAcks.set(message.id, { resolve, reject, timeout });

            try {
                this.ws.send(JSON.stringify(message));
                console.log('WebSocket sent:', message);
            } catch (error) {
                clearTimeout(timeout);
                this.pendingAcks.delete(message.id);
                reject(error);
            }
        });
    }

    _flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const { message, resolve, reject } = this.messageQueue.shift();
            this._sendMessage(message).then(resolve).catch(reject);
        }
    }

    // Convenience methods
    async updateConfig(config) {
        try {
            await this.send('UPDATE_CONFIG', config);
            eventBus.publish(Events.CONFIG_SENT, { config });
            return true;
        } catch (error) {
            console.error('Failed to update config:', error);
            return false;
        }
    }

    async getState() {
        this.stateSyncPending = true;
        try {
            await this.send('GET_STATE');
            return true;
        } catch (error) {
            console.error('Failed to get state:', error);
            this.stateSyncPending = false;
            return false;
        }
    }

    async fireRipple() {
        try {
            await this.send('FIRE_RIPPLE');
            eventBus.publish(Events.RIPPLE_FIRED, {});
            return true;
        } catch (error) {
            console.error('Failed to fire ripple:', error);
            return false;
        }
    }

    // Send configuration from store to microcontroller
    async sendConfiguration() {
        const config = store.getConfiguration();
        return this.updateConfig(config);
    }

    /**
     * Request state sync from firmware
     */
    async requestStateSync() {
        console.log('Requesting state sync from firmware...');
        return this.getState();
    }

    /**
     * Get the last known firmware state hash
     */
    get firmwareStateHash() {
        return this.lastFirmwareStateHash;
    }

    get isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

const wsClient = new WebSocketClient();
export default wsClient;
