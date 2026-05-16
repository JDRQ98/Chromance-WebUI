// Landing Page JavaScript
let GlobalParameters_MasterFireEnabled = true;

// Hex topology constants (mirror mapping.cpp)
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
// Precompute: for each node, which segment indices touch it
const HEX_NODE_SEGMENT_MAP = (() => {
    const map = Array.from({ length: 19 }, () => []);
    HEX_SEGMENT_CONNECTIONS.forEach(([n1, n2], si) => {
        map[n1].push(si);
        map[n2].push(si);
    });
    return map;
})();

class ProfileManager {
    constructor() {
        this.profiles = [];
        this.currentProfileIndex = -1;
        this.brightnessTimeout = null;
        this.sequencerState = {
            enabled: false,
            mode: 0,
            dwellTime: 30,
            currentProfile: 0
        };
        this.bpmState = {
            bpm: 120.0,
            tapTimes: [],
            tapTimeout: null,
            beatPulseInterval: null,
            lockSpeedToBPM: false
        };
        this.stableColorState = {
            mode: false,          // false = ripple, true = stable color
            color: '#0000ff',
            pulseFrequency: 0.3,
            pulseDepth: 0.4,
            segments: new Array(30).fill(true),
            selectionMode: 'segment',   // 'segment' | 'node'
            nodeSelection: new Array(19).fill(true)
        };
        this.scSeqState = {
            enabled: false,
            mode: 0,              // 0=sequential, 1=random
            timingMode: 0,        // 0=time, 1=beat, 2=fps
            dwellTime: 30.0,      // seconds (0.5-120)
            beatsPerSwitch: 1.0,  // beat mode
            fps: 12,              // fps mode
            cycleColors: true,
            fadeEnabled: false,
            fadeOuter: true,
            fadeInner: true,
            fadeDuration_ms: 300,
            currentPreset: 0,
            numberOfPresets: 0,
            presets: []           // array of {Active, PresetName, Hue, Segments}
        };
        this.scSeqEditingIndex = -1;  // -1 = not editing, N = editing preset N
        this.scSeqDragStartIdx = null; // drag-and-drop source index
        // Try hexagono.local first, fallback to IP address
        this.baseUrl = 'http://hexagono.local';
        this.fallbackUrl = 'http://192.168.100.37';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadProfiles();
    }

