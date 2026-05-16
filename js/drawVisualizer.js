// drawVisualizer.js - Generates SVG for Profile Editor
const HEX_NODE_POSITIONS = [
    [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2],
    [1, 3], [3, 3], [0, 4], [2, 4], [4, 4],
    [1, 5], [3, 5], [0, 6], [2, 6], [4, 6],
    [1, 7], [3, 7], [2, 8]
];

const HEX_SEGMENT_CONNECTIONS = [
    [17, 18], [15, 17], [10, 15], [7, 10], [7, 9], [9, 12], [12, 17], [14, 17],
    [4, 9], [1, 4], [0, 1], [0, 2], [2, 5], [5, 10], [10, 12],
    [16, 18], [13, 16], [8, 13], [6, 8], [6, 9], [9, 14], [14, 16],
    [11, 16], [8, 11], [3, 8], [1, 3], [1, 6], [9, 11], [2, 4], [2, 7]
];

function drawHexagon() {
    const container = document.getElementById('editorHexGrid');
    if (!container) return;
    container.innerHTML = '';

    const scale = 30, pad = 15;
    const W = 4 * scale + 2 * pad;   // 150
    const H = 8 * scale + 2 * pad;   // 270

    // Mirror x so the UI matches the physical view from behind the device
    const px = HEX_NODE_POSITIONS.map(([c, r]) => [W - (c * scale + pad), r * scale + pad]);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Use responsive scaling so it naturally fits the container
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.maxHeight = '400px';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';

    // Draw segment lines (decorative)
    HEX_SEGMENT_CONNECTIONS.forEach(([n1, n2]) => {
        const [x1, y1] = px[n1], [x2, y2] = px[n2];
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1); line.setAttribute('y1', y1);
        line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#333');
        line.setAttribute('stroke-width', 2);
        line.setAttribute('stroke-linecap', 'round');
        line.style.pointerEvents = 'none';
        svg.appendChild(line);
    });

    // Draw clickable node circles and wrap them to maintain compatibility with nodeManager
    px.forEach(([x, y], ni) => {
        // We create a group to act as the "wrap" so nodeManager can stick classes on it
        const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrap.classList.add('svg-hex-wrap');
        wrap.dataset.id = ni;

        const hexRadius = 12;
        let points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (30 + 60 * i);
            points.push(`${x + hexRadius * Math.cos(angle)},${y + hexRadius * Math.sin(angle)}`);
        }

        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', points.join(' '));
        poly.classList.add('svg-hex');
        poly.dataset.id = ni;

        wrap.appendChild(poly);
        svg.appendChild(wrap);
    });

    container.appendChild(svg);
}

export { drawHexagon };