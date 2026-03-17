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
  // Try to get meaningful text from body while ignoring common boilerplate
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
  return meta?.getAttribute("content") || "";
}

function getArticleText() {
  // 1) Prefer specific article-like containers
  const containers = getCandidateContainers();
  for (const el of containers) {
    const cloned = el.cloneNode(true);
    removeNonContentNodes(cloned);
    const text = collectParagraphs(cloned);
    if (text && text.length >= 200) return text;
  }

  // 2) Fallback to body paragraphs
  const bodyText = fallbackFromBody();
  if (bodyText && bodyText.trim().length >= 200) return bodyText.trim();

  // 3) Meta description last resort
  const metaText = getMetaDescription();
  if (metaText) return metaText;

  // 4) Absolute fallback
  return "";
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") {
    const attempt = (triesLeft) => {
      try {
        const text = getArticleText();
        if (text && text.trim().length >= 100) {
          sendResponse({ text });
        } else if (triesLeft > 0) {
          setTimeout(() => attempt(triesLeft - 1), 500);
        } else {
          sendResponse({ text });
        }
      } catch (e) {
        sendResponse({ text: "" });
      }
    };

    // Try up to 2 retries to allow SPA content to render
    attempt(2);
    return true; // Keep the message channel open for async sendResponse
  }
});