    setupEventListeners() {
        // Master on/off button
        document.getElementById('masterFireBtn').addEventListener('click', () => {
            this.toggleMasterFire();
        });

        // Refresh button
        document.getElementById('refreshButton').addEventListener('click', () => {
            this.loadProfiles();
        });

        // Create profile button
        document.getElementById('createProfileButton').addEventListener('click', () => {
            this.createNewProfile();
        });

        // Brightness slider
        const brightnessSlider = document.getElementById('brightnessSlider');
        const brightnessValue = document.getElementById('brightnessValue');
        brightnessSlider.addEventListener('input', () => {
            brightnessValue.textContent = brightnessSlider.value;
        });
        brightnessSlider.addEventListener('change', () => {
            this.sendBrightness(parseInt(brightnessSlider.value));
        });

        // Sequencer toggle
        document.getElementById('sequencerToggle').addEventListener('change', (e) => {
            this.setSequencerEnabled(e.target.checked);
        });

        // Sequencer mode
        document.getElementById('sequencerMode').addEventListener('change', (e) => {
            this.sendSequencerUpdate({ SequencerMode: parseInt(e.target.value) });
        });

        // Sequencer dwell time
        const dwellSlider = document.getElementById('sequencerDwell');
        const dwellValue = document.getElementById('dwellValue');
        dwellSlider.addEventListener('input', () => {
            dwellValue.textContent = dwellSlider.value;
        });
        dwellSlider.addEventListener('change', () => {
            this.sendSequencerUpdate({ SequencerDwellTime_s: parseInt(dwellSlider.value) });
        });

        // BPM controls
        const bpmInput = document.getElementById('bpmInput');
        const bpmSlider = document.getElementById('bpmSlider');

        bpmInput.addEventListener('change', () => {
            const val = parseFloat(bpmInput.value);
            if (!isNaN(val) && val >= 40 && val <= 300) {
                this.setBPM(val);
            } else {
                bpmInput.value = this.bpmState.bpm.toFixed(1);
            }
        });

        bpmSlider.addEventListener('input', () => {
            bpmInput.value = parseFloat(bpmSlider.value).toFixed(1);
        });
        bpmSlider.addEventListener('change', () => {
            this.setBPM(parseFloat(bpmSlider.value));
        });

        document.getElementById('tapTempoButton').addEventListener('click', () => {
            this.tapTempo();
        });

        document.getElementById('bpmDown1').addEventListener('click', () => this.adjustBPM(-1));
        document.getElementById('bpmUp1').addEventListener('click', () => this.adjustBPM(1));
        document.getElementById('bpmDown10').addEventListener('click', () => this.adjustBPM(-10));
        document.getElementById('bpmUp10').addEventListener('click', () => this.adjustBPM(10));

        document.getElementById('lockSpeedToggle').addEventListener('change', (e) => {
            this.bpmState.lockSpeedToBPM = e.target.checked;
        });

        // Keyboard hotkeys
        document.addEventListener('keydown', (e) => this.handleHotkey(e));

        // Mode toggle
        document.getElementById('modeRippleBtn').addEventListener('click', () => {
            if (this.stableColorState.mode) this.setStableColorMode(false);
        });
        document.getElementById('modeStableBtn').addEventListener('click', () => {
            if (!this.stableColorState.mode) this.setStableColorMode(true);
        });

        // Stable color controls
        document.getElementById('stableColorPicker').addEventListener('change', (e) => {
            this.stableColorState.color = e.target.value;
            this.sendGlobalParam({ StableColorHue: e.target.value });
            this.buildStableColorSVG();
            this.renderFavorites(); // update active swatch highlight
        });

        // Add current color to favorites
        document.getElementById('addFavoriteBtn').addEventListener('click', () => {
            const color = this.stableColorState.color;
            const favs = this.loadFavorites();
            if (!favs.includes(color)) {
                favs.push(color);
                this.saveFavorites(favs);
                this.renderFavorites();
            }
        });

        const pulseFreqSlider = document.getElementById('pulseFreqSlider');
        const pulseFreqValue = document.getElementById('pulseFreqValue');
        pulseFreqSlider.addEventListener('input', () => {
            const hz = parseInt(pulseFreqSlider.value) / 10;
            pulseFreqValue.textContent = hz.toFixed(2);
        });
        pulseFreqSlider.addEventListener('change', () => {
            const hz = parseInt(pulseFreqSlider.value) / 10;
            this.stableColorState.pulseFrequency = hz;
            this.sendGlobalParam({ PulseFrequency: hz });
        });

        const pulseDepthSlider = document.getElementById('pulseDepthSlider');
        const pulseDepthValue = document.getElementById('pulseDepthValue');
        pulseDepthSlider.addEventListener('input', () => {
            pulseDepthValue.textContent = pulseDepthSlider.value;
        });
        pulseDepthSlider.addEventListener('change', () => {
            const depth = parseInt(pulseDepthSlider.value) / 100;
            this.stableColorState.pulseDepth = depth;
            this.sendGlobalParam({ PulseDepth: depth });
        });

        // Selection mode toggle (Segments vs Nodes)
        document.getElementById('selModeSegBtn').addEventListener('click', () => {
            if (this.stableColorState.selectionMode === 'segment') return;
            this.stableColorState.selectionMode = 'segment';
            document.getElementById('selModeSegBtn').classList.add('stable-sel-btn-active');
            document.getElementById('selModeNodeBtn').classList.remove('stable-sel-btn-active');
            this.buildStableColorSVG();
        });
        document.getElementById('selModeNodeBtn').addEventListener('click', () => {
            if (this.stableColorState.selectionMode === 'node') return;
            this.stableColorState.selectionMode = 'node';
            // Infer which nodes are "active" from current segment state
            this.stableColorState.nodeSelection = HEX_NODE_SEGMENT_MAP.map(
                segs => segs.some(si => this.stableColorState.segments[si])
            );
            document.getElementById('selModeSegBtn').classList.remove('stable-sel-btn-active');
            document.getElementById('selModeNodeBtn').classList.add('stable-sel-btn-active');
            this.buildStableColorSVG();
        });

        // SC sequencer controls
        document.getElementById('scSeqToggle').addEventListener('change', (e) => {
            this.scSeqState.enabled = e.target.checked;
            this.sendGlobalParam({ SCSeqEnabled: this.scSeqState.enabled });
            this.updateSCSeqUI();
        });
        document.getElementById('scSeqMode').addEventListener('change', (e) => {
            this.scSeqState.mode = parseInt(e.target.value);
            this.sendGlobalParam({ SCSeqMode: this.scSeqState.mode });
        });
        document.getElementById('scSeqTimingMode').addEventListener('change', (e) => {
            this.scSeqState.timingMode = parseInt(e.target.value);
            this.sendGlobalParam({ SCSeqTimingMode: this.scSeqState.timingMode });
            this.updateSCSeqTimingUI();
        });
        document.getElementById('scSeqDwell').addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            document.getElementById('scDwellValue').textContent = v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
        });
        document.getElementById('scSeqDwell').addEventListener('change', (e) => {
            this.scSeqState.dwellTime = parseFloat(e.target.value);
            this.sendGlobalParam({ SCSeqDwellTime_s: this.scSeqState.dwellTime });
        });
        document.getElementById('scSeqBeats').addEventListener('change', (e) => {
            this.scSeqState.beatsPerSwitch = parseFloat(e.target.value);
            this.sendGlobalParam({ SCSeqBeatsPerSwitch: this.scSeqState.beatsPerSwitch });
        });
        document.getElementById('scSeqFPS').addEventListener('input', (e) => {
            document.getElementById('scFPSValue').textContent = e.target.value;
        });
        document.getElementById('scSeqFPS').addEventListener('change', (e) => {
            this.scSeqState.fps = parseInt(e.target.value);
            this.sendGlobalParam({ SCSeqFPS: this.scSeqState.fps });
        });
        document.getElementById('scSeqCycleColors').addEventListener('change', (e) => {
            this.scSeqState.cycleColors = e.target.checked;
            this.sendGlobalParam({ SCSeqCycleColors: this.scSeqState.cycleColors });
        });
        document.getElementById('scSeqFadeEnabled').addEventListener('change', (e) => {
            this.scSeqState.fadeEnabled = e.target.checked;
            this.sendGlobalParam({ SCSeqFadeEnabled: this.scSeqState.fadeEnabled });
            document.getElementById('scFadeDurationRow').style.display = e.target.checked ? 'flex' : 'none';
            document.getElementById('scFadeZoneRow').style.display = e.target.checked ? 'flex' : 'none';
        });
        document.getElementById('scFadeDuration').addEventListener('input', (e) => {
            document.getElementById('scFadeValue').textContent = e.target.value;
        });
        document.getElementById('scFadeDuration').addEventListener('change', (e) => {
            this.scSeqState.fadeDuration_ms = parseInt(e.target.value);
            this.sendGlobalParam({ SCSeqFadeDuration_ms: this.scSeqState.fadeDuration_ms });
        });
        document.getElementById('scSeqFadeOuter').addEventListener('change', (e) => {
            this.scSeqState.fadeOuter = e.target.checked;
            this.sendGlobalParam({ SCSeqFadeOuter: this.scSeqState.fadeOuter });
        });
        document.getElementById('scSeqFadeInner').addEventListener('change', (e) => {
            this.scSeqState.fadeInner = e.target.checked;
            this.sendGlobalParam({ SCSeqFadeInner: this.scSeqState.fadeInner });
        });
        document.getElementById('scSavePresetBtn').addEventListener('click', () => {
            this.saveCurrentAsPreset();
        });

        // Restore defaults button
        document.getElementById('restoreDefaultsButton').addEventListener('click', () => {
            this.showRestoreDefaultsModal();
        });

        // Retry buttons
        document.getElementById('retryButton').addEventListener('click', () => {
            this.loadProfiles();
        });

        document.getElementById('refreshEmptyButton').addEventListener('click', () => {
            this.loadProfiles();
        });

        // Modal event listeners
        document.getElementById('modalCancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalConfirm').addEventListener('click', () => {
            this.confirmAction();
        });

        // Overlay click to close modal
        document.getElementById('overlay').addEventListener('click', () => {
            this.hideModal();
        });

        // Restore defaults modal event listeners
        document.getElementById('restoreCancel').addEventListener('click', () => {
            this.hideRestoreDefaultsModal();
        });

        document.getElementById('restoreConfirm').addEventListener('click', () => {
            this.confirmRestoreDefaults();
        });
    }

    async loadProfiles() {
        this.showLoadingState();

        // Try primary URL first, then fallback to IP
        const urls = [this.baseUrl, this.fallbackUrl];

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`Trying to connect to: ${url}`);

            try {
                const response = await fetch(`${url}/getCurrentProfiles`, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                console.log(`Response from ${url}:`, response.status, response.statusText);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                // Get the response text first, then try to parse it
                const text = await response.text();
                console.log('Raw response:', text);

                let data;
                try {
                    data = JSON.parse(text);
                } catch (jsonError) {
                    console.error('JSON parsing error:', jsonError);

                    // Fix trailing comma issue - more comprehensive fix
                    let fixedText = text;

                    // Remove trailing commas before closing brackets and braces
                    fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');

                    // Fix the specific issue in your JSON structure
                    fixedText = fixedText.replace(/,(\s*])/g, '$1');
                    fixedText = fixedText.replace(/,(\s*})/g, '$1');

                    console.log('Fixed JSON:', fixedText);

                    try {
                        data = JSON.parse(fixedText);
                    } catch (secondError) {
                        console.error('Second JSON parsing error:', secondError);
                        console.log('Still broken JSON:', fixedText);
                        throw new Error(`JSON parsing failed: ${jsonError.message}. Raw response: ${text.substring(0, 200)}...`);
                    }
                }

                console.log('Received data:', data);

                // Load brightness from response
                if (data.Brightness !== undefined) {
                    const slider = document.getElementById('brightnessSlider');
                    const display = document.getElementById('brightnessValue');
                    slider.value = data.Brightness;
                    display.textContent = data.Brightness;
                }

                // Load master fire state
                if (data.MasterFireRippleEnabled !== undefined) {
                    GlobalParameters_MasterFireEnabled = !!data.MasterFireRippleEnabled;
                    this.updateMasterFireUI();
                }

                // Load BPM from response
                if (data.GlobalBPM !== undefined) {
                    this.bpmState.bpm = data.GlobalBPM;
                    this.updateBPMUI();
                    this.startBeatPulse();
                }

                // Load sequencer state from response
                if (data.SequencerEnabled !== undefined) {
                    this.sequencerState.enabled = data.SequencerEnabled;
                    this.sequencerState.mode = data.SequencerMode || 0;
                    this.sequencerState.dwellTime = data.SequencerDwellTime_s || 30;
                    this.sequencerState.currentProfile = data.SequencerCurrentProfile || 0;
                    this.updateSequencerUI();
                }

                // Load stable color state from response
                if (data.StableColorMode !== undefined) {
                    this.stableColorState.mode = !!data.StableColorMode;
                    if (data.StableColorHue) this.stableColorState.color = data.StableColorHue;
                    if (data.PulseFrequency !== undefined) this.stableColorState.pulseFrequency = data.PulseFrequency;
                    if (data.PulseDepth !== undefined) this.stableColorState.pulseDepth = data.PulseDepth;
                    if (data.StableColorSegments) this.stableColorState.segments = data.StableColorSegments.map(v => !!v);
                    this.updateStableColorUI();
                }

                // Load stable color sequencer state from response
                if (data.SCSeqEnabled !== undefined) {
                    this.scSeqState.enabled = !!data.SCSeqEnabled;
                    this.scSeqState.mode = data.SCSeqMode || 0;
                    this.scSeqState.timingMode = data.SCSeqTimingMode || 0;
                    this.scSeqState.dwellTime = data.SCSeqDwellTime_s || 30.0;
                    this.scSeqState.beatsPerSwitch = data.SCSeqBeatsPerSwitch || 1.0;
                    this.scSeqState.fps = data.SCSeqFPS || 12;
                    this.scSeqState.cycleColors = data.SCSeqCycleColors !== undefined ? !!data.SCSeqCycleColors : true;
                    this.scSeqState.fadeEnabled = !!data.SCSeqFadeEnabled;
                    this.scSeqState.fadeOuter = data.SCSeqFadeOuter !== undefined ? !!data.SCSeqFadeOuter : true;
                    this.scSeqState.fadeInner = data.SCSeqFadeInner !== undefined ? !!data.SCSeqFadeInner : true;
                    this.scSeqState.fadeDuration_ms = data.SCSeqFadeDuration_ms || 300;
                    this.scSeqState.currentPreset = data.SCSeqCurrentPreset || 0;
                    this.scSeqState.numberOfPresets = data.NumberOfSCPresets || 0;
                    this.scSeqState.presets = data.SCPresets || [];
                    this.updateSCSeqUI();
                }

                // Handle the data structure from your microcontroller
                if (data.Profiles && Array.isArray(data.Profiles)) {
                    this.profiles = data.Profiles;
                } else if (Array.isArray(data)) {
                    this.profiles = data;
                } else {
                    this.profiles = [];
                }

                // Update baseUrl to the working one
                this.baseUrl = url;
                console.log(`Successfully connected to: ${url}`);

                if (this.profiles.length === 0) {
                    this.showEmptyState();
                } else {
                    this.renderProfiles();
                    this.showProfilesContainer();
                }
                return; // Success, exit the function

            } catch (error) {
                console.error(`Error with ${url}:`, error);

                // If this is the last URL, show error
                if (i === urls.length - 1) {
                    if (error.name === 'TypeError' && error.message.includes('fetch')) {
                        this.showCorsErrorState();
                    } else {
                        this.showErrorState(`Failed to connect to both ${this.baseUrl} and ${this.fallbackUrl}. Last error: ${error.message}`);
                    }
                }
                // Otherwise, continue to next URL
            }
        }
    }

    renderProfiles() {
        const profilesGrid = document.getElementById('profilesGrid');
        const template = document.getElementById('profileCardTemplate');

        // Clear existing profiles
        profilesGrid.innerHTML = '';

        this.profiles.forEach((profile, index) => {
            const profileCard = template.content.cloneNode(true);
            const cardElement = profileCard.querySelector('.profile-card');

            // Set profile data attributes
            cardElement.setAttribute('data-profile-index', index);

            // Set profile name
            cardElement.querySelector('.profile-name').textContent = profile.ProfileName || `Profile ${index}`;

            // Set active status - handle both boolean and numeric values
            const isActive = profile.Active === true || profile.Active === 1;
            const statusIndicator = cardElement.querySelector('.status-indicator');
            const statusText = cardElement.querySelector('.status-text');

            if (isActive) {
                statusIndicator.classList.add('active');
                statusText.textContent = 'Active';
                cardElement.classList.add('active');
                // Don't set currentProfileIndex here since multiple profiles can be active
            } else {
                statusIndicator.classList.remove('active');
                statusText.textContent = 'Inactive';
            }

            // Create hex grid visualization
            // Derive combined ActiveNodes from all events
            let combinedNodes = new Array(19).fill(0);
            if (profile.Events) {
                profile.Events.forEach(evt => {
                    if (evt.Enabled && evt.ActiveNodes) {
                        evt.ActiveNodes.forEach((v, i) => { if (v) combinedNodes[i] = 1; });
                    }
                });
            } else if (profile.ActiveNodes) {
                combinedNodes = profile.ActiveNodes;
            }
            this.createHexGrid(cardElement.querySelector('.hex-grid'), combinedNodes);

            // Create color preview
            this.createColorPreview(cardElement.querySelector('.color-preview'), profile.Colors || []);

            // Add event listeners
            const activateButton = cardElement.querySelector('.select-button');
            activateButton.addEventListener('click', () => {
                this.toggleProfileActivation(index);
            });

            // Update button text and class based on active state
            this.updateActivateButton(activateButton, isActive);

            cardElement.querySelector('.edit-button').addEventListener('click', () => {
                this.editProfile(index);
            });

            profilesGrid.appendChild(profileCard);
        });
    }

    createHexGrid(container, activeNodes) {
        container.innerHTML = '';

        const scale = 15, pad = 8;
        const W = 4 * scale + 2 * pad;   // 76
        const H = 8 * scale + 2 * pad;   // 136

        const px = HEX_NODE_POSITIONS.map(([c, r]) => [W - (c * scale + pad), r * scale + pad]);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.style.width = '80px';
        svg.style.height = 'auto';
        svg.style.display = 'block';
        svg.style.margin = '0.5rem auto'; // Center in card

        // Draw segment connecting lines 
        HEX_SEGMENT_CONNECTIONS.forEach(([n1, n2]) => {
            const [x1, y1] = px[n1], [x2, y2] = px[n2];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1); line.setAttribute('y1', y1);
            line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-width', 2);
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
        });

        // Draw nodes
        px.forEach(([x, y], ni) => {
            const active = activeNodes[ni] === 1;
            const hr = 6;
            let pts = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (30 + 60 * i);
                pts.push(`${x + hr * Math.cos(angle)},${y + hr * Math.sin(angle)}`);
            }
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', pts.join(' '));
            poly.setAttribute('fill', active ? 'var(--primary-color)' : '#ffffff');
            poly.setAttribute('stroke', active ? 'var(--primary-color)' : '#bbbbbb');
            poly.setAttribute('stroke-width', 1.5);
            svg.appendChild(poly);
        });

        container.appendChild(svg);
    }

    createColorPreview(container, colors) {
        container.innerHTML = '';

        if (!colors || colors.length === 0) {
            const noColors = document.createElement('span');
            noColors.textContent = 'No colors';
            noColors.style.color = '#999';
            noColors.style.fontSize = '0.8rem';
            container.appendChild(noColors);
            return;
        }

        colors.forEach(color => {
            const colorSwatch = document.createElement('div');
            colorSwatch.className = 'color-swatch';
            colorSwatch.style.backgroundColor = color;
            container.appendChild(colorSwatch);
        });
    }

    updateActivateButton(button, isActive) {
        const icon = button.querySelector('.button-icon');
        const text = button.querySelector('.button-text');

        if (isActive) {
            button.title = 'Deactivate this profile';
            icon.textContent = '⏸️';
            text.textContent = 'Deactivate';
            button.classList.remove('select-button');
            button.classList.add('deactivate-button');
        } else {
            button.title = 'Activate this profile';
            icon.textContent = '▶️';
            text.textContent = 'Activate';
            button.classList.remove('deactivate-button');
            button.classList.add('select-button');
        }
    }

    updateProfileCard(profileIndex) {
        const profile = this.profiles[profileIndex];
        const cardElement = document.querySelector(`[data-profile-index="${profileIndex}"]`);

        if (!cardElement) return;

        const isActive = profile.Active === true || profile.Active === 1;
        const statusIndicator = cardElement.querySelector('.status-indicator');
        const statusText = cardElement.querySelector('.status-text');
        const activateButton = cardElement.querySelector('.select-button, .deactivate-button');

        // Update status indicator
        if (isActive) {
            statusIndicator.classList.add('active');
            statusText.textContent = 'Active';
            cardElement.classList.add('active');
        } else {
            statusIndicator.classList.remove('active');
            statusText.textContent = 'Inactive';
            cardElement.classList.remove('active');
        }

        // Update button
        this.updateActivateButton(activateButton, isActive);
    }

    async toggleProfileActivation(profileIndex) {
        const profile = this.profiles[profileIndex];
        const isCurrentlyActive = profile.Active === true || profile.Active === 1;

        // If activating a profile while in stable color mode, drop back to
        // ripple mode so the selection actually takes visible effect.
        if (!isCurrentlyActive && this.stableColorState.mode) {
            await this.setStableColorMode(false);
        }

        // Check if we're in demo mode
        if (this.isDemoMode()) {
            // Toggle the active state in demo mode
            profile.Active = isCurrentlyActive ? 0 : 1;
            this.updateProfileCard(profileIndex);
            this.showNotification(`Demo profile ${isCurrentlyActive ? 'deactivated' : 'activated'}`, 'info');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/updateProfile`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ProfileIndex: profileIndex,
                    Active: isCurrentlyActive ? 0 : 1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Update local state
            profile.Active = isCurrentlyActive ? 0 : 1;
            this.updateProfileCard(profileIndex);
            this.showNotification(`Profile ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`, 'success');

        } catch (error) {
            console.error('Error toggling profile activation:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showNotification('CORS error: Cannot connect to microcontroller', 'error');
            } else {
                this.showNotification('Failed to toggle profile activation', 'error');
            }
        }
    }

    isDemoMode() {
        return document.getElementById('corsErrorState') &&
            document.getElementById('corsErrorState').style.display === 'none' &&
            this.profiles.length > 0 &&
            this.profiles[0].ProfileName &&
            this.profiles[0].ProfileName.includes('Demo');
    }

    editProfile(profileIndex) {
        // Store the profile index in localStorage for the editor to use
        localStorage.setItem('editingProfileIndex', profileIndex);
        localStorage.setItem('profileData', JSON.stringify(this.profiles[profileIndex]));

        // Navigate to the profile editor
        window.location.href = 'ProfileEditor.html';
    }

    createNewProfile() {
        // Find the next available profile index
        const nextIndex = this.profiles.length;

        // Create a new profile template
        const newProfile = {
            ProfileIndex: nextIndex,
            ProfileName: `New Profile ${nextIndex + 1}`,
            Active: 0,
            ProfilePeriod_ms: 5000,
            NumberOfColors: 3,
            Colors: ["#FF0000", "#00FF00", "#0000FF"],
            Events: [
                { Enabled: true, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                { Enabled: false }, { Enabled: false }, { Enabled: false }, { Enabled: false }
            ]
        };

        // Store the new profile data for the editor
        localStorage.setItem('editingProfileIndex', nextIndex);
        localStorage.setItem('profileData', JSON.stringify(newProfile));
        localStorage.setItem('isNewProfile', 'true'); // Flag to indicate this is a new profile

        // Navigate to the profile editor
        window.location.href = 'ProfileEditor.html';
    }

    updateActiveProfileDisplay() {
        // Remove active class from all cards
        document.querySelectorAll('.profile-card').forEach(card => {
            card.classList.remove('active');
            const statusIndicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.status-text');

            statusIndicator.classList.remove('active');
            statusText.textContent = 'Inactive';
        });

        // Add active class to current profile
        const currentCard = document.querySelector(`[data-profile-index="${this.currentProfileIndex}"]`);
        if (currentCard) {
            currentCard.classList.add('active');
            const statusIndicator = currentCard.querySelector('.status-indicator');
            const statusText = currentCard.querySelector('.status-text');

            statusIndicator.classList.add('active');
            statusText.textContent = 'Active';
        }
    }

    showLoadingState() {
        document.getElementById('loadingState').style.display = 'flex';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }

    showErrorState(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'flex';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';

        document.getElementById('errorMessage').textContent = message;
    }

    showProfilesContainer() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'block';
        document.getElementById('emptyState').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
    }

    showCorsErrorState() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';

        // Create CORS error state
        const corsErrorState = document.getElementById('corsErrorState') || this.createCorsErrorState();
        corsErrorState.style.display = 'flex';
    }

    createCorsErrorState() {
        const corsErrorDiv = document.createElement('div');
        corsErrorDiv.id = 'corsErrorState';
        corsErrorDiv.className = 'error-state';
        corsErrorDiv.style.display = 'none';

        corsErrorDiv.innerHTML = `
            <div class="error-icon">🚫</div>
            <h3>CORS Error</h3>
            <p>The microcontroller at <code>hexagono.local</code> is not allowing cross-origin requests.</p>
            <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px; text-align: left;">
                <strong>Solutions:</strong>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                    <li>Configure CORS headers on your microcontroller</li>
                    <li>Use a browser extension to disable CORS (for testing only)</li>
                    <li>Run this page from the same domain as the microcontroller</li>
                </ul>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button id="tryDemoMode" class="retry-button">Try Demo Mode</button>
                <button id="retryCors" class="retry-button">Retry</button>
            </div>
        `;

        document.querySelector('main').appendChild(corsErrorDiv);

        // Add event listeners
        document.getElementById('tryDemoMode').addEventListener('click', () => {
            this.loadDemoProfiles();
        });

        document.getElementById('retryCors').addEventListener('click', () => {
            this.loadProfiles();
        });

        return corsErrorDiv;
    }

    loadDemoProfiles() {
        // Hide CORS error state
        document.getElementById('corsErrorState').style.display = 'none';

        // Create demo profiles
        this.profiles = [
            {
                ProfileIndex: 0,
                ProfileName: "Demo Profile 1",
                Active: true,
                ProfilePeriod_ms: 3000,
                NumberOfColors: 3,
                Colors: ["#FF0000", "#00FF00", "#0000FF"],
                Events: [
                    { Enabled: true, TimeOffset_ms: 0, RippleLifeSpan: 3000, RippleType: 0, Behavior: 1, RippleSpeed: 1.0, RainbowDeltaPerTick: 100, Direction: -1, ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
                    { Enabled: false }, { Enabled: false }, { Enabled: false }, { Enabled: false }
                ]
            },
            {
                ProfileIndex: 1,
                ProfileName: "Demo Profile 2",
                Active: false,
                ProfilePeriod_ms: 5000,
                NumberOfColors: 5,
                Colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
                Events: [
                    { Enabled: true, TimeOffset_ms: 0, RippleLifeSpan: 5000, RippleType: 0, Behavior: 1, RippleSpeed: 0.5, RainbowDeltaPerTick: 200, Direction: -1, ActiveNodes: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
                    { Enabled: false }, { Enabled: false }, { Enabled: false }, { Enabled: false }
                ]
            },
            {
                ProfileIndex: 2,
                ProfileName: "Demo Profile 3",
                Active: false,
                ProfilePeriod_ms: 2000,
                NumberOfColors: 2,
                Colors: ["#FF0000", "#FFFFFF"],
                Events: [
                    { Enabled: true, TimeOffset_ms: 0, RippleLifeSpan: 2000, RippleType: 0, Behavior: 0, RippleSpeed: 2.0, RainbowDeltaPerTick: 50, Direction: -1, ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
                    { Enabled: false }, { Enabled: false }, { Enabled: false }, { Enabled: false }
                ]
            }
        ];

        this.currentProfileIndex = 0;
        this.renderProfiles();
        this.showProfilesContainer();
        this.showNotification('Demo mode activated - using sample profiles', 'info');
    }

    showModal(title, message, confirmCallback) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modal').style.display = 'flex';
        document.getElementById('overlay').style.display = 'block';

        this.pendingAction = confirmCallback;
    }

    hideModal() {
        document.getElementById('modal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        this.pendingAction = null;
    }

    confirmAction() {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.hideModal();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#007bff'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // --- BPM Methods ---

    tapTempo() {
        const now = performance.now();

        // Reset if gap > 3 seconds
        if (this.bpmState.tapTimes.length > 0) {
            const lastTap = this.bpmState.tapTimes[this.bpmState.tapTimes.length - 1];
            if (now - lastTap > 3000) {
                this.bpmState.tapTimes = [];
            }
        }

        this.bpmState.tapTimes.push(now);

        // Keep last 8 taps
        if (this.bpmState.tapTimes.length > 8) {
            this.bpmState.tapTimes.shift();
        }

        // Need at least 2 taps to calculate
        if (this.bpmState.tapTimes.length >= 2) {
            const times = this.bpmState.tapTimes;
            let totalInterval = 0;
            for (let i = 1; i < times.length; i++) {
                totalInterval += times[i] - times[i - 1];
            }
            const avgInterval = totalInterval / (times.length - 1);
            const bpm = Math.round((60000 / avgInterval) * 10) / 10;
            this.setBPM(Math.max(40, Math.min(300, bpm)));
        }

        // Clear tap timeout
        if (this.bpmState.tapTimeout) clearTimeout(this.bpmState.tapTimeout);
        this.bpmState.tapTimeout = setTimeout(() => {
            this.bpmState.tapTimes = [];
        }, 3000);

        // Flash the tap button
        const btn = document.getElementById('tapTempoButton');
        btn.classList.add('hotkey-flash');
        setTimeout(() => btn.classList.remove('hotkey-flash'), 300);
    }

    adjustBPM(delta) {
        this.setBPM(Math.max(40, Math.min(300, this.bpmState.bpm + delta)));
    }

    setBPM(newBPM) {
        const oldBPM = this.bpmState.bpm;
        newBPM = Math.round(newBPM * 10) / 10;
        if (newBPM === oldBPM) return;

        const ratio = oldBPM / newBPM;
        this.bpmState.bpm = newBPM;
        this.updateBPMUI();
        this.startBeatPulse();

        // Scale timing fields for all loaded profiles
        this.profiles.forEach((profile, idx) => {
            let changed = false;
            if (profile.ProfilePeriod_ms) {
                profile.ProfilePeriod_ms = Math.round(Math.max(500, Math.min(60000, profile.ProfilePeriod_ms * ratio)));
                changed = true;
            }
            if (profile.Events) {
                profile.Events.forEach(evt => {
                    if (!evt.Enabled) return;
                    if (evt.TimeOffset_ms !== undefined) {
                        evt.TimeOffset_ms = Math.round(evt.TimeOffset_ms * ratio);
                    }
                    if (evt.RippleLifeSpan !== undefined) {
                        evt.RippleLifeSpan = Math.round(evt.RippleLifeSpan * ratio);
                    }
                    if (this.bpmState.lockSpeedToBPM && evt.RippleSpeed !== undefined) {
                        evt.RippleSpeed = Math.round((evt.RippleSpeed / ratio) * 100) / 100;
                    }
                    changed = true;
                });
            }
            if (changed) {
                this.sendProfileUpdate(idx, profile);
            }
        });

        // Send BPM to firmware for storage
        this.sendGlobalParam({ GlobalBPM: newBPM });
    }

    updateBPMUI() {
        const bpmInput = document.getElementById('bpmInput');
        const bpmSlider = document.getElementById('bpmSlider');
        if (bpmInput) bpmInput.value = this.bpmState.bpm.toFixed(1);
        if (bpmSlider) bpmSlider.value = this.bpmState.bpm;
    }

    startBeatPulse() {
        if (this.bpmState.beatPulseInterval) {
            clearInterval(this.bpmState.beatPulseInterval);
        }
        const pulse = document.getElementById('beatPulse');
        if (!pulse) return;

        const intervalMs = 60000 / this.bpmState.bpm;
        this.bpmState.beatPulseInterval = setInterval(() => {
            pulse.classList.add('on');
            setTimeout(() => pulse.classList.remove('on'), Math.min(100, intervalMs * 0.3));
        }, intervalMs);
    }

    async sendProfileUpdate(profileIndex, profile) {
        if (this.isDemoMode()) return;
        try {
            await fetch(`${this.baseUrl}/updateProfile`, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProfileIndex: profileIndex,
                    ProfilePeriod_ms: profile.ProfilePeriod_ms,
                    Events: profile.Events
                })
            });
        } catch (error) {
            console.error(`Error updating profile ${profileIndex}:`, error);
        }
    }

    async sendGlobalParam(params) {
        if (this.isDemoMode()) return;
        try {
            await fetch(`${this.baseUrl}/updateGlobalParameters`, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
        } catch (error) {
            console.error('Error updating global params:', error);
        }
    }

    handleHotkey(e) {
        // Skip if focused on input/textarea/select
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        switch (e.key.toLowerCase()) {
            case 't':
                e.preventDefault();
                this.tapTempo();
                break;
            case '1': case '2': case '3': case '4': {
                e.preventDefault();
                const idx = parseInt(e.key) - 1;
                if (idx < this.profiles.length) {
                    this.toggleProfileActivation(idx);
                    this.flashElement(document.querySelector(`[data-profile-index="${idx}"]`));
                }
                break;
            }
            case ' ':
                e.preventDefault();
                this.toggleMasterFire();
                break;
            case 's':
                e.preventDefault();
                this.setSequencerEnabled(!this.sequencerState.enabled);
                break;
            case '-':
                e.preventDefault();
                this.adjustBPM(-1);
                break;
            case '=':
                e.preventDefault();
                this.adjustBPM(1);
                break;
            case '[':
                e.preventDefault();
                this.adjustBPM(-10);
                break;
            case ']':
                e.preventDefault();
                this.adjustBPM(10);
                break;
        }
    }

    async toggleMasterFire() {
        const newState = !GlobalParameters_MasterFireEnabled;
        GlobalParameters_MasterFireEnabled = newState;
        this.updateMasterFireUI();
        this.sendGlobalParam({ MasterFireRippleEnabled: newState });
    }

    updateMasterFireUI() {
        const btn = document.getElementById('masterFireBtn');
        if (!btn) return;
        const label = btn.querySelector('.master-fire-label');
        if (GlobalParameters_MasterFireEnabled) {
            btn.classList.add('master-fire-on');
            btn.classList.remove('master-fire-off');
            if (label) label.textContent = 'ON';
        } else {
            btn.classList.add('master-fire-off');
            btn.classList.remove('master-fire-on');
            if (label) label.textContent = 'OFF';
        }
    }

    flashElement(el) {
        if (!el) return;
        el.classList.add('hotkey-flash');
        setTimeout(() => el.classList.remove('hotkey-flash'), 300);
    }

    updateSequencerUI() {
        const toggle = document.getElementById('sequencerToggle');
        const options = document.getElementById('sequencerOptions');
        const modeSelect = document.getElementById('sequencerMode');
        const dwellSlider = document.getElementById('sequencerDwell');
        const dwellValue = document.getElementById('dwellValue');
        const status = document.getElementById('sequencerStatus');

        toggle.checked = this.sequencerState.enabled;
        modeSelect.value = this.sequencerState.mode;
        dwellSlider.value = this.sequencerState.dwellTime;
        dwellValue.textContent = this.sequencerState.dwellTime;

        options.style.display = this.sequencerState.enabled ? 'flex' : 'none';

        if (this.sequencerState.enabled && this.profiles.length > 0) {
            const idx = this.sequencerState.currentProfile;
            const name = this.profiles[idx] ? this.profiles[idx].ProfileName : `Profile ${idx}`;
            const modeText = this.sequencerState.mode === 0 ? 'Sequential' : 'Random';
            status.textContent = `Playing: ${name} (${modeText}, ${this.sequencerState.dwellTime}s per profile)`;
        } else {
            status.textContent = '';
        }
    }

    async setSequencerEnabled(enabled) {
        this.sequencerState.enabled = enabled;
        this.updateSequencerUI();

        if (this.isDemoMode()) {
            this.showNotification(`Demo: Sequencer ${enabled ? 'enabled' : 'disabled'}`, 'info');
            return;
        }

        await this.sendSequencerUpdate({ SequencerEnabled: enabled });
    }

    async sendSequencerUpdate(params) {
        if (this.isDemoMode()) {
            this.showNotification('Demo: Sequencer settings updated', 'info');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/updateGlobalParameters`, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.showNotification('Sequencer updated', 'success');
        } catch (error) {
            console.error('Error updating sequencer:', error);
            this.showNotification('Failed to update sequencer', 'error');
        }
    }

    async sendBrightness(value) {
        if (this.isDemoMode()) {
            this.showNotification(`Demo: Brightness set to ${value}`, 'info');
            return;
        }
        try {
            const response = await fetch(`${this.baseUrl}/updateGlobalParameters`, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Brightness: value })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error setting brightness:', error);
            this.showNotification('Failed to update brightness', 'error');
        }
    }

    showRestoreDefaultsModal() {
        document.getElementById('restoreDefaultsModal').style.display = 'flex';
        document.getElementById('overlay').style.display = 'block';
    }

    hideRestoreDefaultsModal() {
        document.getElementById('restoreDefaultsModal').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
    }

    // --- Stable Color Mode Methods ---

    async setStableColorMode(enabled) {
        this.stableColorState.mode = enabled;
        GlobalParameters_MasterFireEnabled = true;
        this.updateMasterFireUI();
        this.updateStableColorUI();
        await this.sendGlobalParam({ StableColorMode: enabled });
    }

    updateStableColorUI() {
        const rippleBtn = document.getElementById('modeRippleBtn');
        const stableBtn = document.getElementById('modeStableBtn');
        const panel = document.getElementById('stableColorPanel');
        const profilesGrid = document.getElementById('profilesGrid');
        const sequencer = document.querySelector('.sequencer-control');
        const bpmControl = document.querySelector('.bpm-control');

        if (this.stableColorState.mode) {
            rippleBtn.classList.remove('mode-btn-active');
            stableBtn.classList.add('mode-btn-active');
            panel.style.display = 'block';
            // Profiles remain accessible in stable mode — clicking a profile
            // card auto-switches back to ripple mode (see toggleProfileActivation).
            if (profilesGrid) profilesGrid.style.display = '';
            if (sequencer) sequencer.style.display = '';
            if (bpmControl) bpmControl.style.display = '';
        } else {
            rippleBtn.classList.add('mode-btn-active');
            stableBtn.classList.remove('mode-btn-active');
            panel.style.display = 'none';
            if (profilesGrid) profilesGrid.style.display = '';
            if (sequencer) sequencer.style.display = '';
            if (bpmControl) bpmControl.style.display = '';
        }

        // Sync control values from state
        const picker = document.getElementById('stableColorPicker');
        if (picker) picker.value = this.stableColorState.color;

        const freqSlider = document.getElementById('pulseFreqSlider');
        const freqLabel = document.getElementById('pulseFreqValue');
        if (freqSlider) {
            freqSlider.value = Math.round(this.stableColorState.pulseFrequency * 10);
            if (freqLabel) freqLabel.textContent = this.stableColorState.pulseFrequency.toFixed(2);
        }

        const depthSlider = document.getElementById('pulseDepthSlider');
        const depthLabel = document.getElementById('pulseDepthValue');
        if (depthSlider) {
            depthSlider.value = Math.round(this.stableColorState.pulseDepth * 100);
            if (depthLabel) depthLabel.textContent = Math.round(this.stableColorState.pulseDepth * 100);
        }

        this.renderFavorites();
        this.buildStableColorSVG();
    }

    buildStableColorSVG() {
        const container = document.getElementById('stableColorNodes');
        if (!container) return;
        container.innerHTML = '';

        const scale = 30, pad = 15;
        const W = 4 * scale + 2 * pad;   // 150
        const H = 8 * scale + 2 * pad;   // 270

        // Mirror x so the UI matches the physical view from behind the device
        const px = HEX_NODE_POSITIONS.map(([c, r]) => [W - (c * scale + pad), r * scale + pad]);

        const activeColor = this.stableColorState.color || '#4fc3f7';
        const inactiveSegColor = '#444';
        const inactiveNodeColor = '#444';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.style.display = 'block';

        const isNodeMode = this.stableColorState.selectionMode === 'node';

        if (isNodeMode) {
            // Compute which segments are visually lit (any adjacent selected node)
            const visSegs = new Array(30).fill(false);
            this.stableColorState.nodeSelection.forEach((active, ni) => {
                if (active) HEX_NODE_SEGMENT_MAP[ni].forEach(si => { visSegs[si] = true; });
            });

            // Thin segment lines (decorative, reflect lit state)
            HEX_SEGMENT_CONNECTIONS.forEach(([n1, n2], idx) => {
                const [x1, y1] = px[n1], [x2, y2] = px[n2];
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1); line.setAttribute('y1', y1);
                line.setAttribute('x2', x2); line.setAttribute('y2', y2);
                line.setAttribute('stroke', visSegs[idx] ? activeColor : '#333');
                line.setAttribute('stroke-width', 2);
                line.setAttribute('stroke-linecap', 'round');
                line.style.pointerEvents = 'none';
                svg.appendChild(line);
            });

            // Large clickable node circles
            px.forEach(([x, y], ni) => {
                const active = this.stableColorState.nodeSelection[ni];
                const hr = 10;
                let pts = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 180) * (30 + 60 * i);
                    pts.push(`${x + hr * Math.cos(angle)},${y + hr * Math.sin(angle)}`);
                }
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', pts.join(' '));
                poly.setAttribute('fill', active ? activeColor : inactiveNodeColor);
                poly.setAttribute('stroke', active ? activeColor : '#666');
                poly.setAttribute('stroke-width', 1.5);
                poly.style.cursor = 'pointer';
                poly.addEventListener('click', () => {
                    this.stableColorState.nodeSelection[ni] = !this.stableColorState.nodeSelection[ni];
                    const segs = new Array(30).fill(false);
                    this.stableColorState.nodeSelection.forEach((on, n) => {
                        if (on) HEX_NODE_SEGMENT_MAP[n].forEach(si => { segs[si] = true; });
                    });
                    this.stableColorState.segments = segs;
                    this.sendGlobalParam({ StableColorSegments: segs.map(v => v ? 1 : 0) });
                    this.buildStableColorSVG();
                });
                svg.appendChild(poly);
            });

        } else {
            // Segment mode: thick clickable segment lines, small decorative node dots
            HEX_SEGMENT_CONNECTIONS.forEach(([n1, n2], idx) => {
                const [x1, y1] = px[n1], [x2, y2] = px[n2];
                const active = this.stableColorState.segments[idx];

                const vis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                vis.setAttribute('x1', x1); vis.setAttribute('y1', y1);
                vis.setAttribute('x2', x2); vis.setAttribute('y2', y2);
                vis.setAttribute('stroke', active ? activeColor : inactiveSegColor);
                vis.setAttribute('stroke-width', 4);
                vis.setAttribute('stroke-linecap', 'round');
                vis.style.pointerEvents = 'none';
                svg.appendChild(vis);

                const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                hit.setAttribute('x1', x1); hit.setAttribute('y1', y1);
                hit.setAttribute('x2', x2); hit.setAttribute('y2', y2);
                hit.setAttribute('stroke', 'transparent');
                hit.setAttribute('stroke-width', 14);
                hit.style.cursor = 'pointer';
                hit.addEventListener('click', () => {
                    this.stableColorState.segments[idx] = !this.stableColorState.segments[idx];
                    vis.setAttribute('stroke', this.stableColorState.segments[idx] ? activeColor : inactiveSegColor);
                    this.sendGlobalParam({ StableColorSegments: this.stableColorState.segments.map(v => v ? 1 : 0) });
                });
                svg.appendChild(hit);
            });

            // Small decorative node dots
            px.forEach(([x, y]) => {
                const hr = 4;
                let pts = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 180) * (30 + 60 * i);
                    pts.push(`${x + hr * Math.cos(angle)},${y + hr * Math.sin(angle)}`);
                }
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                dot.setAttribute('points', pts.join(' '));
                dot.setAttribute('fill', '#666');
                dot.style.pointerEvents = 'none';
                svg.appendChild(dot);
            });
        }

        container.appendChild(svg);
    }

    // --- Favorite colors (localStorage) ---

    loadFavorites() {
        const stored = localStorage.getItem('chromanceFavorites');
        if (stored) {
            try { return JSON.parse(stored); } catch (_) { }
        }
        return ['#0000ff', '#ff0000', '#00ff00', '#ff8800', '#ff00ff', '#00ffff', '#ffffff', '#ff6699'];
    }

    saveFavorites(favs) {
        localStorage.setItem('chromanceFavorites', JSON.stringify(favs));
    }

    renderFavorites() {
        const list = document.getElementById('colorFavoritesList');
        if (!list) return;
        const favs = this.loadFavorites();
        const current = this.stableColorState.color;
        list.innerHTML = '';
        favs.forEach((hex, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch' + (hex === current ? ' color-swatch-active' : '');
            swatch.style.background = hex;
            swatch.title = hex;

            const del = document.createElement('button');
            del.className = 'swatch-del';
            del.textContent = '×';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                const f = this.loadFavorites();
                const pos = f.indexOf(hex); // find by value, not stale positional idx
                if (pos !== -1) f.splice(pos, 1);
                this.saveFavorites(f);
                this.renderFavorites();
            });

            swatch.addEventListener('click', () => {
                this.stableColorState.color = hex;
                const picker = document.getElementById('stableColorPicker');
                if (picker) picker.value = hex;
                this.sendGlobalParam({ StableColorHue: hex });
                this.buildStableColorSVG();
                this.renderFavorites();
            });

            swatch.appendChild(del);
            list.appendChild(swatch);
        });
    }

    async confirmRestoreDefaults() {
        this.hideRestoreDefaultsModal();
        this.showLoadingState();

        try {
            const response = await fetch(`${this.baseUrl}/clearEEPROM`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.showNotification('Default profiles restored successfully!', 'success');

            // Reload profiles after a short delay
            setTimeout(() => {
                this.loadProfiles();
            }, 1500);

        } catch (error) {
            console.error('Error restoring defaults:', error);
            this.showErrorState(`Failed to restore defaults: ${error.message}`);
        }
    }

    // --- Stable Color Sequencer Methods ---

    updateSCSeqUI() {
        const toggle = document.getElementById('scSeqToggle');
        if (!toggle) return; // SC panel may not be visible yet

        const options = document.getElementById('scSeqOptions');
        toggle.checked = this.scSeqState.enabled;
        options.style.display = this.scSeqState.enabled ? 'flex' : 'none';

        document.getElementById('scSeqMode').value = this.scSeqState.mode;
        document.getElementById('scSeqTimingMode').value = this.scSeqState.timingMode;
        document.getElementById('scSeqCycleColors').checked = this.scSeqState.cycleColors;
        document.getElementById('scSeqFadeEnabled').checked = this.scSeqState.fadeEnabled;

        // Dwell (time mode)
        const dwellSlider = document.getElementById('scSeqDwell');
        dwellSlider.value = this.scSeqState.dwellTime;
        const dv = this.scSeqState.dwellTime;
        document.getElementById('scDwellValue').textContent = dv % 1 === 0 ? dv.toFixed(0) : dv.toFixed(1);

        // Beat mode
        document.getElementById('scSeqBeats').value = this.scSeqState.beatsPerSwitch;

        // FPS mode
        document.getElementById('scSeqFPS').value = this.scSeqState.fps;
        document.getElementById('scFPSValue').textContent = this.scSeqState.fps;

        // Fade duration
        document.getElementById('scFadeDuration').value = this.scSeqState.fadeDuration_ms;
        document.getElementById('scFadeValue').textContent = this.scSeqState.fadeDuration_ms;
        document.getElementById('scFadeDurationRow').style.display = this.scSeqState.fadeEnabled ? 'flex' : 'none';
        document.getElementById('scSeqFadeOuter').checked = this.scSeqState.fadeOuter;
        document.getElementById('scSeqFadeInner').checked = this.scSeqState.fadeInner;
        document.getElementById('scFadeZoneRow').style.display = this.scSeqState.fadeEnabled ? 'flex' : 'none';

        this.updateSCSeqTimingUI();

        // Status
        const status = document.getElementById('scSeqStatus');
        if (this.scSeqState.enabled && this.scSeqState.numberOfPresets > 0) {
            const idx = this.scSeqState.currentPreset;
            const preset = this.scSeqState.presets[idx];
            const name = preset ? preset.PresetName : `Preset ${idx}`;
            let timingText;
            if (this.scSeqState.timingMode === 1) {
                timingText = `${this.scSeqState.beatsPerSwitch} pulse(s)`;
            } else if (this.scSeqState.timingMode === 2) {
                timingText = `${this.scSeqState.fps} fps`;
            } else {
                const dw = this.scSeqState.dwellTime;
                timingText = `${dw % 1 === 0 ? dw.toFixed(0) : dw.toFixed(1)}s`;
            }
            const orderText = this.scSeqState.mode === 0 ? 'seq' : 'rnd';
            status.textContent = `Playing: ${name} (${orderText}, ${timingText})`;
        } else {
            status.textContent = '';
        }

        this.renderSCPresetList();
    }

    updateSCSeqTimingUI() {
        const tm = this.scSeqState.timingMode;
        document.getElementById('scTimeModeRow').style.display = tm === 0 ? 'flex' : 'none';
        document.getElementById('scBeatModeRow').style.display = tm === 1 ? 'flex' : 'none';
        document.getElementById('scFpsModeRow').style.display = tm === 2 ? 'flex' : 'none';
    }

    renderSCPresetList() {
        const list = document.getElementById('scPresetList');
        if (!list) return;
        list.innerHTML = '';

        const activePresets = this.scSeqState.presets.slice(0, this.scSeqState.numberOfPresets);
        activePresets.forEach((preset, idx) => {
            if (!preset.Active) return;

            const row = document.createElement('div');
            row.className = 'sc-preset-row';
            row.draggable = true;
            if (idx === this.scSeqState.currentPreset && this.scSeqState.enabled) {
                row.classList.add('sc-preset-row-playing');
            }
            if (idx === this.scSeqEditingIndex) {
                row.classList.add('sc-preset-row-editing');
            }

            // Click row (not a button) to apply preset
            row.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    this.applyPreset(idx);
                }
            });
            row.style.cursor = 'pointer';

            // Drag handle
            const handle = document.createElement('span');
            handle.className = 'sc-preset-drag-handle';
            handle.textContent = '⠿';
            handle.title = 'Drag to reorder';
            row.appendChild(handle);

            // Drag-and-drop events
            row.addEventListener('dragstart', (e) => {
                this.scSeqDragStartIdx = idx;
                row.classList.add('sc-preset-row-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('sc-preset-row-dragging');
                list.querySelectorAll('.sc-preset-row-dragover').forEach(el => el.classList.remove('sc-preset-row-dragover'));
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (idx !== this.scSeqDragStartIdx) row.classList.add('sc-preset-row-dragover');
            });
            row.addEventListener('dragleave', () => {
                row.classList.remove('sc-preset-row-dragover');
            });
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('sc-preset-row-dragover');
                if (this.scSeqDragStartIdx !== null && this.scSeqDragStartIdx !== idx) {
                    this.reorderSCPresets(this.scSeqDragStartIdx, idx);
                }
                this.scSeqDragStartIdx = null;
            });

            const swatch = document.createElement('span');
            swatch.className = 'sc-preset-swatch';
            swatch.style.background = preset.Hue;
            row.appendChild(swatch);

            const segCount = preset.Segments ? preset.Segments.filter(Boolean).length : 0;
            const badge = document.createElement('span');
            badge.className = 'sc-preset-segs';
            badge.textContent = `${segCount} segs`;
            row.appendChild(badge);

            const nameEl = document.createElement('span');
            nameEl.className = 'sc-preset-name';
            nameEl.textContent = preset.PresetName || `Preset ${idx}`;
            row.appendChild(nameEl);

            const renameBtn = document.createElement('button');
            renameBtn.className = 'sc-preset-btn';
            renameBtn.textContent = '✎';
            renameBtn.title = 'Rename';
            renameBtn.addEventListener('click', () => this.startRenamePreset(idx, nameEl));
            row.appendChild(renameBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'sc-preset-btn';
            editBtn.textContent = idx === this.scSeqEditingIndex ? 'Save' : 'Edit';
            editBtn.addEventListener('click', () => {
                if (idx === this.scSeqEditingIndex) {
                    this.saveEditedPreset(idx);
                } else {
                    this.startEditingPreset(idx);
                }
            });
            row.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'sc-preset-btn sc-preset-btn-del';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => this.deletePreset(idx));
            row.appendChild(delBtn);

            list.appendChild(row);
        });

        const saveBtn = document.getElementById('scSavePresetBtn');
        if (saveBtn) {
            if (this.scSeqEditingIndex >= 0) {
                saveBtn.textContent = '✕ Cancel Edit';
            } else {
                saveBtn.textContent = '+ Save Current as Preset';
                saveBtn.disabled = this.scSeqState.numberOfPresets >= 8;
            }
        }
    }

    async reorderSCPresets(fromIdx, toIdx) {
        if (fromIdx === toIdx) return;
        const moved = this.scSeqState.presets.splice(fromIdx, 1)[0];
        this.scSeqState.presets.splice(toIdx, 0, moved);

        // Adjust editing index if affected by the move
        if (this.scSeqEditingIndex === fromIdx) {
            this.scSeqEditingIndex = toIdx;
        } else if (fromIdx < toIdx) {
            if (this.scSeqEditingIndex > fromIdx && this.scSeqEditingIndex <= toIdx) this.scSeqEditingIndex--;
        } else {
            if (this.scSeqEditingIndex >= toIdx && this.scSeqEditingIndex < fromIdx) this.scSeqEditingIndex++;
        }

        // Send firmware updates for the affected range
        const lo = Math.min(fromIdx, toIdx);
        const hi = Math.max(fromIdx, toIdx);
        for (let i = lo; i <= hi; i++) {
            await this.sendSCPresetUpdate(i, { index: i, ...this.scSeqState.presets[i] });
        }
        this.renderSCPresetList();
    }

    startRenamePreset(idx, nameEl) {
        const preset = this.scSeqState.presets[idx];
        if (!preset) return;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sc-preset-rename-input';
        input.value = preset.PresetName || `Preset ${idx}`;
        input.maxLength = 31;
        nameEl.replaceWith(input);
        input.focus();
        input.select();

        const commit = async () => {
            const newName = input.value.trim() || preset.PresetName;
            preset.PresetName = newName;
            await this.sendSCPresetUpdate(idx, { index: idx, PresetName: newName });
            this.renderSCPresetList();
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            } else if (e.key === 'Escape') {
                input.removeEventListener('blur', commit);
                this.renderSCPresetList();
            }
        });
    }

    applyPreset(idx) {
        const preset = this.scSeqState.presets[idx];
        if (!preset) return;

        this.stableColorState.color = preset.Hue;
        this.stableColorState.segments = preset.Segments ? preset.Segments.map(Boolean) : new Array(30).fill(true);
        this.stableColorState.selectionMode = 'segment';

        const picker = document.getElementById('stableColorPicker');
        if (picker) picker.value = preset.Hue;
        document.getElementById('selModeSegBtn').classList.add('stable-sel-btn-active');
        document.getElementById('selModeNodeBtn').classList.remove('stable-sel-btn-active');
        this.buildStableColorSVG();

        this.sendGlobalParam({
            StableColorHue: preset.Hue,
            StableColorSegments: this.stableColorState.segments
        });
    }

    startEditingPreset(idx) {
        const preset = this.scSeqState.presets[idx];
        if (!preset) return;

        this.scSeqEditingIndex = idx;
        this.stableColorState.color = preset.Hue;
        this.stableColorState.segments = preset.Segments ? preset.Segments.map(Boolean) : new Array(30).fill(true);
        this.stableColorState.selectionMode = 'segment';

        const picker = document.getElementById('stableColorPicker');
        if (picker) picker.value = preset.Hue;
        document.getElementById('selModeSegBtn').classList.add('stable-sel-btn-active');
        document.getElementById('selModeNodeBtn').classList.remove('stable-sel-btn-active');

        this.buildStableColorSVG();
        this.renderSCPresetList();
    }

    async saveEditedPreset(idx) {
        const preset = this.scSeqState.presets[idx];
        if (!preset) return;

        preset.Hue = this.stableColorState.color;
        preset.Segments = [...this.stableColorState.segments];
        this.scSeqEditingIndex = -1;

        await this.sendSCPresetUpdate(idx, {
            index: idx,
            Active: true,
            PresetName: preset.PresetName,
            Hue: this.stableColorState.color,
            Segments: this.stableColorState.segments
        });

        this.renderSCPresetList();
    }

    async saveCurrentAsPreset() {
        if (this.scSeqEditingIndex >= 0) {
            this.scSeqEditingIndex = -1;
            this.renderSCPresetList();
            return;
        }

        if (this.scSeqState.numberOfPresets >= 8) {
            this.showNotification('Maximum 8 presets reached', 'error');
            return;
        }

        const idx = this.scSeqState.numberOfPresets;
        const name = `Preset ${idx + 1}`;
        const newPreset = {
            Active: true,
            PresetName: name,
            Hue: this.stableColorState.color,
            Segments: [...this.stableColorState.segments]
        };

        this.scSeqState.presets[idx] = newPreset;
        this.scSeqState.numberOfPresets++;

        await this.sendSCPresetUpdate(idx, { index: idx, ...newPreset });
        await this.sendGlobalParam({ NumberOfSCPresets: this.scSeqState.numberOfPresets });

        this.renderSCPresetList();
        this.showNotification(`Saved as "${name}"`, 'success');
    }

    async deletePreset(idx) {
        if (this.scSeqState.numberOfPresets <= 1) {
            this.showNotification('Cannot delete the only preset', 'error');
            return;
        }

        for (let i = idx; i < this.scSeqState.numberOfPresets - 1; i++) {
            this.scSeqState.presets[i] = this.scSeqState.presets[i + 1];
            await this.sendSCPresetUpdate(i, { index: i, ...this.scSeqState.presets[i] });
        }

        const lastIdx = this.scSeqState.numberOfPresets - 1;
        const emptyPreset = { Active: false, PresetName: 'Preset', Hue: '#000000', Segments: new Array(30).fill(false) };
        this.scSeqState.presets[lastIdx] = emptyPreset;
        await this.sendSCPresetUpdate(lastIdx, { index: lastIdx, ...emptyPreset });

        this.scSeqState.numberOfPresets--;
        if (this.scSeqState.currentPreset >= this.scSeqState.numberOfPresets)
            this.scSeqState.currentPreset = 0;
        if (this.scSeqEditingIndex === idx) this.scSeqEditingIndex = -1;

        await this.sendGlobalParam({ NumberOfSCPresets: this.scSeqState.numberOfPresets });
        this.renderSCPresetList();
        this.showNotification('Preset deleted', 'info');
    }

    async sendSCPresetUpdate(idx, data) {
        if (this.isDemoMode()) {
            this.showNotification(`Demo: Preset ${idx} updated`, 'info');
            return;
        }
        try {
            const response = await fetch(`${this.baseUrl}/updateStableColorPreset`, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            console.error('Error updating SC preset:', error);
            this.showNotification('Failed to update preset', 'error');
        }
    }
}

