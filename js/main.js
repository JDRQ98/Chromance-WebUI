// File: /js/main.js — Profile editor with event-based timeline system

import { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes } from './nodeManager.js';
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js';
import { initTimeline, getSelectedEventIndex, updateTimeline } from './timelineManager.js';

const MAX_EVENTS = 5;
let globalBPM = 120.0;

function msToBeats(ms) {
    return (ms * globalBPM / 60000);
}

function formatBeats(ms) {
    return `${msToBeats(ms).toFixed(1)} beats (${ms}ms)`;
}

function updateLifeSpanBeatDisplay(ms) {
    const el = document.getElementById('eventLifeSpanBeats');
    if (el) el.textContent = formatBeats(ms);
}

// ProfileSettings now matches the firmware's event-based format
let ProfileSettings = {
    ProfileName: 'Default Profile',
    Active: true,
    ProfilePeriod_ms: 5000,
    NumberOfColors: 3,
    Colors: ['#FF0000', '#00FF00', '#0000FF'],
    Decay: 0.985,
    Events: [
        {
            Enabled: true,
            TimeOffset_ms: 0,
            RippleLifeSpan: 5000,
            RippleType: 0,
            Behavior: 1,
            RippleSpeed: 0.5,
            RainbowDeltaPerTick: 200,
            Direction: -1,
            ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        { Enabled: false, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: new Array(19).fill(0) },
        { Enabled: false, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: new Array(19).fill(0) },
        { Enabled: false, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: new Array(19).fill(0) },
        { Enabled: false, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: new Array(19).fill(0) }
    ]
};

// Convert firmware profile (from GET) to editor format
class ProfileDataConverter {
    static convertFromMicrocontroller(mcProfile) {
        const events = (mcProfile.Events || []).map(evt => ({
            Enabled: evt.Enabled || false,
            TimeOffset_ms: evt.TimeOffset_ms || 0,
            RippleLifeSpan: evt.RippleLifeSpan || 3000,
            RippleType: evt.RippleType || 0,
            Behavior: evt.Behavior || 0,
            RippleSpeed: evt.RippleSpeed || 0.5,
            RainbowDeltaPerTick: evt.RainbowDeltaPerTick || 0,
            Direction: evt.Direction !== undefined ? evt.Direction : -1,
            ActiveNodes: evt.ActiveNodes || new Array(19).fill(0)
        }));
        // Pad to MAX_EVENTS
        const period = mcProfile.ProfilePeriod_ms || 5000;
        while (events.length < MAX_EVENTS) {
            events.push({ Enabled: false, TimeOffset_ms: 0, RippleLifeSpan: period, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: new Array(19).fill(0) });
        }
        return {
            ProfileIndex: mcProfile.ProfileIndex,
            ProfileName: mcProfile.ProfileName || 'Unnamed',
            Active: mcProfile.Active,
            ProfilePeriod_ms: mcProfile.ProfilePeriod_ms || 5000,
            NumberOfColors: mcProfile.NumberOfColors || 1,
            Colors: mcProfile.Colors || ['#FF0000'],
            Events: events
        };
    }

    static convertToMicrocontroller(editorProfile) {
        return {
            ProfileIndex: editorProfile.ProfileIndex,
            ProfileName: editorProfile.ProfileName,
            Active: editorProfile.Active ? 1 : 0,
            ProfilePeriod_ms: editorProfile.ProfilePeriod_ms,
            NumberOfColors: editorProfile.NumberOfColors,
            Colors: editorProfile.Colors,
            Events: editorProfile.Events.map(evt => ({
                Enabled: evt.Enabled,
                TimeOffset_ms: evt.TimeOffset_ms || 0,
                RippleLifeSpan: evt.RippleLifeSpan || 3000,
                RippleType: evt.RippleType || 0,
                Behavior: evt.Behavior || 0,
                RippleSpeed: evt.RippleSpeed || 0.5,
                RainbowDeltaPerTick: evt.RainbowDeltaPerTick || 0,
                Direction: evt.Direction !== undefined ? evt.Direction : -1,
                ActiveNodes: evt.ActiveNodes || new Array(19).fill(0)
            }))
        };
    }
}

// Get active node IDs from selected event
function getSelectedEventActiveNodeIds() {
    const idx = getSelectedEventIndex();
    const evt = ProfileSettings.Events[idx];
    if (!evt || !evt.Enabled) return [];
    const ids = [];
    evt.ActiveNodes.forEach((v, i) => { if (v) ids.push(i); });
    return ids;
}

// Load event settings into the UI panel
function loadEventSettingsPanel(eventIndex) {
    const evt = ProfileSettings.Events[eventIndex];
    if (!evt || !evt.Enabled) return;

    document.getElementById('eventSettingsTitle').textContent = `Event t${eventIndex}`;
    document.getElementById('eventRippleType').value = evt.RippleType;
    document.getElementById('eventBehavior').value = evt.Behavior;
    document.getElementById('eventDirection').value = evt.Direction;
    document.getElementById('eventSpeed').value = evt.RippleSpeed;
    document.getElementById('eventSpeedDisplay').textContent = parseFloat(evt.RippleSpeed).toFixed(2);
    document.getElementById('eventLifeSpan').value = evt.RippleLifeSpan;
    updateLifeSpanBeatDisplay(evt.RippleLifeSpan);
    document.getElementById('eventHueDelta').value = evt.RainbowDeltaPerTick;

    // Update hex grid to show this event's nodes
    setActiveNodes(getSelectedEventActiveNodeIds());
    updateNodeStyles(ProfileSettings);
}

// Read event settings from UI back to ProfileSettings
function readEventSettingsPanel() {
    const idx = getSelectedEventIndex();
    const evt = ProfileSettings.Events[idx];
    if (!evt || !evt.Enabled) return;

    evt.RippleType = parseInt(document.getElementById('eventRippleType').value);
    evt.Behavior = parseInt(document.getElementById('eventBehavior').value);
    evt.Direction = parseInt(document.getElementById('eventDirection').value);
    evt.RippleSpeed = parseFloat(document.getElementById('eventSpeed').value);
    evt.RippleLifeSpan = parseInt(document.getElementById('eventLifeSpan').value);
    evt.RainbowDeltaPerTick = parseInt(document.getElementById('eventHueDelta').value);
}

// Load colors into the UI
function loadColors() {
    const container = document.getElementById('colorContainer');
    container.innerHTML = '';
    const colors = ProfileSettings.Colors || ['#FF0000'];
    colors.forEach(color => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = color;
        input.classList.add('color-swatch');
        input.addEventListener('change', () => {
            readColors();
            syncToMicrocontroller();
        });
        container.appendChild(input);
    });
}

