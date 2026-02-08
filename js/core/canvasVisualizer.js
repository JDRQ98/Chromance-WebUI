/**
 * Hexachrome Canvas Visualizer
 * HTML5 Canvas-based renderer for the LED topology with segment gradients
 * 
 * Replaces the static DOM-based visualizer with an animated canvas that
 * shows ripple effects in real-time.
 */

import {
  NUMBER_OF_SEGMENTS,
  NUMBER_OF_LEDS_PER_SEGMENT,
  NUMBER_OF_NODES,
  segmentConnections,
  getNodePixelPosition,
  borderNodes,
  quadNodes,
  CENTER_NODE
} from './topology.js';

import { eventBus } from './eventBus.js';

// ============================================================================
// Configuration
// ============================================================================

const NODE_RADIUS = 8;
const SEGMENT_WIDTH = 4;
const NODE_GLOW_RADIUS = 15;
const BACKGROUND_COLOR = '#0a0a0a';
const INACTIVE_SEGMENT_COLOR = '#1a1a1a';
const INACTIVE_NODE_COLOR = '#222222';
const ACTIVE_NODE_BORDER_COLOR = '#444444';

// ============================================================================
// Canvas Visualizer Class
// ============================================================================

class CanvasVisualizer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.padding = 25;
    this.dpr = window.devicePixelRatio || 1;
    
    // Cached node positions in pixel coordinates
    this.nodePixelPositions = [];
    
    // Current LED state from simulator
    this.ledState = null;
    
    // Active nodes (for glow effect)
    this.activeNodes = new Set([CENTER_NODE]);
    
    // Selected nodes (for interaction highlighting)
    this.selectedNodes = new Set();
    
    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Listen for simulator frame updates
    eventBus.on('preview:frame', (ledState) => {
      this.ledState = ledState;
      this.render();
    });
    
    // Listen for active node changes
    eventBus.on('activeNodes:changed', (nodes) => {
      this.activeNodes = new Set(nodes);
      this.render();
    });
    
    // Listen for node selection
    eventBus.on('node:selected', (nodeId) => {
      this.selectedNodes.add(nodeId);
      this.render();
    });
    
    eventBus.on('node:deselected', (nodeId) => {
      this.selectedNodes.delete(nodeId);
      this.render();
    });
    
    // Window resize
    window.addEventListener('resize', () => this._handleResize());
  }

  /**
   * Initialize the canvas visualizer
   * @param {string} containerId - ID of the container element
   */
  init(containerId = 'visualizer-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`CanvasVisualizer: Container #${containerId} not found`);
      return false;
    }

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hexachrome-canvas';
    this.canvas.className = 'hexachrome-visualizer';
    container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    
    // Set initial size
    this._handleResize();
    
    // Initial render (static state)
    this.render();
    
    // Set up click handling for node interaction
    this.canvas.addEventListener('click', (e) => this._handleClick(e));
    
    return true;
  }

  /**
   * Handle container resize
   */
  _handleResize() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    this.width = rect.width;
    this.height = rect.height;
    
    // Set canvas size with DPR for sharp rendering
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // Scale context for DPR
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    
    // Recalculate node positions
    this._calculateNodePositions();
    
    // Re-render
    this.render();
  }

  /**
   * Calculate pixel positions for all nodes
   */
  _calculateNodePositions() {
    this.nodePixelPositions = [];
    for (let i = 0; i < NUMBER_OF_NODES; i++) {
      this.nodePixelPositions.push(
        getNodePixelPosition(i, this.width, this.height, this.padding)
      );
    }
  }

  /**
   * Main render function
   */
  render() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    
    // Clear canvas
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw segments (behind nodes)
    this._drawSegments(ctx);
    
    // Draw nodes
    this._drawNodes(ctx);
  }

  /**
   * Draw all segments with gradient coloring based on LED state
   */
  _drawSegments(ctx) {
    for (let seg = 0; seg < NUMBER_OF_SEGMENTS; seg++) {
      const [topNode, bottomNode] = segmentConnections[seg];
      const topPos = this.nodePixelPositions[topNode];
      const bottomPos = this.nodePixelPositions[bottomNode];
      
      if (!topPos || !bottomPos) continue;
      
      // Calculate segment gradient based on LED state
      const gradient = this._createSegmentGradient(ctx, seg, topPos, bottomPos);
      
      // Draw the segment line
      ctx.beginPath();
      ctx.moveTo(topPos.x, topPos.y);
      ctx.lineTo(bottomPos.x, bottomPos.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = SEGMENT_WIDTH;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  /**
   * Create a gradient for a segment based on LED state
   */
  _createSegmentGradient(ctx, segmentId, topPos, bottomPos) {
    const gradient = ctx.createLinearGradient(
      topPos.x, topPos.y, 
      bottomPos.x, bottomPos.y
    );
    
    if (!this.ledState || !this.ledState[segmentId]) {
      // No state - return solid inactive color
      gradient.addColorStop(0, INACTIVE_SEGMENT_COLOR);
      gradient.addColorStop(1, INACTIVE_SEGMENT_COLOR);
      return gradient;
    }
    
    const leds = this.ledState[segmentId];
    
    // Sample LED brightness at key positions for gradient
    // We sample at 0%, 25%, 50%, 75%, 100% of segment
    const samples = [0, 0.25, 0.5, 0.75, 1.0];
    
    for (const t of samples) {
      // Map t to LED index (0 = bottom/floor, 1 = top/ceiling)
      // In firmware, LED 0 is floor, LED 10 is ceiling
      // segmentConnections[0] is ceiling node, [1] is floor node
      // So gradient goes from ceiling (t=0) to floor (t=1)
      // Which means we reverse: ledIndex = (1-t) * (NUM_LEDS-1)
      const ledIndex = Math.round((1 - t) * (NUMBER_OF_LEDS_PER_SEGMENT - 1));
      const led = leds[ledIndex];
      
      if (!led || led.brightness <= 0.01) {
        gradient.addColorStop(t, INACTIVE_SEGMENT_COLOR);
      } else {
        const color = this._ledToColor(led);
        gradient.addColorStop(t, color);
      }
    }
    
    return gradient;
  }

  /**
   * Convert LED state to CSS color string
   */
  _ledToColor(led) {
    const brightness = Math.min(led.brightness, 1);
    
    if (led.color) {
      // RGB color override
      const r = Math.round(led.color.r * brightness);
      const g = Math.round(led.color.g * brightness);
      const b = Math.round(led.color.b * brightness);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    // HSL from hue
    const hue = led.hue % 360;
    const saturation = 100;
    const lightness = Math.round(50 * brightness);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Draw all nodes
   */
  _drawNodes(ctx) {
    for (let nodeId = 0; nodeId < NUMBER_OF_NODES; nodeId++) {
      const pos = this.nodePixelPositions[nodeId];
      if (!pos) continue;
      
      const isActive = this.activeNodes.has(nodeId);
      const isSelected = this.selectedNodes.has(nodeId);
      const isCenter = nodeId === CENTER_NODE;
      const isBorder = borderNodes.includes(nodeId);
      const isQuad = quadNodes.includes(nodeId);
      
      // Draw glow for active nodes
      if (isActive) {
        this._drawNodeGlow(ctx, pos, nodeId);
      }
      
      // Draw hexagon shape
      this._drawHexagon(ctx, pos, {
        isActive,
        isSelected,
        isCenter,
        isBorder,
        isQuad
      });
    }
  }

  /**
   * Draw glow effect around active node
   */
  _drawNodeGlow(ctx, pos, nodeId) {
    // Animated glow using rainbow colors
    const time = performance.now() / 1000;
    const hue = (time * 60 + nodeId * 30) % 360;
    
    const gradient = ctx.createRadialGradient(
      pos.x, pos.y, NODE_RADIUS * 0.5,
      pos.x, pos.y, NODE_GLOW_RADIUS
    );
    
    gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
    gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.3)`);
    gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, NODE_GLOW_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  /**
   * Draw a hexagonal node
   */
  _drawHexagon(ctx, pos, options = {}) {
    const { isActive, isSelected, isCenter, isBorder } = options;
    const radius = isCenter ? NODE_RADIUS * 1.2 : NODE_RADIUS;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = pos.x + radius * Math.cos(angle);
      const y = pos.y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    // Fill color
    if (isSelected) {
      ctx.fillStyle = '#ff4444';
    } else if (isActive) {
      ctx.fillStyle = '#444444';
    } else {
      ctx.fillStyle = INACTIVE_NODE_COLOR;
    }
    ctx.fill();
    
    // Border
    if (isSelected || isActive) {
      ctx.strokeStyle = isSelected ? '#ff6666' : ACTIVE_NODE_BORDER_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Center dot for starburst node
    if (isCenter) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#888' : '#444';
      ctx.fill();
    }
  }

  /**
   * Handle click events for node interaction
   */
  _handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if click is on any node
    for (let nodeId = 0; nodeId < NUMBER_OF_NODES; nodeId++) {
      const pos = this.nodePixelPositions[nodeId];
      if (!pos) continue;
      
      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (distance <= NODE_RADIUS * 1.5) {
        eventBus.emit('canvas:nodeClicked', nodeId);
        return;
      }
    }
    
    // Click on empty space
    eventBus.emit('canvas:backgroundClicked');
  }

  /**
   * Start animation loop for glow effects
   */
  startAnimationLoop() {
    const animate = () => {
      // Only re-render if there are active nodes (for glow animation)
      if (this.activeNodes.size > 0) {
        this.render();
      }
      requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Set active nodes
   */
  setActiveNodes(nodeIds) {
    this.activeNodes = new Set(nodeIds);
    this.render();
  }

  /**
   * Set selected nodes
   */
  setSelectedNodes(nodeIds) {
    this.selectedNodes = new Set(nodeIds);
    this.render();
  }

  /**
   * Force a render with given LED state (for external control)
   */
  renderWithState(ledState) {
    this.ledState = ledState;
    this.render();
  }

  /**
   * Get the canvas element
   */
  getCanvas() {
    return this.canvas;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const canvasVisualizer = new CanvasVisualizer();
