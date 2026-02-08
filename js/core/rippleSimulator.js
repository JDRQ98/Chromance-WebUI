/**
 * Hexachrome Ripple Simulator
 * Ported from firmware: Chromance-JD/MCAL/ripple.h
 * 
 * Client-side simulation of the ripple algorithm for preview before
 * sending configuration to the microcontroller.
 */

import {
  NUMBER_OF_SEGMENTS,
  NUMBER_OF_LEDS_PER_SEGMENT,
  nodeConnections,
  segmentConnections,
  RippleBehavior,
  DirectionBias,
  RippleState,
  isUpwardDirection
} from './topology.js';

import { eventBus } from './eventBus.js';

// ============================================================================
// Configuration
// ============================================================================

const MAX_RIPPLES = 50;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const DECAY_BASE = 0.97; // LED brightness decay per frame

// ============================================================================
// Ripple Class
// ============================================================================

class Ripple {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.state = RippleState.DEAD;
    this.segment = 0;
    this.ledPosition = 0;  // 0 to NUMBER_OF_LEDS_PER_SEGMENT - 1
    this.direction = 0;    // Entry direction when in node
    this.node = 0;         // Current node when in withinNode state
    
    this.hue = 0;          // 0-360 degrees
    this.hueDeltaPerTick = 0;
    this.color = null;     // {r, g, b} override, or null to use hue
    
    this.speed = 0.5;
    this.lifespan = 3000;
    this.behavior = RippleBehavior.WEAKSAUCE;
    this.bias = DirectionBias.NO_PREFERENCE;
    this.nodeLimit = 0xFFFF;
    