// Read colors from UI
function readColors() {
    const inputs = document.querySelectorAll('#colorContainer input');
    ProfileSettings.Colors = Array.from(inputs).map(i => i.value);
    ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
}

async function initializeApp() {
    drawHexagon(); // Must draw SVG nodes first
    initNodeManager(updateNodeStyles, null, ProfileSettings);

    await loadProfilesFromMicrocontroller();
    loadProfileFromLandingPage();

    // Initialize timeline after profile is loaded
    initTimeline(ProfileSettings, (eventIndex) => {
        loadEventSettingsPanel(eventIndex);
    });

    setupProfilePeriodSlider();
    setupEventSettingsListeners();
    setupColorControls();
    setupProfileNameEditing();
    loadColors();
    loadEventSettingsPanel(0);
    updateNodeStyles(ProfileSettings);
}

function setupProfilePeriodSlider() {
    const slider = document.getElementById('profilePeriodSlider');
    const display = document.getElementById('profilePeriodDisplay');
    slider.value = ProfileSettings.ProfilePeriod_ms;
    display.textContent = formatBeats(ProfileSettings.ProfilePeriod_ms);

    slider.addEventListener('input', () => {
        display.textContent = formatBeats(parseInt(slider.value));
    });
    slider.addEventListener('change', () => {
        ProfileSettings.ProfilePeriod_ms = parseInt(slider.value);
        updateTimeline();
        syncToMicrocontroller();
    });
}

