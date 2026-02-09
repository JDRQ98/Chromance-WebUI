// File: /js/main.js - Simplified with single ProfileSettings structure

import { initNodeManager, updateNodeStyles, setActiveNodes, getActiveNodes } from './nodeManager.js';
import { initModalManager, updateModal } from './modalManager.js';
import { generateRainbowColors, generateRandomColors, generateSimilarColors } from './colorUtils.js';
import { drawHexagon } from './drawVisualizer.js'

// Single ProfileSettings object - no more separation between global and node-specific
let ProfileSettings = {
    ProfileName: 'Default Profile',
    Behavior: 0, // weaksauce
    Direction: -1, // All directions
    RippleLifeSpan: 3000,
    DelayBetweenRipples_ms: 1000,
    RippleSpeed: 1.0,
    Decay: 0.985, // Global parameter (not per-profile on firmware)
    RainbowDeltaPerTick: 100,
    NumberOfColors: 3,
    Colors: ["#FF0000", "#00FF00", "#0000FF"],
    ActiveNodes: [9] // Array of active node IDs
};

// ProfileDataConverter moved from landing.js
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
            Behavior: microcontrollerProfile.Behavior ?? 0,
            Direction: microcontrollerProfile.Direction ?? -1,
            RippleLifeSpan: microcontrollerProfile.RippleLifeSpan ?? 3000,
            DelayBetweenRipples_ms: microcontrollerProfile.DelayBetweenRipples_ms ?? 1000,
            RippleSpeed: microcontrollerProfile.RippleSpeed ?? 1.0,
            RainbowDeltaPerTick: microcontrollerProfile.RainbowDeltaPerTick ?? 100,
            NumberOfColors: microcontrollerProfile.NumberOfColors ?? 3,
            Colors: microcontrollerProfile.Colors ?? ['#FF0000'],
            ActiveNodes: activeNodes
        };
    }

    static convertToMicrocontrollerFormat(editorProfile) {
        // Convert array of active node IDs to 19-element ActiveNodes array
        const activeNodes = new Array(19).fill(0);
        editorProfile.ActiveNodes.forEach(nodeId => {
            if (nodeId >= 0 && nodeId < 19) {
                activeNodes[nodeId] = 1;
            }
        });

        return {
            ProfileIndex: editorProfile.ProfileIndex,
            ProfileName: editorProfile.ProfileName,
            Active: editorProfile.Active,
            ActiveNodes: activeNodes,
            Behavior: editorProfile.Behavior || 0,
            Direction: editorProfile.Direction || -1,
            RippleLifeSpan: editorProfile.RippleLifeSpan,
            DelayBetweenRipples_ms: editorProfile.DelayBetweenRipples_ms,
            RippleSpeed: editorProfile.RippleSpeed,
            RainbowDeltaPerTick: editorProfile.RainbowDeltaPerTick,
            NumberOfColors: editorProfile.NumberOfColors,
            Colors: editorProfile.Colors
        };
    }
}

function resetAllSettings() {
    ProfileSettings = {
        ProfileName: 'Default Profile',
        Behavior: 0, // weaksauce
        Direction: -1, // All directions
        RippleLifeSpan: 3000,
        DelayBetweenRipples_ms: 1000,
        RippleSpeed: 1.0,
        Decay: 0.985,
        RainbowDeltaPerTick: 100,
        NumberOfColors: 3,
        Colors: ["#FF0000", "#00FF00", "#0000FF"],
        ActiveNodes: [9]
    };
    
    if (window.nodeManager){
        window.nodeManager.deactivateAllNodes()
    }
    setActiveNodes([9])
    updateModal([], getActiveNodes(), ProfileSettings, updateNodeStyles);
    updateNodeStyles(ProfileSettings);
}

function calculateNodePositions() {
    const container = document.getElementById('container');
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const numNodes = 19;
    const baseNodeSize = 30; //This will now match the CSS variable

    // Calculate the horizontal and vertical spacing
    const horizontalSpacing = containerWidth / 6; //Approx 6 columns
    const verticalSpacing = containerHeight / 6; //Approx 6 rows

    const nodePositions = [
        { x: 3 * horizontalSpacing, y: 0 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 1 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 1 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 2 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 2 * verticalSpacing },
        { x: 5.5 * horizontalSpacing, y: 2 * verticalSpacing },
         { x: 1.5 * horizontalSpacing, y: 3 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 3 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 5.5 * horizontalSpacing, y: 4 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 5 * verticalSpacing },
         { x: 4.5 * horizontalSpacing, y: 5 * verticalSpacing },
        { x: 0.5 * horizontalSpacing, y: 6 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 6 * verticalSpacing },
         { x: 5.5 * horizontalSpacing, y: 6 * verticalSpacing },
        { x: 1.5 * horizontalSpacing, y: 7 * verticalSpacing },
        { x: 4.5 * horizontalSpacing, y: 7 * verticalSpacing },
        { x: 3 * horizontalSpacing, y: 8 * verticalSpacing },
    ];

    document.querySelectorAll('.hex-wrap').forEach((nodeWrapper, index) => {
        nodeWrapper.style.left = `${nodePositions[index].x - (baseNodeSize / 2)}px`;
        nodeWrapper.style.top = `${nodePositions[index].y - (baseNodeSize / 2)}px`;
    });
}

