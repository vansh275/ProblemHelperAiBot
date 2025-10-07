// --- 1. STATE & CONSTANTS ---

let conversationHistory = [];
let isFirstMessage = true;
let isChatOpen = false;
let FetchedData;
let userCode;

const getProblemIdFromUrl = (url) => {
    const regex = /-(\d+)\?/;
    const match = url.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
};
const problemId = getProblemIdFromUrl(window.location.href);

// --- 2. STORAGE & HISTORY MANAGEMENT ---

const saveHistory = async () => {
    if (!problemId) return;
    const key = `chatHistory_${problemId}`;
    await chrome.storage.local.set({ [key]: conversationHistory });
};

const renderHistory = () => {
    const messagesArea = document.getElementById('ai-chat-messages');
    if (!messagesArea) return;
    messagesArea.innerHTML = '';
    for (let i = 1; i < conversationHistory.length; i++) {
        const message = conversationHistory[i];
        displayMessage(message.parts[0].text, message.role);
    }
};

const loadHistory = async () => {
    if (!problemId) return;
    const key = `chatHistory_${problemId}`;
    const result = await chrome.storage.local.get([key]);
    if (result[key] && result[key].length > 0) {
        conversationHistory = result[key];
        isFirstMessage = false;
        renderHistory();
    }
};

// --- 3. AI & PROMPT LOGIC ---

const createPromptFromData = (problemData) => {
    const body = problemData?.data?.body;
    const hint1 = problemData?.data?.hints?.hint1;
    const hint2 = problemData?.data?.hints?.hint2;
    const editorialCodeObject = problemData?.data?.editorial_code?.[0];
    const editorialCode = editorialCodeObject?.code;
    const editorialLanguage = editorialCodeObject?.language;

    const systemPrompt = `
# YOUR ROLE: CodeHelper AI Tutor
You are an expert programming tutor. Your one and only goal is to help the user solve the specific programming problem detailed below. You must act as a guide, not an answer key. Your mission is to foster learning and critical thinking.
---
## **CORE DIRECTIVES**
1.  **GUIDE, DON'T SOLVE:** Your primary technique is Socratic questioning. Ask leading questions that force the user to think. Explain concepts, but never give away the final answer directly.
2.  **STRICTLY ON-TOPIC:** You must ONLY discuss the provided programming problem, its hints, the editorial solution, the user's code, and the fundamental computer science concepts required to solve it.
3.  **NEVER WRITE FULL CODE:** You are strictly forbidden from writing a complete, correct solution. You may provide small, illustrative code snippets or pseudo-code to clarify a point, but never the full answer.
---
## **BEHAVIORAL RULES**
* **Initial Greeting:** For the user's first message, do not summarize the problem. The user already knows the context. Simply provide a brief, welcoming greeting and ask how you can help.
    * *Example Response:* "Hello! How can I help you with this problem?"
* **If the user asks for the direct solution:** Politely refuse. Instead, offer to explain a hint, analyze their current code, or discuss a relevant algorithm.
    * *Example Response:* "I can't provide the full solution, as the goal is for you to learn by solving it. Let's start with the first hint. What are your thoughts on it?"
* **If the user asks an off-topic question (e.g., "What is the capital of France?", "Write me a poem"):** Politely refuse and redirect them back to the problem.
    * *Example Response:* "I can only help with the programming problem we're discussing. Shall we get back to analyzing your code?"
* **If the user insists on an off-topic question:** Do not get drawn in. Firmly and politely restate your purpose.
    * *Example Response:* "I understand you're curious, but my function is strictly limited to helping you with this coding challenge. I cannot assist with other topics."
* **If the user's code is close to correct:** Point out the specific area where the logic is flawed and ask them a question about it.
    * *Example Response:* "You have the right idea with the loop, but take a closer look at your termination condition. What might happen if the input array contains duplicate numbers?"
---
## **PROBLEM CONTEXT**
Here is all the information about the problem. Use this to guide the user.
`;
    let prompt = systemPrompt;
    if (body) prompt += `\n### PROBLEM BODY\n${body}\n`;
    if (hint1) prompt += `\n### HINT 1\n${hint1}\n`;
    if (hint2) prompt += `\n### HINT 2\n${hint2}\n`;
    if (editorialCode) prompt += `\n### OFFICIAL SOLUTION CODE (${editorialLanguage})\n${editorialCode}\n`;
    if (userCode) prompt += `\n### USER'S CURRENT CODE\n${userCode}\n`;
    return prompt;
};

