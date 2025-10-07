document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');

    // Load the saved API key when the popup opens
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save the API key when the save button is clicked
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
                statusMessage.textContent = 'API Key saved!';
                setTimeout(() => {
                    statusMessage.textContent = '';
                    window.close(); // Close the popup after saving
                }, 1500);
            });
        } else {
            statusMessage.textContent = 'Please enter a key.';
            statusMessage.style.color = 'red';
        }
    });
});