async function initializeApp() {
    calculateNodePositions();
    initNodeManager(updateNodeStyles, updateModal, ProfileSettings);
    initModalManager(ProfileSettings, updateNodeStyles, updateModal, setActiveNodes, getActiveNodes);
    
    // Load profiles from microcontroller first
    await loadProfilesFromMicrocontroller();
    
    // Check if we're editing a profile from the landing page
    loadProfileFromLandingPage();
    
    // Setup profile name editing functionality
    setupProfileNameEditing();
    
    updateNodeStyles(ProfileSettings);
    drawHexagon();
}

async function loadProfilesFromMicrocontroller() {
    try {
        const response = await fetch('/getCurrentProfiles', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the response text first, then try to parse it
        const text = await response.text();
        console.log('Raw response from microcontroller:', text);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            
            // Fix trailing comma issue
            let fixedText = text;
            fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
            fixedText = fixedText.replace(/,(\s*])/g, '$1');
            fixedText = fixedText.replace(/,(\s*})/g, '$1');
            
            console.log('Fixed JSON:', fixedText);
            
            try {
                data = JSON.parse(fixedText);
            } catch (secondError) {
                console.error('Second JSON parsing error:', secondError);
                throw new Error(`JSON parsing failed: ${jsonError.message}`);
            }
        }
        
        console.log('Received profiles from microcontroller:', data);
        
        // Load global Decay value
        if (data.Decay !== undefined) {
            ProfileSettings.Decay = data.Decay;
        }

        // Update the profiles dropdown with profiles from microcontroller
        if (data.Profiles && Array.isArray(data.Profiles)) {
            updateProfilesDropdown(data.Profiles);
        }

        return data;
    } catch (error) {
        console.error('Error loading profiles from microcontroller:', error);
        return null;
    }
}

function updateProfilesDropdown(profiles) {
    const profileDropdown = document.getElementById('profileDropdown');
    if (!profileDropdown) return;
    
    // Clear existing options
    profileDropdown.innerHTML = '';
    
    // Add profiles from microcontroller
    profiles.forEach((profile, index) => {
        const option = document.createElement('option');
        option.value = `micro_${index}`;
        option.text = profile.ProfileName || `Profile ${index}`;
        profileDropdown.add(option);
    });
    
    // Add "New Profile" option if we're creating a new profile
    const isNewProfile = localStorage.getItem('isNewProfile') === 'true';
    if (isNewProfile) {
        const newOption = document.createElement('option');
        newOption.value = 'new';
        newOption.text = 'New Profile';
        newOption.selected = true;
        profileDropdown.add(newOption);
    }
    
    // If no profiles and not creating new, add default
    if (profiles.length === 0 && !isNewProfile) {
        const option = document.createElement('option');
        option.value = 'default';
        option.text = 'Default';
        profileDropdown.add(option);
    }
}

function loadProfileFromLandingPage() {
    const editingProfileIndex = localStorage.getItem('editingProfileIndex');
    const profileData = localStorage.getItem('profileData');
    const isNewProfile = localStorage.getItem('isNewProfile') === 'true';
    
    if (editingProfileIndex !== null && profileData) {
        try {
            const microcontrollerProfile = JSON.parse(profileData);
            const editorProfile = ProfileDataConverter.convertToEditorFormat(microcontrollerProfile);
            
            // Update ProfileSettings with the loaded profile
            Object.assign(ProfileSettings, editorProfile);
            
            // Set active nodes
            setActiveNodes(editorProfile.ActiveNodes);
            
            // Update the profile name in the UI
            const profileNameInput = document.getElementById('profileNameInput');
            if (profileNameInput) {
                profileNameInput.value = editorProfile.ProfileName || 'Unnamed Profile';
            }
            
            // Update the profile title
            const profileTitle = document.getElementById('profileTitle');
            if (profileTitle) {
                profileTitle.textContent = `Profile editor: ${editorProfile.ProfileName || 'Unnamed Profile'}`;
            }
            
            // Store the profile index for saving
            window.editingProfileIndex = parseInt(editingProfileIndex);
            window.isNewProfile = isNewProfile;
            
            // Clear the stored data
            localStorage.removeItem('editingProfileIndex');
            localStorage.removeItem('profileData');
            localStorage.removeItem('isNewProfile');
            
            console.log('Loaded profile from landing page:', editorProfile);
            console.log('Is new profile:', isNewProfile);
        } catch (error) {
            console.error('Error loading profile from landing page:', error);
        }
    }
}