// Utility functions for data conversion
class ProfileDataConverter {
    static convertToEditorFormat(microcontrollerProfile) {
        // Convert 19-element ActiveNodes array to array of active node IDs
        const activeNodes = [];
        microcontrollerProfile.ActiveNodes.forEach((isActive, index) => {
            if (isActive === 1) {
                activeNodes.push(index);
            }
        });

        return {
            ProfileIndex: microcontrollerProfile.ProfileIndex,
            ProfileName: microcontrollerProfile.ProfileName,
            Active: microcontrollerProfile.Active,
            activeNodes: activeNodes,
            globalSettings: {
                effectBasis: 'ripple',
                effectDuration: microcontrollerProfile.RippleLifeSpan || 3000,
                desiredBehavior: microcontrollerProfile.Behavior === 1 ? 'normal' : 'other',
                rippleDirection: this.convertDirection(microcontrollerProfile.Direction),
                rippleDelay: microcontrollerProfile.DelayBetweenRipples_ms || 1000,
                rippleLifeSpan: microcontrollerProfile.RippleLifeSpan || 3000,
                rippleSpeed: microcontrollerProfile.RippleSpeed || 1.0,
                decayPerTick: 0.985,
                hueDeltaTick: microcontrollerProfile.RainbowDeltaPerTick || 100,
                numberOfRipples: 1,
                colors: microcontrollerProfile.Colors || ['#FF0000']
            },
            nodeSpecificSettings: {}
        };
    }

