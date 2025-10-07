// assets/inject.js

console.log("Injector script loaded into the page context.");

const getProblemIdFromUrl = (url) => {
    const regex = /-(\d+)\?/;
    const match = url.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
};

/**
 * Finds the user's code by searching all localStorage keys for a match.
 */
const bruteForceFindUserCode = () => {
    console.log(localStorage);
    // 1. Get the parts we know: problemId and language
    const problemId = getProblemIdFromUrl(window.location.href);
    const language = JSON.parse(localStorage.getItem('editor-language'));

    if (!problemId || !language) {
        console.error("Missing problemId or language to find user code.");
        return;
    }

    // 2. Escape any special regex characters in the language string
    // This will replace characters like '+' with '\+'
    const sanitizedLanguage = language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 3. Create a regular expression with the sanitized language
    const keyPattern = new RegExp(`_${problemId}_${sanitizedLanguage}$`);
    console.log("keypattern ", keyPattern);

    // 3. Loop through all keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        // 4. Check if the current key matches our pattern
        if (keyPattern.test(key)) {
            console.log(`Found matching key: ${key}`);
            const userCode = localStorage.getItem(key);

            // 5. Send the found code to the extension and stop searching
            if (userCode) {
                const event = new CustomEvent('extension:UserCodeFetched', { detail: userCode });
                document.dispatchEvent(event);
            }
            return; // Exit the function once we find the code
        }
    }

    console.log("Could not find a matching key for user code in localStorage.");
};

// --- XHR Interceptor ---
// The interceptor's only job now is to kick off our brute-force search.
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url) {
    this.addEventListener('load', function () {
        // We listen for the problem data to load as a trigger
        if (url.includes('https://api2.maang.in/problems/user/')) {
            try {
                // First, send the problem data to the extension (existing logic)
                const responseData = JSON.parse(this.responseText);
                const event = new CustomEvent('extension:ApiDataIntercepted', { detail: responseData });
                document.dispatchEvent(event);

                // Now, trigger our function to find the user's code
                bruteForceFindUserCode();

            } catch (error) {
                console.error('Error parsing problem data:', error);
            }
        }
    });
    return originalXhrOpen.apply(this, arguments);
};