try {
    let lastCode = "";
  
    // Log when the script is injected
    console.log("[HyperExplainer] contentScript loaded");
  
    function scanForLatestCode() {
      try {
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
          console.log("[HyperExplainer] Detected new code snippet:", newest.substring(0, 50) + "...");
  
          // Store it for the popup
          try {
            chrome.storage.local.set({ latestCode: newest }, () => {
              console.log("[HyperExplainer] Stored latestCode in chrome.storage");
            });
          } catch (e) {
            console.error("[HyperExplainer] Error storing in chrome.storage:", e);
          }
        }
      } catch (e) {
        console.error("[HyperExplainer] Error in scanForLatestCode:", e);
      }
    }
  
    // Kick off an initial scan
    scanForLatestCode();
  
    // Observe the entire page for new nodes
    try {
      const observer = new MutationObserver(() => {
        scanForLatestCode();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      console.error("[HyperExplainer] Error setting up MutationObserver:", e);
      // Set up a fallback polling mechanism
      setInterval(scanForLatestCode, 3000);
    }
  } catch (e) {
    console.error("[HyperExplainer] Critical error in contentScript:", e);
  }