    this.pressure = 0;
    this.birthday = 0;
    this.lastAdvanceTime = 0;
  }

  /**
   * Start a ripple at a node traveling in a direction
   */
  start(node, direction, options = {}) {
    this.node = node;
    this.direction = direction;
    
    this.hue = options.hue ?? Math.random() * 360;
    this.hueDeltaPerTick = options.hueDelta ?? 0;
    this.color = options.color ?? null;
    this.speed = options.speed ?? 0.5;
    this.lifespan = options.lifespan ?? 3000;
    this.behavior = options.behavior ?? RippleBehavior.WEAKSAUCE;
    this.bias = options.bias ?? DirectionBias.NO_PREFERENCE;
    this.nodeLimit = options.nodeLimit ?? 0xFFFF;
    
    this.birthday = performance.now();
    this.lastAdvanceTime = this.birthday;
    this.pressure = 0;
    this.state = RippleState.WITHIN_NODE;
    this.justStarted = true;
  }

  /**
   * Advance the ripple simulation by one frame
   * Returns LED positions that should be lit
   */
  advance(currentTime) {
    if (this.state === RippleState.DEAD) return null;

    const age = currentTime - this.birthday;
    const deltaTime = currentTime - this.lastAdvanceTime;
    this.lastAdvanceTime = currentTime;

    // Update hue
    this.hue = (this.hue + this.hueDeltaPerTick) % 360;

    // Time-invariant pressure calculation (normalized to 60fps)
    const timeScale = deltaTime / FRAME_TIME;
    const ageRatio = Math.min(age / this.lifespan, 1);
    const currentSpeed = this.speed * (1 - ageRatio * 0.5); // Slows to 50% at end of life
    this.pressure += currentSpeed * timeScale;

    const ledUpdates = [];

    // Process movement while we have pressure
    while (this.pressure >= 1) {
      this.pressure -= 1;

      switch (this.state) {
        case RippleState.WITHIN_NODE:
          this._processNodeTransition();
          break;

        case RippleState.TRAVELING_UPWARDS:
          this.ledPosition++;
          if (this.ledPosition >= NUMBER_OF_LEDS_PER_SEGMENT) {
            this._enterNodeFromTop();
          }
          break;

        case RippleState.TRAVELING_DOWNWARDS:
          this.ledPosition--;
          if (this.ledPosition < 0) {
            this._enterNodeFromBottom();
          }
          break;
      }

      // Record LED position if visible
      if (this.state === RippleState.TRAVELING_UPWARDS || 
          this.state === RippleState.TRAVELING_DOWNWARDS) {
        ledUpdates.push({
          segment: this.segment,
          led: this.ledPosition,
          hue: this.hue,
          color: this.color,
          brightness: 1.0 - ageRatio * 0.3 // Fade slightly with age
        });
      }
    }

    // Check death conditions
    if (age >= this.lifespan || this.nodeLimit <= 0) {
      this.state = RippleState.DEAD;
    }

    return ledUpdates.length > 0 ? ledUpdates : null;
  }

  /**
   * Process transition through a node - pick exit direction
   */
  _processNodeTransition() {
    if (!this.justStarted) {
      // Pick new direction based on behavior
      const newDirection = this._pickExitDirection();
      if (newDirection < 0) {
        // No valid exit - ripple dies
        this.state = RippleState.DEAD;
        return;
      }
      this.direction = newDirection;
    }
    this.justStarted = false;

    // Enter the segment in that direction
    const segmentId = nodeConnections[this.node][this.direction];
    if (segmentId < 0) {
      this.state = RippleState.DEAD;
      return;
    }

    this.segment = segmentId;

    // Determine travel direction based on entry direction
    if (isUpwardDirection(this.direction)) {
      this.state = RippleState.TRAVELING_UPWARDS;
      this.ledPosition = 0;
    } else {
      this.state = RippleState.TRAVELING_DOWNWARDS;
      this.ledPosition = NUMBER_OF_LEDS_PER_SEGMENT - 1;
    }
  }

  /**
   * Enter node from top of segment
   */
  _enterNodeFromTop() {
    this.nodeLimit--;
    const [topNode] = segmentConnections[this.segment];
    
    // Find entry direction
    for (let dir = 0; dir < 6; dir++) {
      if (nodeConnections[topNode][dir] === this.segment) {
        this.direction = dir;
        break;
      }
    }
    
    this.node = topNode;
    this.state = RippleState.WITHIN_NODE;
  }

  /**
   * Enter node from bottom of segment
   */
  _enterNodeFromBottom() {
    this.nodeLimit--;
    const [, bottomNode] = segmentConnections[this.segment];
    
    // Find entry direction
    for (let dir = 0; dir < 6; dir++) {
      if (nodeConnections[bottomNode][dir] === this.segment) {
        this.direction = dir;
        break;
      }
    }
    
    this.node = bottomNode;
    this.state = RippleState.WITHIN_NODE;
  }

  /**
   * Pick exit direction based on behavior and available connections
   */
  _pickExitDirection() {
    const connections = nodeConnections[this.node];
    const entry = this.direction;

    // Calculate relative directions
    const sharpLeft = (entry + 1) % 6;
    const wideLeft = (entry + 2) % 6;
    const forward = (entry + 3) % 6;
    const wideRight = (entry + 4) % 6;
    const sharpRight = (entry + 5) % 6;

    // Helper to check if direction is valid
    const isValid = (dir) => connections[dir] >= 0;

    // Handle always-turn behaviors
    if (this.behavior === RippleBehavior.ALWAYS_TURNS_RIGHT) {
      for (let i = 1; i < 6; i++) {
        const dir = (entry + i) % 6;
        if (isValid(dir)) return dir;
      }
      return -1;
    }

    if (this.behavior === RippleBehavior.ALWAYS_TURNS_LEFT) {
      for (let i = 5; i >= 1; i--) {
        const dir = (entry + i) % 6;
        if (isValid(dir)) return dir;
      }
      return -1;
    }

    // Semi-random behavior based on aggression level
    let anger = this.behavior;
    
    while (true) {
      if (anger === 0) {
        // Try straight ahead
        if (isValid(forward)) return forward;
        anger++;
      }

      if (anger === 1) {
        // Try wide turns (60°)
        const leftOk = isValid(wideLeft);
        const rightOk = isValid(wideRight);
        
        if (leftOk && rightOk) {
          return this._pickLeftOrRight(wideLeft, wideRight);
        } else if (leftOk) {
          return wideLeft;
        } else if (rightOk) {
          return wideRight;
        }
        anger++;
      }

      if (anger === 2) {
        // Try sharp turns (120°)
        const leftOk = isValid(sharpLeft);
        const rightOk = isValid(sharpRight);
        
        if (leftOk && rightOk) {
          return this._pickLeftOrRight(sharpLeft, sharpRight);
        } else if (leftOk) {
          return sharpLeft;
        } else if (rightOk) {
          return sharpRight;
        }
        
        // No valid direction
        return -1;
      }
    }
  }

  /**
   * Choose between left and right based on bias
   */
  _pickLeftOrRight(leftDir, rightDir) {
    let choice;
    
    switch (this.bias) {
      case DirectionBias.PREFER_LEFT:
      case DirectionBias.PREFER_LEFT_ONCE:
      case DirectionBias.PREFER_LEFT_TWICE:
        choice = leftDir;
        break;
      case DirectionBias.PREFER_RIGHT:
      case DirectionBias.PREFER_RIGHT_ONCE:
      case DirectionBias.PREFER_RIGHT_TWICE:
        choice = rightDir;
        break;
      default:
        choice = Math.random() < 0.5 ? leftDir : rightDir;
    }

    // Decay bias
    if (this.bias === DirectionBias.PREFER_LEFT_ONCE) {
      this.bias = DirectionBias.NO_PREFERENCE;
    } else if (this.bias === DirectionBias.PREFER_LEFT_TWICE) {
      this.bias = DirectionBias.PREFER_LEFT_ONCE;
    } else if (this.bias === DirectionBias.PREFER_RIGHT_ONCE) {
      this.bias = DirectionBias.NO_PREFERENCE;
    } else if (this.bias === DirectionBias.PREFER_RIGHT_TWICE) {
      this.bias = DirectionBias.PREFER_RIGHT_ONCE;
    }

    return choice;
  }

  get isAlive() {
    return this.state !== RippleState.DEAD;
  }
}