const handleAIResponse = async (responseData) => {
    const messagesArea = document.getElementById('ai-chat-messages');
    if (messagesArea.lastChild && messagesArea.lastChild.textContent === "...") {
        messagesArea.removeChild(messagesArea.lastChild);
    }
    try {
        const aiText = responseData.candidates[0].content.parts[0].text;
        conversationHistory.push({ role: 'model', parts: [{ text: aiText }] });
        await saveHistory();
        displayMessage(aiText, 'ai');
    } catch (error) {
        console.error("Error parsing AI response:", error, responseData);
        displayMessage("Sorry, I received a response I couldn't understand.", 'ai');
    }
};

const sendMessageToAI = async () => {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    if (!apiKey) {
        displayMessage("Error: API Key not found. Please set it in the extension popup.", 'ai');
        return;
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    displayMessage("...", 'ai');
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: conversationHistory })
        });
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error("API request failed. Your API key might be invalid or missing permissions.");
            }
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        handleAIResponse(data);
    } catch (error) {
        console.error("AI Error:", error);
        const messagesArea = document.getElementById('ai-chat-messages');
        if (messagesArea.lastChild && messagesArea.lastChild.textContent === "...") {
            messagesArea.removeChild(messagesArea.lastChild);
        }
        displayMessage(`Error: ${error.message}`, 'ai');
        conversationHistory.pop();
    }
};

const handleSendMessage = async () => {
    const input = document.getElementById('ai-chat-input');
    if (!input || !input.value.trim()) return;
    const userText = input.value.trim();
    displayMessage(userText, 'user');
    let messageToSend;
    if (isFirstMessage && FetchedData) {
        const problemContext = createPromptFromData(FetchedData);
        messageToSend = `${problemContext}\n\n--- My Question ---\n${userText}`;
        isFirstMessage = false;
    } else {
        messageToSend = userText;
    }
    conversationHistory.push({ role: 'user', parts: [{ text: messageToSend }] });
    await saveHistory();
    sendMessageToAI();
    input.value = '';
};

// --- 4. UI INITIALIZATION & LISTENERS ---

