// effectsManager.js - Simplified for single ProfileSettings structure

import { generateRainbowColors } from './colorUtils.js';
import { getActiveNodes } from './nodeManager.js';

let currentProfileId = 1;
let profiles = {};
let nextProfileId = 1;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadCurrentProfile(profileSettings, updateNodeStyles, updateModal, resetAllSettings, setActiveNodes) {
    const profileDropdown = document.getElementById('profileDropdown');
    if (!profileDropdown) return;
    
    const selectedProfileId = profileDropdown.value;

    if (selectedProfileId === 'new') {
        // Handle "New Profile" option
        resetAllSettings();
        setActiveNodes([9]);
        updateNodeStyles(profileSettings);
        updateModal([], getActiveNodes(), profileSettings, updateNodeStyles);
        return;
    }

    if (profiles[selectedProfileId]) {
        currentProfileId = selectedProfileId;
        // Update ProfileSettings with the selected profile
        Object.assign(profileSettings, deepClone(profiles[selectedProfileId]));
        
        if (profiles[selectedProfileId].ActiveNodes) {
            const activeNodes = profiles[selectedProfileId].ActiveNodes;
            setActiveNodes(activeNodes);
        } else {
            setActiveNodes([]);
        }
    } else {
        resetAllSettings();
        setActiveNodes([]);
    }
    
    updateNodeStyles(profileSettings);
    updateModal([], getActiveNodes(), profileSettings, updateNodeStyles);
}
function updateCurrentProfile(profileSettings, activeNodes) {
    const profileDropdown = document.getElementById('profileDropdown');
    if (!profileDropdown) return;
    
    const selectedOption = profileDropdown.options[profileDropdown.selectedIndex];
    let profileName = 'Default';
    if (profiles[currentProfileId]) {
        profileName = profiles[currentProfileId].name;
    } else if (selectedOption) {
        profileName = selectedOption.text;
    }
    
    profiles[currentProfileId] = {
        name: profileName,
        ...deepClone(profileSettings),
        ActiveNodes: deepClone(activeNodes)
    };
    localStorage.setItem('profiles', JSON.stringify(profiles));
}
function updateProfileTitle(titleElement) {
    const profileDropdown = document.getElementById('profileDropdown');
    const selectedOption = profileDropdown.options[profileDropdown.selectedIndex];
    const profileName = selectedOption ? selectedOption.text : 'Default';
    titleElement.textContent = `Profile editor: ${profileName}`;
}

function populateProfileDropdown() {
    const profileDropdown = document.getElementById('profileDropdown');
    if (!profileDropdown) return;
    
    const selectedProfileId = profileDropdown.value;
    profileDropdown.innerHTML = '';
    
    const sortedKeys = Object.keys(profiles).sort((a, b) => parseInt(a) - parseInt(b));
    sortedKeys.forEach(profileId => {
        const option = document.createElement('option');
        option.value = profileId;
        option.text = profiles[profileId].name || `Profile ${profileId}`;
        profileDropdown.add(option);
    });
    
    if (sortedKeys.length === 0) {
        const option = document.createElement('option');
        option.value = 1;
        option.text = `Default`;
        profileDropdown.add(option);
        currentProfileId = 1;
    }
    profileDropdown.value = currentProfileId;
}
function initEffectsManager(profileSettings, updateNodeStyles, updateModal, resetAllSettings, setActiveNodes) {
    // Load profiles from localStorage
    const storedProfiles = localStorage.getItem('profiles');
    if (storedProfiles) {
        profiles = JSON.parse(storedProfiles);
        if (Object.keys(profiles).length > 0) {
            nextProfileId = Math.max(...Object.keys(profiles).map(Number)) + 1;
        }
    } else {
        // Set default profile
        profiles[1] = {
            name: 'Default',
            ProfileName: 'Default Profile',
            Behavior: 0, // weaksauce
            Direction: -1, // All directions
            RippleLifeSpan: 3000,
            DelayBetweenRipples_ms: 1000,
            RippleSpeed: 1.0,
            RainbowDeltaPerTick: 100,
            NumberOfColors: 3,
            Colors: generateRainbowColors(3),
            ActiveNodes: [9]
        };
        localStorage.setItem('profiles', JSON.stringify(profiles));
        nextProfileId = 2;
    }
    
    const storedCurrentProfileId = localStorage.getItem('currentProfileId');
    if (storedCurrentProfileId) {
        currentProfileId = parseInt(storedCurrentProfileId, 10);
    }
    
    populateProfileDropdown();
    loadCurrentProfile(profileSettings, updateNodeStyles, updateModal, resetAllSettings, setActiveNodes);
    updateCurrentProfile(profileSettings, getActiveNodes());
    
    const titleElement = document.getElementById('profileTitle');
    updateProfileTitle(titleElement);
    
    // Update profile when selecting from dropdown
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.addEventListener('change', function () {
            updateCurrentProfile(profileSettings, getActiveNodes());
            loadCurrentProfile(profileSettings, updateNodeStyles, updateModal, resetAllSettings, setActiveNodes);
            updateProfileTitle(titleElement);
        });
    }

    // Add profile logic
    const addProfileButton = document.getElementById('addProfileButton');
    if (addProfileButton) {
        addProfileButton.addEventListener('click', () => {
            // Add "New Profile" option to dropdown
            const newOption = document.createElement('option');
            newOption.value = 'new';
            newOption.text = 'New Profile';
            newOption.selected = true;
            profileDropdown.add(newOption);
            
            // Reset to default settings for new profile
            resetAllSettings();
            setActiveNodes([9]);
            updateNodeStyles(profileSettings);
            updateModal([], getActiveNodes(), profileSettings, updateNodeStyles);
            updateProfileTitle(titleElement);
        });
    }

    // Delete profile logic
    const deleteProfileButton = document.getElementById('deleteProfileButton');
    if (deleteProfileButton) {
        deleteProfileButton.addEventListener('click', () => {
            const selectedProfileId = document.getElementById('profileDropdown').value;
            const profileDropdown = document.getElementById('profileDropdown');
            const selectedOption = profileDropdown.options[profileDropdown.selectedIndex];
            
            if (Object.keys(profiles).length <= 1) {
                alert('Cannot delete the only profile');
                return;
            }
            
            delete profiles[selectedProfileId];
            localStorage.setItem('profiles', JSON.stringify(profiles));
            profileDropdown.remove(profileDropdown.selectedIndex);

            let remainingKeys = Object.keys(profiles);
            if (remainingKeys.length === 0) {
                profiles[1] = {
                    name: 'Default',
                    ProfileName: 'Default Profile',
                    Behavior: 0,
                    Direction: -1,
                    RippleLifeSpan: 3000,
                    DelayBetweenRipples_ms: 1000,
                    RippleSpeed: 1.0,
                    RainbowDeltaPerTick: 100,
                    NumberOfColors: 3,
                    Colors: generateRainbowColors(3),
                    ActiveNodes: [9]
                };
                localStorage.setItem('profiles', JSON.stringify(profiles));
                currentProfileId = 1;
                nextProfileId = 2;
                populateProfileDropdown();
            } else {
                currentProfileId = remainingKeys[0];
                profileDropdown.value = currentProfileId;
            }

            loadCurrentProfile(profileSettings, updateNodeStyles, updateModal, resetAllSettings, setActiveNodes);
            updateProfileTitle(titleElement);
        });
    }
}
export { initEffectsManager, loadCurrentProfile, updateCurrentProfile, currentProfileId, profiles };