function setupEventSettingsListeners() {
    const ids = ['eventRippleType', 'eventBehavior', 'eventDirection', 'eventHueDelta'];
    ids.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            readEventSettingsPanel();
            syncToMicrocontroller();
        });
    });

    const lifeSpanInput = document.getElementById('eventLifeSpan');
    lifeSpanInput.addEventListener('change', () => {
        readEventSettingsPanel();
        updateLifeSpanBeatDisplay(parseInt(lifeSpanInput.value));
        syncToMicrocontroller();
    });
    lifeSpanInput.addEventListener('input', () => {
        updateLifeSpanBeatDisplay(parseInt(lifeSpanInput.value));
    });

    const speedSlider = document.getElementById('eventSpeed');
    const speedDisplay = document.getElementById('eventSpeedDisplay');
    speedSlider.addEventListener('input', () => {
        speedDisplay.textContent = parseFloat(speedSlider.value).toFixed(2);
    });
    speedSlider.addEventListener('change', () => {
        readEventSettingsPanel();
        syncToMicrocontroller();
    });
}

function setupColorControls() {
    document.getElementById('addColorButton').addEventListener('click', () => {
        if (ProfileSettings.Colors.length < 16) {
            ProfileSettings.Colors.push('#ffffff');
            ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
            loadColors();
            syncToMicrocontroller();
        }
    });
    document.getElementById('removeColorButton').addEventListener('click', () => {
        if (ProfileSettings.Colors.length > 1) {
            ProfileSettings.Colors.pop();
            ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
            loadColors();
            syncToMicrocontroller();
        }
    });
    document.getElementById('rainbowButton').addEventListener('click', () => {
        ProfileSettings.Colors = generateRainbowColors(ProfileSettings.Colors.length);
        ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
        loadColors();
        syncToMicrocontroller();
    });
    document.getElementById('randomButton').addEventListener('click', () => {
        ProfileSettings.Colors = generateRandomColors(ProfileSettings.Colors.length);
        ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
        loadColors();
        syncToMicrocontroller();
    });
    document.getElementById('similarButton').addEventListener('click', () => {
        ProfileSettings.Colors = generateSimilarColors(ProfileSettings.Colors.length, ProfileSettings.Colors[0]);
        ProfileSettings.NumberOfColors = ProfileSettings.Colors.length;
        loadColors();
        syncToMicrocontroller();
    });
}

async function loadProfilesFromMicrocontroller() {
    try {
        const response = await fetch('/getCurrentProfiles', { method: 'GET', mode: 'cors', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {
            text = text.replace(/,(\s*[}\]])/g, '$1');
            data = JSON.parse(text);
        }
        console.log('Received profiles:', data);
        if (data.Decay !== undefined) ProfileSettings.Decay = data.Decay;
        if (data.GlobalBPM !== undefined) globalBPM = data.GlobalBPM;
        if (data.Profiles && Array.isArray(data.Profiles)) updateProfilesDropdown(data.Profiles);
        return data;
    } catch (error) {
        console.error('Error loading profiles:', error);
        return null;
    }
}

function updateProfilesDropdown(profiles) {
    const dropdown = document.getElementById('profileDropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    profiles.forEach((profile, index) => {
        const option = document.createElement('option');
        option.value = `micro_${index}`;
        option.text = profile.ProfileName || `Profile ${index}`;
        dropdown.add(option);
    });
    const isNewProfile = localStorage.getItem('isNewProfile') === 'true';
    if (isNewProfile) {
        const opt = document.createElement('option');
        opt.value = 'new';
        opt.text = 'New Profile';
        opt.selected = true;
        dropdown.add(opt);
    }
}

function loadProfileFromLandingPage() {
    const editingProfileIndex = localStorage.getItem('editingProfileIndex');
    const profileData = localStorage.getItem('profileData');
    const isNewProfile = localStorage.getItem('isNewProfile') === 'true';

    if (editingProfileIndex !== null && profileData) {
        try {
            const mcProfile = JSON.parse(profileData);
            const editorProfile = ProfileDataConverter.convertFromMicrocontroller(mcProfile);
            Object.assign(ProfileSettings, editorProfile);

            const title = document.getElementById('profileTitle');
            if (title) title.textContent = `Profile editor: ${ProfileSettings.ProfileName}`;
            const nameInput = document.getElementById('profileNameInput');
            if (nameInput) nameInput.value = ProfileSettings.ProfileName;

            window.editingProfileIndex = parseInt(editingProfileIndex);
            window.isNewProfile = isNewProfile;

            localStorage.removeItem('editingProfileIndex');
            localStorage.removeItem('profileData');
            localStorage.removeItem('isNewProfile');

            // Update period slider
            const slider = document.getElementById('profilePeriodSlider');
            if (slider) {
                slider.value = ProfileSettings.ProfilePeriod_ms;
                document.getElementById('profilePeriodDisplay').textContent = formatBeats(ProfileSettings.ProfilePeriod_ms);
            }

            loadColors();
            console.log('Loaded profile:', editorProfile);
        } catch (error) {
            console.error('Error loading profile from landing page:', error);
        }
    }
}

