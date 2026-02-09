// Landing Page JavaScript
class ProfileManager {
    constructor() {
        this.profiles = [];
        this.currentProfileIndex = -1;
        this.brightnessTimeout = null;
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
            this.createHexGrid(cardElement.querySelector('.hex-grid'), profile.ActiveNodes || []);
            
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
        
        // Create 19 hexagon nodes (1 2 3 2 3 2 3 2 1 arrangement)
        const nodePositions = [
            [2, 0], // Row 0: 1 node (node 0)
            [1, 1], [3, 1], // Row 1: 2 nodes (nodes 1, 2)
            [0, 2], [2, 2], [4, 2], // Row 2: 3 nodes (nodes 3, 4, 5)
            [1, 3], [3, 3], // Row 3: 2 nodes (nodes 6, 7)
            [0, 4], [2, 4], [4, 4], // Row 4: 3 nodes (nodes 8, 9, 10)
            [1, 5], [3, 5], // Row 5: 2 nodes (nodes 11, 12)
            [0, 6], [2, 6], [4, 6], // Row 6: 3 nodes (nodes 13, 14, 15)
            [1, 7], [3, 7], // Row 7: 2 nodes (nodes 16, 17)
            [2, 8] // Row 8: 1 node (node 18)
        ];

        nodePositions.forEach(([row, col], index) => {
            const hexNode = document.createElement('div');
            hexNode.className = 'hex-node';
            
            // Check if this node is active
            if (activeNodes[index] === 1) {
                hexNode.classList.add('active');
            }
            
            // Position the node in the grid
            hexNode.style.gridRow = row + 1;
            hexNode.style.gridColumn = col + 1;
            
            container.appendChild(hexNode);
        });
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
            Active: 0, // Start as inactive
            ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Default to node 9 active
            Behavior: 1,
            Direction: 0,
            RippleLifeSpan: 3000,
            DelayBetweenRipples_ms: 1000,
            RippleSpeed: 1.0,
            RainbowDeltaPerTick: 100,
            NumberOfColors: 3,
            Colors: ["#FF0000", "#00FF00", "#0000FF"]
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
                ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                Behavior: 1,
                Direction: 0,
                RippleLifeSpan: 3000,
                DelayBetweenRipples_ms: 1000,
                RippleSpeed: 1.0,
                RainbowDeltaPerTick: 100,
                NumberOfColors: 3,
                Colors: ["#FF0000", "#00FF00", "#0000FF"]
            },
            {
                ProfileIndex: 1,
                ProfileName: "Demo Profile 2",
                Active: false,
                ActiveNodes: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                Behavior: 1,
                Direction: 1,
                RippleLifeSpan: 5000,
                DelayBetweenRipples_ms: 2000,
                RippleSpeed: 0.5,
                RainbowDeltaPerTick: 200,
                NumberOfColors: 5,
                Colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
            },
            {
                ProfileIndex: 2,
                ProfileName: "Demo Profile 3",
                Active: false,
                ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                Behavior: 0,
                Direction: 2,
                RippleLifeSpan: 2000,
                DelayBetweenRipples_ms: 500,
                RippleSpeed: 2.0,
                RainbowDeltaPerTick: 50,
                NumberOfColors: 2,
                Colors: ["#FF0000", "#FFFFFF"]
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