function setupProfileNameEditing() {
    const editProfileNameButton = document.getElementById('editProfileNameButton');
    const profileNameEditContainer = document.getElementById('profileNameEditContainer');
    const profileNameInput = document.getElementById('profileNameInput');
    const saveProfileNameButton = document.getElementById('saveProfileNameButton');
    const cancelProfileNameButton = document.getElementById('cancelProfileNameButton');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (!editProfileNameButton || !profileNameEditContainer || !profileNameInput || 
        !saveProfileNameButton || !cancelProfileNameButton || !profileDropdown) {
        console.warn('Profile name editing elements not found');
        return;
    }
    
    // Show edit container when edit button is clicked
    editProfileNameButton.addEventListener('click', () => {
        profileNameEditContainer.style.display = 'block';
        profileNameInput.value = ProfileSettings.ProfileName || '';
        profileNameInput.focus();
        profileNameInput.select();
    });
    
    // Save profile name
    saveProfileNameButton.addEventListener('click', () => {
        const newName = profileNameInput.value.trim();
        if (newName) {
            ProfileSettings.ProfileName = newName;
            
            // Update the dropdown option text
            const selectedOption = profileDropdown.options[profileDropdown.selectedIndex];
            if (selectedOption) {
                selectedOption.text = newName;
            }
            
            // Update the profile title
            const profileTitle = document.getElementById('profileTitle');
            if (profileTitle) {
                profileTitle.textContent = `Profile editor: ${newName}`;
            }
            
            // Hide the edit container
            profileNameEditContainer.style.display = 'none';
        }
    });
    
    // Cancel editing
    cancelProfileNameButton.addEventListener('click', () => {
        profileNameEditContainer.style.display = 'none';
    });
    
    // Save on Enter key
    profileNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            saveProfileNameButton.click();
        } else if (event.key === 'Escape') {
            cancelProfileNameButton.click();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    window.addEventListener('resize', calculateNodePositions);
    
    // Add back button functionality
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

// Function to send the configuration to the microcontroller
function sendConfigurationToMicrocontroller() {
    const activeNodes = getActiveNodes();
    
    // Get the profile name from the input field
    const profileNameInput = document.getElementById('profileNameInput');
    const profileName = profileNameInput ? profileNameInput.value : 'Unnamed Profile';
    
    // Create the editor format data
    const editorProfile = {
        ProfileIndex: window.editingProfileIndex !== undefined ? window.editingProfileIndex : 0,
        ProfileName: profileName,
        Active: true,
        ActiveNodes: activeNodes,
        Behavior: ProfileSettings.Behavior,
        Direction: ProfileSettings.Direction,
        RippleLifeSpan: ProfileSettings.RippleLifeSpan,
        DelayBetweenRipples_ms: ProfileSettings.DelayBetweenRipples_ms,
        RippleSpeed: ProfileSettings.RippleSpeed,
        RainbowDeltaPerTick: ProfileSettings.RainbowDeltaPerTick,
        NumberOfColors: ProfileSettings.NumberOfColors,
        Colors: ProfileSettings.Colors
    };
    
    // Convert to microcontroller format
    const microcontrollerData = ProfileDataConverter.convertToMicrocontrollerFormat(editorProfile);
    
    // Log the data being sent
    console.log("Sending profile to microcontroller:", microcontrollerData);
    
    // Always use the updateProfile endpoint for both new and existing profiles
    const endpoint = '/updateProfile';
    
    // Send the POST request to the microcontroller
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(microcontrollerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            return response.text();
        }
    })
    .then(responseData => {
        console.log('Profile saved successfully:', responseData);
        const message = window.isNewProfile ? 'New profile created successfully!' : 'Profile updated successfully!';
        showNotification(message, 'success');
        
        // If we're editing a profile from the landing page, redirect back
        if (window.editingProfileIndex !== undefined) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        showNotification('Error saving profile. See console for details.', 'error');
    });

    // Also save global Decay parameter
    fetch('/updateGlobalParameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Decay: ProfileSettings.Decay })
    }).catch(error => {
        console.error('Error saving Decay:', error);
    });
}

