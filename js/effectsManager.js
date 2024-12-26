// effectsManager.js
let currentEffectId = 1; // Variable to track the current effect ID
let effects = {}; // Variable to store saved effects

function loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings) {
    if (effects[currentEffectId]) {
        Object.assign(globalSettings, effects[currentEffectId].globalSettings);
        Object.assign(nodeSpecificSettings, effects[currentEffectId].nodeSpecificSettings);
    } else {
        resetAllSettings(globalSettings, nodeSpecificSettings);
    }
    loadGlobalSettings(globalSettings);
    updateNodeStyles(globalSettings, nodeSpecificSettings);
    updateModal(nodeSpecificSettings, globalSettings);
}


function saveCurrentEffect(globalSettings, nodeSpecificSettings) {
    effects[currentEffectId] = {
        globalSettings: { ...globalSettings }, // Copying to not modify the original object
        nodeSpecificSettings: { ...nodeSpecificSettings },
    };
    localStorage.setItem('effects', JSON.stringify(effects));
    console.log("Saved effect with id", currentEffectId);
}

function updateEffectTitle(titleElement) {
    titleElement.textContent = `Effect editor: Effect ${currentEffectId}`;
}

function initEffectsManager(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings) {
    // Load effects from localStorage
    const storedEffects = localStorage.getItem('effects');
    if (storedEffects) {
        effects = JSON.parse(storedEffects);
    }
    // Load settings for the current effect
    loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
    const titleElement = document.getElementById('effectTitle');
    updateEffectTitle(titleElement);

    const effectButtons = document.querySelectorAll('.effect-button');
    effectButtons.forEach(button => {
        button.addEventListener('click', function () {
            currentEffectId = this.dataset.effectId;
            loadCurrentEffect(globalSettings, nodeSpecificSettings, updateNodeStyles, loadGlobalSettings, updateModal, resetAllSettings);
            updateEffectTitle(titleElement);
        });
    });

    const saveChangesButton = document.getElementById('saveChangesButton');
    saveChangesButton.addEventListener('click', function () {
        saveCurrentEffect(globalSettings, nodeSpecificSettings);
    });
}
export { initEffectsManager, loadCurrentEffect, saveCurrentEffect, currentEffectId };