document.addEventListener("DOMContentLoaded", async () => {
  const list = document.getElementById("summary-list");
  const status = document.getElementById("status");
  const search = document.getElementById("search-input");
  const logoutBtn = document.getElementById("logout-btn");
  const themeToggle = document.getElementById("theme-toggle");

  // ========== THEME HANDLING ==========
  async function loadTheme() {
    const { theme } = await chrome.storage.local.get("theme");
    if (theme === "dark") {
      document.body.classList.add("dark");
      themeToggle.textContent = "☀️ Light Mode";
    } else {
      document.body.classList.remove("dark");
      themeToggle.textContent = "🌙 Dark Mode";
    }
  }

  async function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");
    await chrome.storage.local.set({ theme: isDark ? "dark" : "light" });
    themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  }

  themeToggle.addEventListener("click", toggleTheme);
  await loadTheme();

  // ========== SUMMARY LOGIC ==========
  async function loadSummaries(query = "") {
    list.innerHTML = "Loading...";
    status.textContent = "";

    try {
      const tokens = await loadAuthTokens();
      if (!tokens?.accessToken) {
        list.innerHTML = "<p>Please login from popup to view your saved summaries.</p>";
        return;
      }

      const data = await apiListSummaries({ accessToken: tokens.accessToken, query, page: 0, size: 50 });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

      if (items.length === 0) {
        list.innerHTML = "<p>No summaries found.</p>";
        return;
      }

      list.innerHTML = "";
      items.reverse().forEach((s) => {
        const card = document.createElement("div");
        card.className = "summary-card";

        const header = document.createElement("div");
        header.className = "summary-header";

        const title = document.createElement("h3");
        title.className = "summary-title";
        title.textContent = s.title || s.url || "Untitled Page";
        header.appendChild(title);
        card.appendChild(header);

        const snippet = document.createElement("p");
        snippet.className = "summary-snippet";
        snippet.textContent = s.summary?.substring(0, 250) + "...";
        card.appendChild(snippet);

        const buttons = document.createElement("div");
        buttons.className = "card-buttons";

        const copyBtn = document.createElement("button");
        copyBtn.className = "btn-copy";
        copyBtn.textContent = "Copy";
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(s.summary || "");
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-delete";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = async () => {
          try {
            await apiDeleteSummary({ accessToken: tokens.accessToken, id: s.id });
            status.textContent = "✅ Summary deleted.";
            loadSummaries(query);
          } catch (err) {
            console.error(err);
            status.textContent = "❌ Failed to delete summary.";
          }
        };

        buttons.appendChild(copyBtn);
        buttons.appendChild(deleteBtn);
        card.appendChild(buttons);

        list.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      list.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  }

  // Live search
  search.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    loadSummaries(query);
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await clearAuthTokens();
      status.textContent = "You have logged out.";
      list.innerHTML = "";
    } catch (e) {
      console.error(e);
      status.textContent = "Logout failed.";
    }
  });

  // Initial load
  loadSummaries();
});