function setupProfileNameEditing() {
    const editBtn = document.getElementById('editProfileNameButton');
    const container = document.getElementById('profileNameEditContainer');
    const input = document.getElementById('profileNameInput');
    const saveBtn = document.getElementById('saveProfileNameButton');
    const cancelBtn = document.getElementById('cancelProfileNameButton');
    const dropdown = document.getElementById('profileDropdown');

    if (!editBtn || !container || !input || !saveBtn || !cancelBtn) return;

    editBtn.addEventListener('click', () => {
        container.style.display = 'block';
        input.value = ProfileSettings.ProfileName || '';
        input.focus();
        input.select();
    });
    saveBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (name) {
            ProfileSettings.ProfileName = name;
            const sel = dropdown.options[dropdown.selectedIndex];
            if (sel) sel.text = name;
            const title = document.getElementById('profileTitle');
            if (title) title.textContent = `Profile editor: ${name}`;
            container.style.display = 'none';
        }
    });
    cancelBtn.addEventListener('click', () => { container.style.display = 'none'; });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
        else if (e.key === 'Escape') cancelBtn.click();
    });
}

function sendConfigurationToMicrocontroller() {
    const profileNameInput = document.getElementById('profileNameInput');
    ProfileSettings.ProfileName = profileNameInput ? profileNameInput.value : ProfileSettings.ProfileName;
    ProfileSettings.ProfileIndex = window.editingProfileIndex !== undefined ? window.editingProfileIndex : 0;

    const mcData = ProfileDataConverter.convertToMicrocontroller(ProfileSettings);
    console.log('Sending profile:', mcData);

    fetch('/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcData)
    })
        .then(response => {
            if (!response.ok) return response.text().then(t => { throw new Error(`HTTP ${response.status}: ${t}`); });
            return response.json().catch(() => ({}));
        })
        .then(() => {
            showNotification(window.isNewProfile ? 'New profile created!' : 'Profile updated!', 'success');
            if (window.editingProfileIndex !== undefined) {
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            }
        })
        .catch(error => {
            console.error('Error saving:', error);
            showNotification('Error saving profile', 'error');
        });

    // Also save Decay
    fetch('/updateGlobalParameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Decay: ProfileSettings.Decay })
    }).catch(e => console.error('Decay sync error:', e));
}

function syncToMicrocontroller() {
    const profileNameInput = document.getElementById('profileNameInput');
    ProfileSettings.ProfileName = profileNameInput ? profileNameInput.value : ProfileSettings.ProfileName;
    ProfileSettings.ProfileIndex = window.editingProfileIndex !== undefined ? window.editingProfileIndex : 0;

    const mcData = ProfileDataConverter.convertToMicrocontroller(ProfileSettings);
    console.log('Live sync:', mcData);

    fetch('/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcData)
    }).catch(e => console.error('Live sync error:', e));

    fetch('/updateGlobalParameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Decay: ProfileSettings.Decay })
    }).catch(e => console.error('Decay sync error:', e));
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    Object.assign(notification.style, {
        position: 'fixed', top: '20px', right: '20px', padding: '1rem 1.5rem',
        borderRadius: '8px', color: 'white', fontWeight: '500', zIndex: '10000',
        transform: 'translateX(100%)', transition: 'transform 0.3s ease', maxWidth: '300px'
    });
    const colors = { success: '#28a745', error: '#dc3545', warning: '#ffc107', info: '#007bff' };
    notification.style.backgroundColor = colors[type] || colors.info;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();

    document.getElementById('backButton').addEventListener('click', () => { window.location.href = 'index.html'; });
});

// Make accessible globally for nodeManager etc.
window.mainJS = {
    sendConfigurationToMicrocontroller,
    syncToMicrocontroller,
    getSelectedEventIndex,
    ProfileSettings
};

export { ProfileSettings, globalBPM, msToBeats, formatBeats, generateRainbowColors, generateRandomColors, generateSimilarColors };
