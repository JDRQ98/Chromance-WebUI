/**
 * Hexachrome Topology Data
 * Ported from firmware: Chromance-JD/MCAL/mapping.h and mapping.cpp
 * 
 * This module contains the graph structure of the LED installation:
 * - 19 nodes (vertices) arranged in a hexagonal pattern
 * - 30 segments (edges) connecting nodes
 * - 11 LEDs per segment
 * - Node 9 is the center "starburst" node with 6 connections
 */

// ============================================================================
// Constants
// ============================================================================

export const NUMBER_OF_NODES = 19;
export const NUMBER_OF_SEGMENTS = 30;
export const NUMBER_OF_LEDS_PER_SEGMENT = 11;
export const TOTAL_LEDS = NUMBER_OF_SEGMENTS * NUMBER_OF_LEDS_PER_SEGMENT; // 330

export const CENTER_NODE = 9; // Starburst node with 6 connections

// ============================================================================
// Node Categories
// ============================================================================

export const borderNodes = [0, 3, 5, 13, 15, 18];   // 2 connections (perimeter)
export const triNodes = [4, 6, 7, 11, 12, 14];      // 3 connections
export const quadNodes = [1, 2, 8, 10, 16, 17];     // 4 connections
export const cubePairNodes = [6, 7, 14];            // 3 connections (dirs 0, 2, 4)
export const cubeOddNodes = [4, 11, 12];            // 3 connections (dirs 1, 3, 5)

// ============================================================================
// Node Connections
// Indexed by [nodeId][direction] -> segment ID (-1 = no connection)
// Direction: 0=up, 1=60°, 2=120°, 3=down, 4=240°, 5=300° (clockwise from 12 o'clock)
// ============================================================================

export const nodeConnections = [
  [-1, -1, 11, -1, 10, -1],     // Node 0:  2 connections (border)
  [-1, 10,  9, 26, 25, -1],     // Node 1:  4 connections (quad)
  [-1, -1, 12, 29, 28, 11],     // Node 2:  4 connections (quad)
  [-1, 25, -1, 24, -1, -1],     // Node 3:  2 connections (border)
  [-1, 28, -1,  8, -1,  9],     // Node 4:  3 connections (cubeOdd)
  [-1, -1, -1, 13, -1, 12],     // Node 5:  2 connections (border)
  [26, -1, 19, -1, 18, -1],     // Node 6:  3 connections (cubePair)
  [29, -1,  3, -1,  4, -1],     // Node 7:  3 connections (cubePair)
  [24, 18, 23, 17, -1, -1],     // Node 8:  4 connections (quad)
  [ 8,  4,  5, 20, 27, 19],     // Node 9:  6 connections (CENTER - starburst)
  [13, -1, -1,  2, 14,  3],     // Node 10: 4 connections (quad)
  [-1, 27, -1, 22, -1, 23],     // Node 11: 3 connections (cubeOdd)
  [-1, 14, -1,  6, -1,  5],     // Node 12: 3 connections (cubeOdd)
  [17, -1, 16, -1, -1, -1],     // Node 13: 2 connections (border)
  [20, -1,  7, -1, 21, -1],     // Node 14: 3 connections (cubePair)
  [ 2, -1, -1, -1,  1, -1],     // Node 15: 2 connections (border)
  [22, 21, 15, -1, -1, 16],     // Node 16: 4 connections (quad)
  [ 6,  1, -1, -1,  0,  7],     // Node 17: 4 connections (quad)
  [-1,  0, -1, -1, -1, 15]      // Node 18: 2 connections (border)
];

// ============================================================================
// Segment Connections
// Indexed by [segmentId] -> [topNode, bottomNode]
// "Top" = closer to ceiling (direction 0/5/1), "Bottom" = closer to floor (direction 2/3/4)
// ============================================================================

export const segmentConnections = [
  [17, 18], [15, 17], [10, 15], [ 7, 10], [ 7,  9], [ 9, 12],
  [12, 17], [14, 17], [ 4,  9], [ 1,  4], [ 0,  1], [ 0,  2],
  [ 2,  5], [ 5, 10], [10, 12], [16, 18], [13, 16], [ 8, 13],
  [ 6,  8], [ 6,  9], [ 9, 14], [14, 16], [11, 16], [ 8, 11],
  [ 3,  8], [ 1,  3], [ 1,  6], [ 9, 11], [ 2,  4], [ 2,  7]
];

// ============================================================================
// Node Positions (normalized 0-1 coordinates for visualization)
// Calculated from hexagonal grid geometry
// ============================================================================