// ============================================================================
// Ripple Simulator
// ============================================================================

class RippleSimulator {
  constructor() {
    this.ripples = [];
    for (let i = 0; i < MAX_RIPPLES; i++) {
      this.ripples.push(new Ripple(i));
    }
    
    // LED state buffer: [segment][led] = { hue, brightness, color }
    this.ledState = [];
    for (let seg = 0; seg < NUMBER_OF_SEGMENTS; seg++) {
      this.ledState[seg] = [];
      for (let led = 0; led < NUMBER_OF_LEDS_PER_SEGMENT; led++) {
        this.ledState[seg][led] = { hue: 0, brightness: 0, color: null };
      }
    }
    
    this.isRunning = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.decayRate = DECAY_BASE;
    
    // Current configuration (from UI)
    this.config = {
      speed: 0.5,
      lifespan: 3000,
      behavior: RippleBehavior.WEAKSAUCE,
      hueDelta: 0,
      colors: [],  // Array of {h, s, l} or {r, g, b}
      fireDelay: 500,
      activeNodes: [9], // Default: center node only
    };
    
    this.nextFireTime = 0;
    this.colorIndex = 0;
    
    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Listen for configuration changes
    eventBus.on('globalSettings:changed', (settings) => {
      this.updateConfig(settings);
    });
    
    eventBus.on('preview:start', () => this.start());
    eventBus.on('preview:stop', () => this.stop());
    eventBus.on('preview:fireRipple', (options) => this.fireRipple(options));
  }

  /**
   * Update simulator configuration from UI settings
   */
  updateConfig(settings) {
    if (settings.rippleSpeed !== undefined) {
      this.config.speed = settings.rippleSpeed;
    }
    if (settings.effectDuration !== undefined) {
      this.config.lifespan = settings.effectDuration;
    }
    if (settings.rippleBehavior !== undefined) {
      this.config.behavior = this._parseBehavior(settings.rippleBehavior);
    }
    if (settings.hueDeltaTick !== undefined) {
      this.config.hueDelta = settings.hueDeltaTick;
    }
    if (settings.decayPerTick !== undefined) {
      this.decayRate = settings.decayPerTick;
    }
    if (settings.rippleDelay !== undefined) {
      this.config.fireDelay = settings.rippleDelay;
    }
    if (settings.colors !== undefined) {
      this.config.colors = settings.colors;
    }
    if (settings.activeNodes !== undefined) {
      this.config.activeNodes = settings.activeNodes;
    }
  }

  _parseBehavior(behaviorStr) {
    const map = {
      'weaksauce': RippleBehavior.WEAKSAUCE,
      'feisty': RippleBehavior.FEISTY,
      'angry': RippleBehavior.ANGRY,
      'alwaysTurnsRight': RippleBehavior.ALWAYS_TURNS_RIGHT,
      'alwaysTurnsLeft': RippleBehavior.ALWAYS_TURNS_LEFT
    };
    return map[behaviorStr] ?? RippleBehavior.WEAKSAUCE;
  }

