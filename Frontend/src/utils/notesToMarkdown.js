export function isMarkdownNotes(raw) {
  const text = String(raw ?? "");
  return (
    /^(#{1,6}\s+\S)/m.test(text)
    || /^```/m.test(text)
    || /^>\s+\S/m.test(text)
    || /\[[^\]]+\]\([^)]+\)/.test(text)
    || /\*\*[^*\n]{1,80}\*\*/.test(text)
    || (/^\|.+\|/m.test(text) && /^\s*\|?\s*:?-{3,}/m.test(text))
  );
}

function isFence(line) {
  return /^\s*```/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}[\s|:-]*$/.test(line);
}

function isDiagramLine(line) {
  if (isFence(line) || !line.trim()) return false;
  if (/[│─┌┐└┘├┤┬┴┼╭╮╯╰▼▲►◄]/.test(line)) return true;
  if (/\|/.test(line)) return true;
  if (/^\s*\+[+\-=]+\+/.test(line)) return true;
  if (/^\s+[vV^]\s*$/.test(line)) return true;
  if (/^\s{2,}[|+\-\\/_]{1,6}\s*$/.test(line)) return true;
  return false;
}

function isFlowLabel(line) {
  const t = line.trim();
  if (!t || t.length > 42) return false;
  if (/^[A-Z][A-Z0-9 _/().+-]{1,40}$/.test(t)) return true;
  if (/^[A-Za-z_][\w.]*\(\)$/.test(t)) return true;
  if (/^(GET|POST|PUT|PATCH|DELETE)\s+\S/.test(t)) return true;
  if (/^[A-Z][A-Za-z0-9/]*(\s+[A-Z][A-Za-z0-9/]*){0,4}$/.test(t)) return true;
  return false;
}

function protectAsciiDiagrams(text) {
  const lines = text.split("\n");
  const n = lines.length;
  const inFence = Array(n).fill(false);
  let fence = false;
  for (let i = 0; i < n; i += 1) {
    if (isFence(lines[i])) {
      inFence[i] = true;
      fence = !fence;
      continue;
    }
    if (fence) inFence[i] = true;
  }

  const mark = lines.map((line, i) => !inFence[i] && isDiagramLine(line));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i += 1) {
      if (mark[i] || inFence[i]) continue;
      if (!isFlowLabel(lines[i]) && lines[i].trim()) continue;
      if ((i > 0 && mark[i - 1]) || (i + 1 < n && mark[i + 1])) {
        mark[i] = true;
        changed = true;
      }
    }
  }

  const out = [];
  let i = 0;
  while (i < n) {
    if (!mark[i]) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const start = i;
    while (i < n && mark[i]) i += 1;
    const block = lines.slice(start, i);
    while (block.length && !block[0].trim()) {
      out.push("");
      block.shift();
    }
    while (block.length && !block[block.length - 1].trim()) block.pop();

    if (!block.length || block.some(isTableSeparator)) {
      out.push(...lines.slice(start, i));
    } else {
      out.push("```text");
      out.push(...block);
      out.push("```");
      if (i < n && String(lines[i] || "").trim()) out.push("");
    }
  }

  return out.join("\n");
}

const VERBISH = /^(is|are|was|were|has|have|had|can|will|should|does|do|did|be|been|being|the|this|that|these|those)$/i;
const CALLOUT = /^(note|notes|tip|tips|warning|important|remember|example|e\.g\.|eg)\b[:\-–—]?\s+/i;

function isBulletLine(trimmed) {
  return /^([•●◦·▪▸►–—*+-])(\s+|$)/.test(trimmed) && !/^---/.test(trimmed);
}

function toBullet(trimmed) {
  return `- ${trimmed.replace(/^([•●◦·▪▸►–—*+-])\s*/, "")}`;
}

function isNumberedLine(trimmed) {
  return /^\d+[\.)]\s+\S/.test(trimmed);
}

