// Save any selected code to chrome.storage.local
document.addEventListener("mouseup", () => {
    const sel = window.getSelection()?.toString() || "";
    if (sel.trim()) {
      chrome.storage.local.set({ selectedCode: sel });
    }
  });