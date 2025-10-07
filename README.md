AI Coding Tutor - Chrome Extension
An intelligent Chrome extension that embeds an AI-powered tutor directly into the Maang coding platform. It uses the Google Gemini API to provide Socratic-style hints and guidance, helping users learn by thinking critically instead of just getting the answer.

✨ Features
Seamless UI Integration: Adds an "🤖 AI Help" button directly onto the problem page, which opens a clean, modern chat interface.

Socratic Tutoring Method: Powered by a sophisticated system prompt that instructs the Gemini AI to act as a tutor, asking leading questions and explaining concepts without ever revealing the full solution.

Context-Aware Assistance: Automatically intercepts and reads the current problem's description, hints, and even the user's code from the editor to provide highly relevant, contextual help.

Persistent Chat History: Securely saves your conversation for each specific problem, allowing you to close the chat and pick up right where you left off later.

Secure API Key Management: Features a simple popup menu to save your personal Google Gemini API key safely in chrome.storage.

🛠️ How It Works (Technical Deep Dive)
This extension uses several advanced Chrome Extension techniques to achieve seamless integration:

Content & Injected Scripts: A content.js script runs in the isolated extension environment, while an inject.js script is injected directly into the host page's context.

Dynamic UI Injection: The content.js script uses a MutationObserver to detect when the target website's UI has loaded, at which point it dynamically injects the chat button and interface into the DOM.

XHR Interception: The inject.js script cleverly wraps the page's native XMLHttpRequest object. This allows it to intercept API calls the website makes to its own backend, capturing the problem data (description, hints, etc.) as it loads.

localStorage Extraction: To get the user's code, inject.js searches the website's localStorage for the key corresponding to the current problem and language, extracting the code that the content script cannot access directly.

Secure Communication: The injected script communicates the captured data back to the content script securely using custom DOM events.

AI Integration: The content.js script formats all the gathered context into a detailed prompt and sends it to the Google Gemini API to generate the tutor's response.

🚀 Setup Instructions
1. Prerequisites
Google Chrome Browser

A Google Gemini API Key. You can get one for free from Google AI Studio.

2. Installation
Clone or download this repository as a ZIP file and unzip it.

Open Chrome and navigate to chrome://extensions.

Enable "Developer mode" using the toggle in the top-right corner.

Click the "Load unpacked" button.

Select the unzipped project folder. The extension should now appear in your extensions list.

3. Configuration
Pin the extension to your toolbar for easy access.

Click the extension's icon to open the settings popup.

Enter your Gemini API key and click "Save".

Navigate to a problem on Maang, and you will see the "🤖 AI Help" button appear!

💻 Tech Stack
JavaScript (ES6+)

Chrome Extensions API (Manifest V3)

Google Gemini API

HTML5 & CSS3