  /**
   * Start the simulation loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.nextFireTime = this.lastFrameTime;
    this._loop();
    
    eventBus.emit('preview:started');
  }

  /**
   * Stop the simulation loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear all ripples and LED state
    this.ripples.forEach(r => r.reset());
    this._clearLedState();
    
    eventBus.emit('preview:stopped');
    eventBus.emit('preview:frame', this.ledState);
  }

  /**
   * Fire a ripple manually
   */
  fireRipple(options = {}) {
    const ripple = this._getAvailableRipple();
    if (!ripple) return null;

    const node = options.node ?? 9;
    const direction = options.direction ?? this._getRandomDirection(node);
    
    // Get color from palette
    let hue = options.hue;
    let color = options.color;
    
    if (hue === undefined && color === undefined && this.config.colors.length > 0) {
      const colorEntry = this.config.colors[this.colorIndex % this.config.colors.length];
      this.colorIndex++;
      
      if (colorEntry.h !== undefined) {
        hue = colorEntry.h;
      } else if (colorEntry.r !== undefined) {
        color = colorEntry;
      }
    }
    
    if (hue === undefined && color === undefined) {
      hue = Math.random() * 360;
    }

    ripple.start(node, direction, {
      hue,
      color,
      hueDelta: options.hueDelta ?? this.config.hueDelta,
      speed: options.speed ?? this.config.speed,
      lifespan: options.lifespan ?? this.config.lifespan,
      behavior: options.behavior ?? this.config.behavior,
      bias: options.bias ?? DirectionBias.NO_PREFERENCE,
      nodeLimit: options.nodeLimit ?? 0xFFFF
    });

    return ripple;
  }

  /**
   * Main animation loop
   */
  _loop() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    
    // Auto-fire ripples based on config
    if (currentTime >= this.nextFireTime && this.config.activeNodes.length > 0) {
      const node = this.config.activeNodes[
        Math.floor(Math.random() * this.config.activeNodes.length)
      ];
      this.fireRipple({ node });
      this.nextFireTime = currentTime + this.config.fireDelay;
    }

    // Decay existing LED brightness
    this._decayLeds();

    // Advance all ripples
    for (const ripple of this.ripples) {
      if (!ripple.isAlive) continue;
      
      const updates = ripple.advance(currentTime);
      if (updates) {
        for (const update of updates) {
          this._updateLed(update);
        }
      }
    }

    // Emit frame event for visualizer
    eventBus.emit('preview:frame', this.ledState);

    this.lastFrameTime = currentTime;
    this.animationFrameId = requestAnimationFrame(() => this._loop());
  }

  _getAvailableRipple() {
    return this.ripples.find(r => !r.isAlive) || null;
  }

  _getRandomDirection(node) {
    const connections = nodeConnections[node];
    const validDirs = [];
    for (let dir = 0; dir < 6; dir++) {
      if (connections[dir] >= 0) validDirs.push(dir);
    }
    return validDirs[Math.floor(Math.random() * validDirs.length)];
  }

  _decayLeds() {
    for (let seg = 0; seg < NUMBER_OF_SEGMENTS; seg++) {
      for (let led = 0; led < NUMBER_OF_LEDS_PER_SEGMENT; led++) {
        this.ledState[seg][led].brightness *= this.decayRate;
        if (this.ledState[seg][led].brightness < 0.01) {
          this.ledState[seg][led].brightness = 0;
        }
      }
    }
  }

  _updateLed(update) {
    const led = this.ledState[update.segment][update.led];
    // Additive blending - take max brightness
    if (update.brightness > led.brightness) {
      led.brightness = update.brightness;
      led.hue = update.hue;
      led.color = update.color;
    }
  }

  _clearLedState() {
    for (let seg = 0; seg < NUMBER_OF_SEGMENTS; seg++) {
      for (let led = 0; led < NUMBER_OF_LEDS_PER_SEGMENT; led++) {
        this.ledState[seg][led] = { hue: 0, brightness: 0, color: null };
      }
    }
  }

  /**
   * Get current active ripple count
   */
  get activeRippleCount() {
    return this.ripples.filter(r => r.isAlive).length;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const rippleSimulator = new RippleSimulator();
