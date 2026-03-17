document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.classList.add("show");
  resultDiv.innerHTML = '<div class="loading"><div class="ai-loader">\
  <div class="ai-core"></div>\
  <div class="ring r1"></div>\
  <div class="ring r2"></div>\
  <div class="particles">\
    <span></span><span></span><span></span><span></span>\
    <span></span><span></span><span></span><span></span>\
  </div>\
  <div class="ai-caption">Thinking like an AI...</div>\
</div></div>';

  const summaryType = document.getElementById("summary-type").value;
  const modelName = document.getElementById("model-select")?.value || "models/gemini-2.5-flash";

  // Get API key from storage
  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options.";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab || !tab.id) {
        resultDiv.innerText = "No active tab found.";
        return;
      }

      const url = tab.url || "";
      if (!isSupportedUrl(url)) {
        resultDiv.innerText =
          "This page type is not supported (e.g., Chrome Web Store, chrome://, or PDF).";
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          let pageText = res && res.text ? res.text : "";
          if (!pageText) {
            // Fallback: try injecting extractor directly into the page
            try {
              const [{ result: injectedText } = {}] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  function getCandidateContainers() {
                    const selectors = [
                      "article",
                      "main",
                      '[role="main"]',
                      '[itemprop="articleBody"]',
                      ".article",
                      ".post",
                      ".entry-content",
                      ".story-content",
                      ".post-content",
                      ".blog-post",
                      ".content",
                      ".Post",
                      "#content",
                      "#main",
                    ];
                    return Array.from(document.querySelectorAll(selectors.join(",")));
                  }

                  function removeNonContentNodes(root) {
                    const removalSelectors = [
                      "nav",
                      "header",
                      "footer",
                      "aside",
                      "form",
                      "button",
                      "script",
                      "style",
                      "noscript",
                      "svg",
                      "iframe",
                      "img",
                      "figure",
                      "figcaption",
                      "[role=\"banner\"]",
                      "[role=\"navigation\"]",
                      "[role=\"complementary\"]",
                      "[aria-label=\"advertisement\"]",
                      ".advert, .ad, .ads, .sponsored, .promo",
                    ];
                    root.querySelectorAll(removalSelectors.join(",")).forEach((el) => el.remove());
                  }

                  function getVisibleTextFromElement(el) {
                    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
                      acceptNode: (node) => {
                        const parent = node.parentElement;
                        if (!parent) return NodeFilter.FILTER_REJECT;
                        const style = parent.ownerDocument.defaultView.getComputedStyle(parent);
                        const isHidden =
                          style.display === "none" ||
                          style.visibility === "hidden" ||
                          style.opacity === "0";
                        if (isHidden) return NodeFilter.FILTER_REJECT;
                        const text = node.nodeValue.replace(/\s+/g, " ").trim();
                        if (!text) return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                      },
                    });
                    const parts = [];
                    while (walker.nextNode()) {
                      parts.push(walker.currentNode.nodeValue.replace(/\s+/g, " ").trim());
                    }
                    return parts.join(" ");
                  }

                  function collectParagraphs(root) {
                    const paragraphs = Array.from(root.querySelectorAll("p, h1, h2, h3, li"));
                    const lines = [];
                    for (const node of paragraphs) {
                      const text = getVisibleTextFromElement(node);
                      if (text && text.length >= 40) {
                        lines.push(text);
                      }
                    }
                    return lines.join("\n\n");
                  }

                  function fallbackFromBody() {
                    const cloned = document.body.cloneNode(true);
                    removeNonContentNodes(cloned);
                    const text = collectParagraphs(cloned);
                    if (text && text.length > 0) return text;
                    return document.body ? document.body.innerText : "";
                  }

                  function getMetaDescription() {
                    const meta =
                      document.querySelector('meta[name="description"]') ||
                      document.querySelector('meta[name="og:description"]') ||
                      document.querySelector('meta[property="og:description"]') ||
                      document.querySelector('meta[name="twitter:description"]');
                    return (meta && meta.getAttribute("content")) || "";
                  }

                  function getArticleTextInline() {
                    const containers = getCandidateContainers();
                    for (const el of containers) {
                      const cloned = el.cloneNode(true);
                      removeNonContentNodes(cloned);
                      const text = collectParagraphs(cloned);
                      if (text && text.length >= 200) return text;
                    }
                    const bodyText = fallbackFromBody();
                    if (bodyText && bodyText.trim().length >= 200) return bodyText.trim();
                    const metaText = getMetaDescription();
                    if (metaText) return metaText;
                    return "";
                  }

                  return getArticleTextInline();
                },
              });
              pageText = injectedText || "";
            } catch (e) {
              // ignore and fall through to error message
            }
          }

          if (!pageText) {
            resultDiv.innerText =
              "Could not extract article text from this page.";
            return;
          }

          try {
            const summary = await getGeminiSummary(
              pageText,
              summaryType,
              result.geminiApiKey,
              modelName
            );
            resultDiv.innerText = summary;
            resultDiv.classList.add("show");
            // expose latest summary for Save action
            window.__latestSummaryPayload = { summary, summaryType, model: modelName, originalText: pageText };
          } catch (error) {
            resultDiv.innerText = `Error: ${
              error.message || "Failed to generate summary."
            }`;
            resultDiv.classList.add("show");
          }
        }
      );
    });
  });
});

document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});

async function getGeminiSummary(text, summaryType, apiKey, modelName = "models/gemini-2.5-flash") {
  // Truncate very long texts to avoid API limits (typically around 30K tokens)
  const maxLength = 20000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
      break;
    default:
      prompt = `Summarize the following article:\n\n${truncatedText}`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const body = {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
  };

  async function fetchWithRetry(retries = 2, delayMs = 600) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    if (!res.ok) {
        let message = `API request failed (status ${res.status})`;
        try {
      const errorData = await res.json();
          if (errorData?.error?.message) message = errorData.error.message;
        } catch (_) {}

        if ((res.status === 429 || res.status >= 500) && retries > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
          return fetchWithRetry(retries - 1, delayMs * 2);
        }
        throw new Error(message);
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No summary available."
    );
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
        return fetchWithRetry(retries - 1, delayMs * 2);
      }
      throw err instanceof Error
        ? err
        : new Error("Network error while contacting the API");
    }
  }

  return await fetchWithRetry();
}

function isSupportedUrl(url) {
  if (!url) return false;
  const unsupportedSchemes = ["chrome://", "chrome-extension://", "edge://", "about:"];
  if (unsupportedSchemes.some((p) => url.startsWith(p))) return false;
  // Basic PDF detection
  const isPdf = /\.pdf($|[?#])/i.test(url) || new URL(url).pathname.toLowerCase().endsWith(".pdf");
  if (isPdf) return false;
  return true;
}

// --- Auth & Dashboard UI logic ---
