// contentScript.ts

let lastCode = "";

// Log when the script is injected
console.log("[HyperExplainer] contentScript loaded");

function scanForLatestCode() {
  // Grab all code blocks in the ChatGPT thread
  const blocks = Array.from(document.querySelectorAll("pre code")) as HTMLElement[];
  if (blocks.length === 0) {
    return;
  }

  // Take the newest one
  const newest = blocks[blocks.length - 1].innerText.trim();
  if (newest && newest !== lastCode) {
    lastCode = newest;

    // Log what we found
    console.log("[HyperExplainer] Detected new code snippet:", newest);

    // Store it for the popup
    chrome.storage.local.set({ latestCode: newest }, () => {
      console.log("[HyperExplainer] Stored latestCode in chrome.storage");
    });
  }
}

// Kick off an initial scan
scanForLatestCode();

// Observe the entire page for new nodes
const observer = new MutationObserver(() => {
  scanForLatestCode();
});
observer.observe(document.body, { childList: true, subtree: true });