    static convertToMicrocontrollerFormat(editorProfile) {
        // Convert array of active node IDs to 19-element ActiveNodes array
        const activeNodes = new Array(19).fill(0);
        editorProfile.activeNodes.forEach(nodeId => {
            if (nodeId >= 0 && nodeId < 19) {
                activeNodes[nodeId] = 1;
            }
        });

        return {
            ProfileIndex: editorProfile.ProfileIndex,
            ProfileName: editorProfile.ProfileName,
            Active: editorProfile.Active,
            ActiveNodes: activeNodes,
            Behavior: editorProfile.globalSettings.desiredBehavior === 'normal' ? 1 : 0,
            Direction: this.convertDirectionToNumber(editorProfile.globalSettings.rippleDirection),
            RippleLifeSpan: editorProfile.globalSettings.rippleLifeSpan,
            DelayBetweenRipples_ms: editorProfile.globalSettings.rippleDelay,
            RippleSpeed: editorProfile.globalSettings.rippleSpeed,
            RainbowDeltaPerTick: editorProfile.globalSettings.hueDeltaTick,
            NumberOfColors: editorProfile.globalSettings.colors.length,
            Colors: editorProfile.globalSettings.colors
        };
    }

    static convertDirection(direction) {
        const directionMap = {
            0: 'allDirections',
            1: 'inward',
            2: 'outward'
        };
        return directionMap[direction] || 'allDirections';
    }

    static convertDirectionToNumber(direction) {
        const directionMap = {
            'allDirections': 0,
            'inward': 1,
            'outward': 2
        };
        return directionMap[direction] || 0;
    }
}

// Initialize the profile manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

// Export for use in other modules
export { ProfileManager, ProfileDataConverter };
