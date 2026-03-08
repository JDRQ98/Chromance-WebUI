// File: /js/timelineManager.js — Timeline rendering, drag-drop, event management
import { globalBPM, msToBeats } from './main.js';

const MAX_EVENTS = 5;

let selectedEventIndex = 0;
let profileSettings = null;
let onEventSelected = null; // callback when event selection changes

function initTimeline(settings, eventSelectedCallback) {
    profileSettings = settings;
    onEventSelected = eventSelectedCallback;

    document.getElementById('addEventButton').addEventListener('click', addEvent);
    document.getElementById('removeEventButton').addEventListener('click', removeEvent);

    renderTimeline();
    selectEvent(0);
}

function renderTimeline() {
    const bar = document.getElementById('timelineBar');
    const labels = document.getElementById('timelineLabels');
    bar.innerHTML = '';
    labels.innerHTML = '';

    const period = profileSettings.ProfilePeriod_ms || 5000;
    const events = profileSettings.Events || [];

    events.forEach((evt, index) => {
        if (!evt.Enabled) return;

        const pct = (evt.TimeOffset_ms / period) * 100;
        const marker = document.createElement('div');
        marker.className = 'timeline-marker' + (index === selectedEventIndex ? ' selected' : '');
        marker.style.left = `${pct}%`;
        marker.textContent = `t${index}`;
        marker.dataset.eventIndex = index;

        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            selectEvent(index);
        });

        // Drag support (only for t1+ — t0 is fixed at 0)
        if (index > 0) {
            marker.draggable = false; // we use pointer events instead
            marker.addEventListener('pointerdown', (e) => startDrag(e, index));
        }

        bar.appendChild(marker);

        // Label with beat info
        const label = document.createElement('span');
        label.className = 'timeline-label';
        label.style.left = `${pct}%`;
        const beatVal = msToBeats(evt.TimeOffset_ms).toFixed(1);
        label.textContent = `beat ${beatVal}`;
        label.title = `${evt.TimeOffset_ms}ms`;
        labels.appendChild(label);
    });

    // End label
    const endLabel = document.createElement('span');
    endLabel.className = 'timeline-label timeline-label-end';
    endLabel.style.left = '100%';
    const endBeat = msToBeats(period).toFixed(1);
    endLabel.textContent = `beat ${endBeat}`;
    endLabel.title = `${period}ms`;
    labels.appendChild(endLabel);
}

function selectEvent(index) {
    const events = profileSettings.Events || [];
    if (index < 0 || index >= events.length || !events[index].Enabled) return;

    selectedEventIndex = index;
    renderTimeline();

    if (onEventSelected) {
        onEventSelected(index);
    }
}

function addEvent() {
    const events = profileSettings.Events || [];
    // Find first disabled slot
    let slot = -1;
    for (let i = 0; i < MAX_EVENTS; i++) {
        if (!events[i] || !events[i].Enabled) {
            slot = i;
            break;
        }
    }
    if (slot < 0) return; // all slots used

    const period = profileSettings.ProfilePeriod_ms || 5000;
    // Place new event at midpoint of largest gap
    const offsets = events.filter(e => e && e.Enabled).map(e => e.TimeOffset_ms).sort((a, b) => a - b);
    offsets.push(period);
    let maxGap = 0, gapStart = 0;
    let prev = 0;
    for (const offset of offsets) {
        const gap = offset - prev;
        if (gap > maxGap) {
            maxGap = gap;
            gapStart = prev;
        }
        prev = offset;
    }
    const newOffset = Math.round(gapStart + maxGap / 2);

    events[slot] = {
        Enabled: true,
        TimeOffset_ms: newOffset,
        RippleLifeSpan: Math.max(1, period - newOffset),
        RippleType: 0,
        Behavior: 1,
        RippleSpeed: 0.5,
        RainbowDeltaPerTick: 200,
        Direction: -1,
        ActiveNodes: new Array(19).fill(0)
    };
    events[slot].ActiveNodes[9] = 1; // default to center node

    profileSettings.Events = events;
    renderTimeline();
    selectEvent(slot);
}

function removeEvent() {
    const events = profileSettings.Events || [];
    // Can't remove the last enabled event
    const enabledCount = events.filter(e => e && e.Enabled).length;
    if (enabledCount <= 1) return;

    // Remove the currently selected event
    if (events[selectedEventIndex]) {
        events[selectedEventIndex].Enabled = false;
    }

    // Select the first enabled event
    for (let i = 0; i < events.length; i++) {
        if (events[i] && events[i].Enabled) {
            selectEvent(i);
            break;
        }
    }
    renderTimeline();
}

// Drag handling
let dragIndex = -1;
let dragBarRect = null;

function startDrag(e, index) {
    dragIndex = index;
    const bar = document.getElementById('timelineBar');
    dragBarRect = bar.getBoundingClientRect();

    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag);
    e.preventDefault();
}

function onDrag(e) {
    if (dragIndex < 0 || !dragBarRect) return;

    const x = e.clientX - dragBarRect.left;
    const pct = Math.max(0, Math.min(1, x / dragBarRect.width));
    const period = profileSettings.ProfilePeriod_ms || 5000;
    const newOffset = Math.round(pct * period);

    const events = profileSettings.Events || [];
    if (events[dragIndex]) {
        events[dragIndex].TimeOffset_ms = Math.max(0, Math.min(period - 1, newOffset));
        renderTimeline();
    }
}

function endDrag() {
    dragIndex = -1;
    dragBarRect = null;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', endDrag);
}

function getSelectedEventIndex() {
    return selectedEventIndex;
}

function updateTimeline() {
    renderTimeline();
}

export { initTimeline, renderTimeline, selectEvent, getSelectedEventIndex, updateTimeline };
