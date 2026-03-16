// Token storage helpers (chrome.storage.sync)

async function storeAuthTokens(tokens) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ authTokens: tokens }, () => resolve());
  });
}

async function loadAuthTokens() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["authTokens"], (res) => resolve(res.authTokens || null));
  });
}

async function clearAuthTokens() {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(["authTokens"], () => resolve());
  });
}