const displayMessage = (text, type) => {
    const messagesArea = document.getElementById('ai-chat-messages');
    if (!messagesArea) return;
    const bubble = document.createElement('div');
    bubble.style.padding = '8px 12px';
    bubble.style.borderRadius = '18px';
    bubble.style.maxWidth = '80%';
    bubble.style.lineHeight = '1.4';
    bubble.style.marginBottom = '8px';
    bubble.textContent = text;
    bubble.style.overflowWrap = 'break-word';

    if (type === 'user') {
        bubble.style.backgroundColor = '#4A90E2';
        bubble.style.color = 'white';
        bubble.style.alignSelf = 'flex-end';
        bubble.style.borderBottomRightRadius = '4px';
    } else { // 'ai' or 'model'
        bubble.style.backgroundColor = '#f0f0f0';
        bubble.style.color = 'black';
        bubble.style.alignSelf = 'flex-start';
        bubble.style.borderBottomLeftRadius = '4px';
    }
    messagesArea.appendChild(bubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
};

const toggleChat = async () => {
    const chatContainer = document.getElementById('ai-chat-container');
    if (!chatContainer) return;

    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (!result.geminiApiKey) {
        alert("Please set your Gemini API key by clicking the extension icon in your toolbar.");
        return;
    }

    isChatOpen = !isChatOpen;
    chatContainer.style.display = isChatOpen ? 'flex' : 'none';

    // if (isChatOpen && conversationHistory.length === 0) {
    //     displayMessage("Chat interface is ready. Ask a question!", 'ai');
    // }
};

const initializeUI = async () => {
    const header = document.querySelector('.coding_desc_container__gdB9M');
    if (!header || document.getElementById('ai-help-button')) return;

    header.style.position = 'relative';

    const aiButton = document.createElement('button');
    aiButton.id = 'ai-help-button';
    aiButton.innerText = '🤖 AI Help';
    aiButton.style.backgroundColor = '#4A90E2';
    aiButton.style.color = 'white';
    aiButton.style.border = 'none';
    aiButton.style.padding = '8px 16px';
    aiButton.style.borderRadius = '20px';
    aiButton.style.fontSize = '14px';
    aiButton.style.cursor = 'pointer';
    aiButton.style.marginLeft = 'auto';
    aiButton.addEventListener('click', toggleChat);

    const chatContainer = document.createElement('div');
    chatContainer.id = 'ai-chat-container';
    chatContainer.style.display = 'none';
    chatContainer.style.position = 'absolute';
    chatContainer.style.top = '100%';
    chatContainer.style.right = '0';
    chatContainer.style.width = '350px';
    chatContainer.style.height = '450px';
    chatContainer.style.marginTop = '8px';
    chatContainer.style.backgroundColor = '#ffffff';
    chatContainer.style.border = '1px solid #e0e0e0';
    chatContainer.style.borderRadius = '12px';
    chatContainer.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
    chatContainer.style.zIndex = '1000';
    // chatContainer.style.display = 'flex';
    chatContainer.style.flexDirection = 'column';

    const messagesArea = document.createElement('div');
    messagesArea.id = 'ai-chat-messages';
    messagesArea.style.flexGrow = '1';
    messagesArea.style.padding = '10px';
    messagesArea.style.display = 'flex';
    messagesArea.style.flexDirection = 'column';
    messagesArea.style.overflowY = 'auto';

    const inputArea = document.createElement('div');
    inputArea.style.borderTop = '1px solid #e0e0e0';
    inputArea.style.padding = '10px';
    inputArea.style.display = 'flex';
    inputArea.style.gap = '10px';

    const textInput = document.createElement('input');
    textInput.id = 'ai-chat-input';
    textInput.placeholder = 'Ask a question...';
    textInput.style.flexGrow = '1';
    textInput.style.border = '1px solid #ccc';
    textInput.style.borderRadius = '20px';
    textInput.style.padding = '8px 12px';
    textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSendMessage(); });

    const sendButton = document.createElement('button');
    sendButton.innerText = '➤';
    sendButton.style.border = 'none';
    sendButton.style.backgroundColor = '#4A90E2';
    sendButton.style.color = 'white';
    sendButton.style.borderRadius = '50%';
    sendButton.style.width = '36px';
    sendButton.style.height = '36px';
    sendButton.style.cursor = 'pointer';
    sendButton.addEventListener('click', handleSendMessage);

    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);
    chatContainer.appendChild(messagesArea);
    chatContainer.appendChild(inputArea);
    header.insertAdjacentElement('beforeend', aiButton);
    header.insertAdjacentElement('beforeend', chatContainer);

    await loadHistory();
};

// --- 5. SCRIPT INITIALIZATION & DATA INTERCEPTION ---

// Inject the script to intercept data from the page's context
const s = document.createElement('script');
s.src = chrome.runtime.getURL('assets/inject.js');
s.onload = function () { this.remove(); };
(document.head || document.documentElement).appendChild(s);

// Listen for the custom events from the injected script
document.addEventListener('extension:ApiDataIntercepted', function (e) {
    FetchedData = e.detail;
});
document.addEventListener('extension:UserCodeFetched', function (e) {
    userCode = e.detail;
});

// Use a MutationObserver to initialize the UI when the target element appears
const observer = new MutationObserver((mutations, obs) => {
    const targetNode = document.querySelector('.coding_desc_container__gdB9M');
    if (targetNode) {
        initializeUI();
        obs.disconnect();
    }
});
observer.observe(document.body, { childList: true, subtree: true });