export const nodePositions = [
  { x: 0.50, y: 0.000 },  // Node 0 (top center)
  { x: 0.25, y: 0.125 },  // Node 1
  { x: 0.75, y: 0.125 },  // Node 2
  { x: 0.00, y: 0.250 },  // Node 3 (border left)
  { x: 0.50, y: 0.250 },  // Node 4
  { x: 1.00, y: 0.250 },  // Node 5 (border right)
  { x: 0.125, y: 0.375 }, // Node 6
  { x: 0.625, y: 0.375 }, // Node 7
  { x: 0.00, y: 0.500 },  // Node 8 (border left)
  { x: 0.375, y: 0.500 }, // Node 9 (CENTER)
  { x: 0.875, y: 0.500 }, // Node 10
  { x: 0.125, y: 0.625 }, // Node 11
  { x: 0.625, y: 0.625 }, // Node 12
  { x: 0.00, y: 0.750 },  // Node 13 (border left)
  { x: 0.375, y: 0.750 }, // Node 14
  { x: 0.875, y: 0.750 }, // Node 15 (border right)
  { x: 0.25, y: 0.875 },  // Node 16
  { x: 0.75, y: 0.875 },  // Node 17
  { x: 0.50, y: 1.000 }   // Node 18 (bottom center)
];

// ============================================================================
// Direction Constants
// ============================================================================

export const ALL_DIRECTIONS = -1;
export const NO_NODE_LIMIT = 0xFFFF;

// Direction offsets in 60° increments (for visualization)
// Direction 0 = up, clockwise
export const directionAngles = [
  -90,  // 0: up (12 o'clock)
  -30,  // 1: 60° (2 o'clock)
   30,  // 2: 120° (4 o'clock)
   90,  // 3: down (6 o'clock)
  150,  // 4: 240° (8 o'clock)
  210   // 5: 300° (10 o'clock)
];

// ============================================================================
// Ripple Behavior Enums
// ============================================================================

export const RippleBehavior = {
  WEAKSAUCE: 0,         // Prefers straight, then wide turns, then sharp
  FEISTY: 1,            // Prefers wide turns
  ANGRY: 2,             // Prefers sharp 120° turns
  ALWAYS_TURNS_RIGHT: 3,
  ALWAYS_TURNS_LEFT: 4
};

export const DirectionBias = {
  NO_PREFERENCE: 0,
  PREFER_LEFT: 1,
  PREFER_LEFT_ONCE: 2,
  PREFER_LEFT_TWICE: 3,
  PREFER_RIGHT: 4,
  PREFER_RIGHT_ONCE: 5,
  PREFER_RIGHT_TWICE: 6
};

export const RippleState = {
  DEAD: 0,
  WITHIN_NODE: 1,
  TRAVELING_UPWARDS: 2,
  TRAVELING_DOWNWARDS: 3
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all valid exit directions from a node (directions with connections)
 */
export function getValidDirections(nodeId) {
  const connections = nodeConnections[nodeId];
  const valid = [];
  for (let dir = 0; dir < 6; dir++) {
    if (connections[dir] >= 0) {
      valid.push(dir);
    }
  }
  return valid;
}

/**
 * Get the segment connecting two nodes, or -1 if not connected
 */
export function getSegmentBetweenNodes(node1, node2) {
  for (let seg = 0; seg < NUMBER_OF_SEGMENTS; seg++) {
    const [top, bottom] = segmentConnections[seg];
    if ((top === node1 && bottom === node2) || (top === node2 && bottom === node1)) {
      return seg;
    }
  }
  return -1;
}

/**
 * Get pixel coordinates for a node given canvas dimensions
 */
export function getNodePixelPosition(nodeId, canvasWidth, canvasHeight, padding = 20) {
  const pos = nodePositions[nodeId];
  const usableWidth = canvasWidth - padding * 2;
  const usableHeight = canvasHeight - padding * 2;
  return {
    x: padding + pos.x * usableWidth,
    y: padding + pos.y * usableHeight
  };
}

/**
 * Get the "other" node at the end of a segment
 */
export function getOtherNode(segmentId, currentNodeId) {
  const [top, bottom] = segmentConnections[segmentId];
  return top === currentNodeId ? bottom : top;
}

/**
 * Determine if traveling from node in direction goes "upward" (toward ceiling)
 * Directions 5, 0, 1 are upward; 2, 3, 4 are downward
 */
export function isUpwardDirection(direction) {
  return direction === 5 || direction === 0 || direction === 1;
}
