import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary } from "../services/api";
import LessonMarkdown from "./LessonMarkdown";
import { isMarkdownNotes, notesToMarkdown } from "../utils/notesToMarkdown";

function stripMatchingTitle(text, title) {
  const heading = (title || "").trim();
  if (!heading) return text;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text || "").replace(new RegExp(`^#{1,6}\\s+${escaped}\\s*\\n+`, "i"), "");
}

function SummaryModalBody({ title, raw }) {
  const formatted = useMemo(
    () => stripMatchingTitle(notesToMarkdown(raw), title),
    [raw, title]
  );
  return (
    <LessonMarkdown variant="paper" tables={isMarkdownNotes(raw)}>
      {formatted}
    </LessonMarkdown>
  );
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function SummaryDetailModal({ open, id, onClose }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (!id) {
      setError("Missing id");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    getSummary(id)
      .then((res) => setSummary(res))
      .catch((err) => setError(err?.message || "Failed to load summary"))
      .finally(() => setLoading(false));
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lesson = Boolean(
    summary?.notebookId ||
    summary?.subjectName ||
    summary?.lessonTitle ||
    String(summary?.sourceUrl || "").startsWith("lesson-ai:")
  );
  const subject = lesson
    ? (summary?.subjectName || "Notebook")
    : (hostLabel(summary?.sourceUrl) || summary?.tags?.[0] || "Web notes");
  const lessonName = lesson
    ? (summary?.lessonTitle || "Lesson notes")
    : null;
  const date = summary?.createdAt
    ? new Date(summary.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl max-h-[82vh] flex flex-col rounded-3xl bg-[#fbf8ff] shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] border border-white overflow-hidden"
      >
        <div className="px-5 pt-4 pb-3 border-b border-violet-100/80 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`h-6 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.14em] text-white ${lesson ? "bg-violet-600" : "bg-sky-600"}`}>
                {lesson ? "Lesson recap" : "Web recap"}
              </span>
              {date && <span className="text-[11px] text-slate-500">{date}</span>}
            </div>
            {summary && (
              <>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Subject</p>
                <h2 className="text-[22px] font-black tracking-tight text-slate-900 leading-tight truncate">{subject}</h2>
                {lessonName && (
                  <p className="mt-1 text-[13px] font-semibold text-violet-700 truncate">Lesson · {lessonName}</p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100 shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {loading && (
            <div className="py-16 text-center text-slate-400 text-[13px]">
              <span className="material-symbols-outlined text-[28px] animate-spin text-violet-500">progress_activity</span>
              <p className="mt-2">Opening recap…</p>
            </div>
          )}
          {error && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-rose-600 font-semibold">{error}</p>
              <button type="button" onClick={onClose} className="mt-4 h-9 px-4 rounded-full bg-slate-800 text-white text-[12px] font-semibold">
                Close
              </button>
            </div>
          )}
          {summary && (
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 leading-snug mb-3">{summary.title}</h3>
              {summary.status === "PROCESSING" && (
                <p className="text-[13px] text-amber-700 font-semibold mb-3">AI is still writing this recap…</p>
              )}
              {summary.status === "FAILED" && (
                <p className="text-[13px] text-rose-600 font-semibold mb-3">{summary.errorMessage || "This recap failed."}</p>
              )}
              <SummaryModalBody title={summary.title} raw={summary.content || summary.excerpt} />
            </div>
          )}
        </div>

        {summary && (
          <div className="px-5 py-3 border-t border-violet-100/80 flex items-center justify-end gap-2 shrink-0 bg-[#fbf8ff]">
            {summary.notebookId ? (
              <button
                type="button"
                onClick={() => navigate(`/notebooks/${summary.notebookId}`)}
                className="h-9 px-4 rounded-full bg-violet-600 text-white text-[12px] font-semibold"
              >
                Open lesson
              </button>
            ) : summary.sourceUrl && !String(summary.sourceUrl).startsWith("lesson-ai:") ? (
              <a
                href={summary.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 px-4 rounded-full bg-sky-600 text-white text-[12px] font-semibold inline-flex items-center"
              >
                View source
              </a>
            ) : null}
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-full bg-white border border-slate-200 text-[12px] font-semibold text-slate-600">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