// Function to show notifications (similar to landing page)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#007bff'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
// Function to reset to default settings
function resetToDefaults() {
    resetAllSettings();
    setActiveNodes([9]); // Default to node 9 active
    updateNodeStyles(ProfileSettings);
    updateModal([], getActiveNodes(), ProfileSettings, updateNodeStyles);
}

// Function to check if we're editing a new profile
function isNewProfile() {
    return window.isNewProfile === true || localStorage.getItem('isNewProfile') === 'true';
}

// Function to revert to microcontroller state for existing profiles
async function revertToMicrocontrollerState() {
    try {
        const response = await fetch('/getCurrentProfiles', {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonError) {
            // Fix trailing comma issue
            let fixedText = text;
            fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
            data = JSON.parse(fixedText);
        }
        
        if (data.Profiles && Array.isArray(data.Profiles)) {
            const currentProfileIndex = window.editingProfileIndex;
            const profile = data.Profiles.find(p => p.ProfileIndex === currentProfileIndex);
            
            if (profile) {
                // Convert microcontroller profile to editor format
                const editorProfile = ProfileDataConverter.convertToEditorFormat(profile);
                
                // Update ProfileSettings with the reverted profile
                Object.assign(ProfileSettings, editorProfile);
                
                // Set active nodes
                setActiveNodes(editorProfile.ActiveNodes);
                
                // Update the profile name in the UI
                const profileNameInput = document.getElementById('profileNameInput');
                if (profileNameInput) {
                    profileNameInput.value = editorProfile.ProfileName || 'Unnamed Profile';
                }
                
                // Update the profile title
                const profileTitle = document.getElementById('profileTitle');
                if (profileTitle) {
                    profileTitle.textContent = `Profile editor: ${editorProfile.ProfileName || 'Unnamed Profile'}`;
                }
                
                // Update UI
                updateNodeStyles(ProfileSettings);
                updateModal([], getActiveNodes(), ProfileSettings, updateNodeStyles);
                
                showNotification('Profile reverted to microcontroller state', 'info');
            } else {
                throw new Error('Profile not found in microcontroller');
            }
        } else {
            throw new Error('No profiles found in response');
        }
    } catch (error) {
        console.error('Error reverting to microcontroller state:', error);
        showNotification('Failed to revert profile. Using default settings.', 'warning');
        resetToDefaults();
    }
}

// Smart discard function that handles both new and existing profiles
async function smartDiscard() {
    if (isNewProfile()) {
        // For new profiles, reset to defaults
        resetToDefaults();
        showNotification('New profile reset to defaults', 'info');
    } else {
        // For existing profiles, revert to microcontroller state
        await revertToMicrocontrollerState();
    }
}

// Fire-and-forget sync to ESP32 for live preview (no redirect, no notification)
function syncToMicrocontroller() {
    const activeNodes = getActiveNodes();
    const profileNameInput = document.getElementById('profileNameInput');
    const profileName = profileNameInput ? profileNameInput.value : 'Unnamed Profile';

    const editorProfile = {
        ProfileIndex: window.editingProfileIndex !== undefined ? window.editingProfileIndex : 0,
        ProfileName: profileName,
        Active: true,
        ActiveNodes: activeNodes,
        Behavior: ProfileSettings.Behavior,
        Direction: ProfileSettings.Direction,
        RippleLifeSpan: ProfileSettings.RippleLifeSpan,
        DelayBetweenRipples_ms: ProfileSettings.DelayBetweenRipples_ms,
        RippleSpeed: ProfileSettings.RippleSpeed,
        RainbowDeltaPerTick: ProfileSettings.RainbowDeltaPerTick,
        NumberOfColors: ProfileSettings.NumberOfColors,
        Colors: ProfileSettings.Colors
    };

    const microcontrollerData = ProfileDataConverter.convertToMicrocontrollerFormat(editorProfile);
    console.log("Live sync to microcontroller:", microcontrollerData);

    fetch('/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(microcontrollerData)
    }).catch(error => {
        console.error('Live sync error:', error);
    });

    // Also sync global Decay parameter
    fetch('/updateGlobalParameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Decay: ProfileSettings.Decay })
    }).catch(error => {
        console.error('Live sync Decay error:', error);
    });
}

// Make the functions globally accessible
window.mainJS = {
    sendConfigurationToMicrocontroller: sendConfigurationToMicrocontroller,
    syncToMicrocontroller: syncToMicrocontroller,
    resetToDefaults: resetToDefaults,
    smartDiscard: smartDiscard
};

export { ProfileSettings, generateRainbowColors, generateRandomColors, generateSimilarColors };