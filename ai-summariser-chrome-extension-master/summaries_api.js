// Summary endpoints

async function apiCreateSummary({ accessToken, url, title, originalText, summary, summaryType, model }) {
  return apiRequest("/summaries", {
    method: "POST",
    accessToken,
    body: { url, title, originalText, summary, summaryType, model },
  });
}

async function apiListSummaries({ accessToken, page = 0, size = 20, query = "" }) {
  const q = query ? `&query=${encodeURIComponent(query)}` : "";
  return apiRequest(`/summaries?page=${page}&size=${size}${q}`, { accessToken });
}

async function apiDeleteSummary({ accessToken, id }) {
  return apiRequest(`/summaries/${id}`, { method: "DELETE", accessToken });
}


