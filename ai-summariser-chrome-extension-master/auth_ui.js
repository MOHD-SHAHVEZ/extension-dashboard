// Auth & Dashboard UI logic extracted from popup.js

document.getElementById("account-btn").addEventListener("click", async () => {
  const panel = document.getElementById("auth-panel");
  panel.style.display = panel.style.display === "none" || panel.style.display === "" ? "block" : "none";
  applyAuthStateUI();
});

document.getElementById("show-login").addEventListener("click", () => showAuthView("login"));
document.getElementById("show-signup").addEventListener("click", () => showAuthView("signup"));
document.getElementById("login-submit").addEventListener("click", doLogin);
document.getElementById("signup-submit").addEventListener("click", doSignup);
document.getElementById("logout-btn").addEventListener("click", async () => {
  await clearAuthTokens();
  document.getElementById("auth-status").innerText = "Logged out.";
  applyAuthStateUI();
});

document.getElementById("toggle-dashboard").addEventListener("click", async () => {
  const dash = document.getElementById("dashboard");
  dash.style.display = dash.style.display === "none" || dash.style.display === "" ? "block" : "none";
  if (dash.style.display === "block") {
    await loadAndRenderSummaries();
  }
});

document.getElementById("save-summary-btn").addEventListener("click", async () => {
  try {
    const tokens = await loadAuthTokens();
    if (!tokens?.accessToken) {
      document.getElementById("auth-status").innerText = "Please login to save summaries.";
      document.getElementById("auth-panel").style.display = "block";
      return;
    }
    const [{ url, title }] = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
    const payload = window.__latestSummaryPayload;
    if (!payload?.summary) {
      alert("Generate a summary first.");
      return;
    }
    await apiCreateSummary({
      accessToken: tokens.accessToken,
      url,
      title: title || document.title,
      originalText: payload.originalText,
      summary: payload.summary,
      summaryType: payload.summaryType,
      model: payload.model,
    });
    document.getElementById("auth-status").innerText = "Saved to dashboard.";
    await loadAndRenderSummaries();
  } catch (e) {
    document.getElementById("auth-status").innerText = `Save failed: ${e.message}`;
  }
});

document.getElementById("search-input").addEventListener("input", async (e) => {
  await loadAndRenderSummaries(e.target.value.trim());
});

function showAuthView(view) {
  document.getElementById("login-form").style.display = view === "login" ? "block" : "none";
  document.getElementById("signup-form").style.display = view === "signup" ? "block" : "none";
}

async function applyAuthStateUI() {
  const tokens = await loadAuthTokens();
  const loggedIn = !!tokens?.accessToken;
  document.getElementById("logout-btn").style.display = loggedIn ? "inline-block" : "none";
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  try {
    const err = validateLogin({ email, password });
    if (err) {
      document.getElementById("auth-status").innerText = err;
      return;
    }
    const res = await apiLogin({ email, password });
    await storeAuthTokens(res);
    document.getElementById("auth-status").innerText = "Logged in.";
    applyAuthStateUI();
  } catch (e) {
    document.getElementById("auth-status").innerText = `Login failed: ${e.message}`;
  }
}

async function doSignup() {
  const firstName = document.getElementById("signup-first-name").value.trim();
  const lastName = document.getElementById("signup-last-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  try {
    const err = validateSignup({ firstName, lastName, email, password });
    if (err) {
      document.getElementById("auth-status").innerText = err;
      return;
    }
    await apiSignup({ firstName, lastName, email, password });
    document.getElementById("auth-status").innerText = "Signup successful. You can login now.";
    showAuthView("login");
  } catch (e) {
    document.getElementById("auth-status").innerText = `Signup failed: ${e.message}`;
  }
}

async function loadAndRenderSummaries(query = "") {
  const listEl = document.getElementById("summary-list");
  listEl.innerHTML = "Loading...";
  try {
    const tokens = await loadAuthTokens();
    if (!tokens?.accessToken) {
      listEl.innerText = "Login to see your dashboard.";
      return;
    }
    const data = await apiListSummaries({ accessToken: tokens.accessToken, query, page: 0, size: 20 });
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    if (items.length === 0) {
      listEl.innerText = "No summaries yet.";
      return;
    }
    listEl.innerHTML = items
      .map((s) => {
        const safeTitle = (s.title || s.url || "Untitled").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeSnippet = (s.summary || "").substring(0, 180).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div style="border:1px solid var(--border);border-radius:8px;padding:8px;background:#fff;">
          <div style=\"display:flex;justify-content:space-between;align-items:center;gap:6px;\">
            <div style=\"font-weight:bold;\">${safeTitle}</div>
            <div>
              <button data-id=\"${s.id}\" class=\"copy-btn-small\">Copy</button>
              <button data-id=\"${s.id}\" class=\"del-btn-small\" style=\"background:#ef4444;\">Delete</button>
            </div>
          </div>
          <div style=\"font-size:12px;color:#374151;margin-top:6px;\">${safeSnippet}...</div>
        </div>`;
      })
      .join("");

    // Bind actions
    listEl.querySelectorAll(".copy-btn-small").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const item = items.find((x) => String(x.id) === String(id));
        if (item?.summary) navigator.clipboard.writeText(item.summary);
      })
    );
    listEl.querySelectorAll(".del-btn-small").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const tokens2 = await loadAuthTokens();
        await apiDeleteSummary({ accessToken: tokens2.accessToken, id });
        await loadAndRenderSummaries(query);
      })
    );
  } catch (e) {
    listEl.innerText = `Failed to load: ${e.message}`;
  }
}

// Validation helpers (duplicated here to keep this file self-contained)
function validateEmail(email) {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test(email);
}
function validatePassword(password) {
  if (password.length < 8) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasLower && hasUpper && hasSpecial;
}
function validateName(name) {
  if (!name) return false;
  if (name.length > 50) return false;
  const re = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
  return re.test(name);
}
function validateSignup({ firstName, lastName, email, password }) {
  if (!validateName(firstName)) return "First name must contain only letters and spaces.";
  if (!validateName(lastName)) return "Last name must contain only letters and spaces.";
  if (!validateEmail(email)) return "Enter a valid email address.";
  if (!validatePassword(password)) return "Password must be 8+ chars with upper, lower and special symbol.";
  return null;
}
function validateLogin({ email, password }) {
  if (!validateEmail(email)) return "Enter a valid email address.";
  if (!password) return "Password is required.";
  return null;
}


