// Landing Page JavaScript - No CORS Version
class ProfileManager {
    constructor() {
        this.profiles = [];
        this.currentProfileIndex = -1;
        // Use IP address directly since domain doesn't resolve
        this.baseUrl = 'http://192.168.100.37';
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
    }

    async loadProfiles() {
        this.showLoadingState();
        
        try {
            console.log(`Trying to connect to: ${this.baseUrl}`);
            
            // Use no-cors mode to bypass CORS restrictions
            const response = await fetch(`${this.baseUrl}/getCurrentProfiles`, {
                method: 'GET',
                mode: 'no-cors', // This bypasses CORS but we can't read the response
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log(`Response from ${this.baseUrl}:`, response.status, response.statusText);
            
            // Since we can't read the response with no-cors, we'll use a proxy approach
            // For now, let's load demo data and show instructions
            this.showCorsInstructions();
            
        } catch (error) {
            console.error(`Error with ${this.baseUrl}:`, error);
            this.showCorsInstructions();
        }
    }

    showCorsInstructions() {
        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        
        // Create instructions div
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'error-state';
        instructionsDiv.style.display = 'flex';
        
        instructionsDiv.innerHTML = `
            <div>
                <div class="error-icon">🔧</div>
                <h3>CORS Configuration Required</h3>
                <p>Your microcontroller needs CORS headers to work with the web browser.</p>
                
                <div style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px; text-align: left;">
                    <strong>Quick Fix - Add this to your microcontroller code:</strong>
                    <pre style="background: #e9ecef; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto;">
// Add this function to handle OPTIONS requests
void handle_getCurrentProfilesOptions(AsyncWebServerRequest *request) {
  AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "");
  response->addHeader("Access-Control-Allow-Origin", "*");
  response->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  request->send(response);
}

// Add this line to register the OPTIONS handler
server.on("/getCurrentProfiles", HTTP_OPTIONS, handle_getCurrentProfilesOptions);
                    </pre>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem;">
                    <button onclick="loadDemoProfiles()" class="retry-button">Try Demo Mode</button>
                    <button onclick="location.reload()" class="retry-button">Retry After Fix</button>
                </div>
            </div>
        `;
        
        document.querySelector('main').appendChild(instructionsDiv);
        
        // Make loadDemoProfiles globally available
        window.loadDemoProfiles = () => {
            this.loadDemoProfiles();
            instructionsDiv.remove();
        };
    }

    loadDemoProfiles() {
        // Create demo profiles based on your actual data
        this.profiles = [
            {
                ProfileIndex: 0,
                ProfileName: "Rainbow 7",
                Active: true,
                ActiveNodes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                Behavior: 1,
                Direction: -1,
                RippleLifeSpan: 3000,
                DelayBetweenRipples_ms: 3000,
                RippleSpeed: 0.50,
                RainbowDeltaPerTick: 200,
                NumberOfColors: 7,
                Colors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#8B00FF"]
            }
        ];
        
        this.currentProfileIndex = 0;
        this.renderProfiles();
        this.showProfilesContainer();
        this.showNotification('Demo mode activated - using your actual profile data', 'info');
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
            
            // Set active status
            const isActive = profile.Active === true;
            const statusIndicator = cardElement.querySelector('.status-indicator');
            const statusText = cardElement.querySelector('.status-text');
            
            if (isActive) {
                statusIndicator.classList.add('active');
                statusText.textContent = 'Active';
                cardElement.classList.add('active');
                this.currentProfileIndex = index;
            } else {
                statusIndicator.classList.remove('active');
                statusText.textContent = 'Inactive';
            }
            
            // Create hex grid visualization
            this.createHexGrid(cardElement.querySelector('.hex-grid'), profile.ActiveNodes || []);
            
            // Create color preview
            this.createColorPreview(cardElement.querySelector('.color-preview'), profile.Colors || []);
            
            // Add event listeners
            cardElement.querySelector('.select-button').addEventListener('click', () => {
                this.selectProfile(index);
            });
            
            cardElement.querySelector('.edit-button').addEventListener('click', () => {
                this.editProfile(index);
            });
            
            profilesGrid.appendChild(profileCard);
        });
    }

    createHexGrid(container, activeNodes) {
        container.innerHTML = '';
        
        // Create 19 hexagon nodes (6x7 grid with specific positions)
        const nodePositions = [
            [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2],
            [1, 3], [3, 3], [0, 4], [2, 4], [4, 4],
            [1, 5], [3, 5], [0, 6], [2, 6], [4, 6],
            [1, 7], [3, 7], [2, 8]
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

    async selectProfile(profileIndex) {
        if (profileIndex === this.currentProfileIndex) {
            this.showNotification('This profile is already active', 'info');
            return;
        }

        // Check if we're in demo mode
        if (this.isDemoMode()) {
            this.currentProfileIndex = profileIndex;
            this.updateActiveProfileDisplay();
            this.showNotification('Demo profile selected (no actual change sent to microcontroller)', 'info');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/selectProfile`, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ProfileIndex: profileIndex })
            });

            // Update local state
            this.currentProfileIndex = profileIndex;
            this.updateActiveProfileDisplay();
            this.showNotification('Profile selected successfully', 'success');
            
        } catch (error) {
            console.error('Error selecting profile:', error);
            this.showNotification('Failed to select profile', 'error');
        }
    }

    isDemoMode() {
        return this.profiles.length > 0 && 
               this.profiles[0].ProfileName && 
               this.profiles[0].ProfileName.includes('Rainbow');
    }

    editProfile(profileIndex) {
        // Store the profile index in localStorage for the editor to use
        localStorage.setItem('editingProfileIndex', profileIndex);
        localStorage.setItem('profileData', JSON.stringify(this.profiles[profileIndex]));
        
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
}

// Initialize the profile manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});

// Export for use in other modules
export { ProfileManager };