function decorateInline(text) {
  return text.replace(/(^|[\s(])([A-Za-z_][\w.]*\(\))/g, "$1`$2`");
}

function looksLikeHeading(trimmed) {
  if (trimmed.length < 3 || trimmed.length > 70) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (isBulletLine(trimmed) || CALLOUT.test(trimmed)) return false;
  const clean = trimmed.replace(/:$/, "");
  const words = clean.split(/\s+/);
  if (words.length > 8) return false;
  if (words.some((w) => VERBISH.test(w))) return false;
  if (/^[A-Z][A-Z0-9 &/().+-]{2,50}$/.test(clean) && /[A-Z]/.test(clean)) return true;
  if (/:$/.test(trimmed)) return true;
  return words.every((w) => /^[A-Z0-9]/.test(w) || /^(of|and|or|in|on|to|for|a|an|vs|with|from|by)$/i.test(w));
}

function formatDefinition(trimmed) {
  const colon = trimmed.match(/^([A-Za-z][\w ./-]{0,36}):\s+(\S.*)$/);
  if (colon && !/^(http|https)$/i.test(colon[1])) {
    return `**${colon[1].trim()}:** ${decorateInline(colon[2].trim())}`;
  }
  const dash = trimmed.match(/^([A-Z][A-Za-z0-9 .]{1,36})\s+[-–—]\s+(\S.+)$/);
  if (dash) return `**${dash[1].trim()}** — ${decorateInline(dash[2].trim())}`;
  return null;
}

function formatCallout(trimmed) {
  const match = trimmed.match(CALLOUT);
  if (!match) return null;
  const label = match[0].replace(/[:\-–—]\s*$/, "").replace(/\s+$/, "");
  const rest = trimmed.slice(match[0].length).trim();
  const pretty = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return rest ? `> **${pretty}:** ${decorateInline(rest)}` : `> **${pretty}**`;
}

function formatFlow(trimmed) {
  if (!/→|->|=>/.test(trimmed)) return null;
  const parts = trimmed.split(/\s*(?:→|->|=>)\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((p) => p.length > 42)) return null;
  return parts.map((p) => `**${p}**`).join(" → ");
}

function formatPlainNotes(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;

  const pushBlock = (block) => {
    if (!block) return;
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(block);
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const next = i + 1 < lines.length ? lines[i + 1] : "";

    if (!trimmed) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      i += 1;
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,}|={3,})$/.test(trimmed)) {
      pushBlock("---");
      i += 1;
      continue;
    }

    if (isDiagramLine(line) || (isFlowLabel(line) && isDiagramLine(next))) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      while (i < lines.length && (isDiagramLine(lines[i]) || isFlowLabel(lines[i]) || !lines[i].trim())) {
        out.push(lines[i]);
        i += 1;
      }
      continue;
    }

    if (isBulletLine(trimmed)) {
      const bullets = [];
      while (i < lines.length && isBulletLine(lines[i].trim())) {
        bullets.push(toBullet(lines[i].trim()));
        i += 1;
      }
      pushBlock(bullets.join("\n"));
      continue;
    }

    if (/^\d+$/.test(trimmed) && next.trim() && !isDiagramLine(next) && !isFlowLabel(next)) {
      pushBlock(`## ${trimmed}. ${next.trim()}`);
      i += 2;
      continue;
    }

    if (isNumberedLine(trimmed)) {
      if (trimmed.length < 56 && !/→|->|=>/.test(trimmed)) {
        pushBlock(`## ${trimmed}`);
        i += 1;
        continue;
      }
      const items = [];
      while (i < lines.length && isNumberedLine(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(\d+)[.)]\s+/, "$1. "));
        i += 1;
      }
      pushBlock(items.join("\n"));
      continue;
    }

    const callout = formatCallout(trimmed);
    if (callout) {
      pushBlock(callout);
      i += 1;
      continue;
    }

    if (looksLikeHeading(trimmed)) {
      const title = trimmed.replace(/:$/, "");
      pushBlock(trimmed.endsWith(":") ? `### ${title}` : `## ${title}`);
      i += 1;
      continue;
    }

    const flow = formatFlow(trimmed);
    if (flow) {
      pushBlock(flow);
      i += 1;
      continue;
    }

    const definition = formatDefinition(trimmed);
    if (definition) {
      pushBlock(definition);
      i += 1;
      continue;
    }

    pushBlock(decorateInline(trimmed));
    i += 1;
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
}

export function notesToMarkdown(raw) {
  const text = String(raw ?? "").replace(/\r\n/g, "\n");
  if (!text.trim()) return "";
  const prepared = isMarkdownNotes(text) ? text : formatPlainNotes(text);
  return protectAsciiDiagrams(prepared);
}
