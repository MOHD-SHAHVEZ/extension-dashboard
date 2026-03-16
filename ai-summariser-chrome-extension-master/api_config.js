// API config helpers

async function getBackendBaseUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["backendBaseUrl"], (res) => {
      const base = (res.backendBaseUrl || "").replace(/\/?$/u, "");
      resolve(base);
    });
  });
}

function apiBuildUrl(base, path) {
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}


