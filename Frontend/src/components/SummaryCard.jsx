import React, { useEffect, useRef, useState } from "react";

function isLessonSummary(summary) {
  return Boolean(
    summary?.notebookId ||
    summary?.subjectName ||
    summary?.lessonTitle ||
    String(summary?.sourceUrl || "").startsWith("lesson-ai:")
  );
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function SummaryCard({ summary, onEdit, onDelete, onPin, onOpen }) {
  if (!summary) return null;

  const lesson = isLessonSummary(summary);
  const isProcessing = summary.status === "PROCESSING";
  const isFailed = summary.status === "FAILED";
  const date = summary.createdAt
    ? new Date(summary.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Today";
  const subject = lesson
    ? (summary.subjectName || summary.tags?.[0] || "Notebook")
    : (hostLabel(summary.sourceUrl) || summary.tags?.[0] || "Web notes");
  const lessonName = lesson
    ? (summary.lessonTitle || "Lesson notes")
    : (summary.title || "Untitled summary");
  const preview = isProcessing
    ? "AI is reading this page and writing notes…"
    : (summary.excerpt || "No preview yet.");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const tone = isFailed ? "failed" : isProcessing ? "wait" : lesson ? "lesson" : "web";

  return (
    <article className={`summary-slip-wrap group h-full`}>
    <div className={`summary-slip relative h-full ${tone}`}>
      <div className="summary-slip-shine" aria-hidden="true" />
      {summary.pinned && (
        <span className="absolute -top-2 right-8 z-20 text-[22px] drop-shadow-sm" title="Pinned">📌</span>
      )}

      <div
        ref={menuRef}
        className={`absolute top-3 right-3 z-20 ${menuOpen ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100"}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="w-8 h-8 rounded-full bg-white/90 text-slate-500 shadow-sm border border-white/70 hover:text-slate-800"
          aria-label="Summary options"
          aria-expanded={menuOpen}
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-100 py-1 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onPin && onPin(summary.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">{summary.pinned ? "keep_off" : "keep"}</span>
              {summary.pinned ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit && onEdit(summary);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
              Edit summary
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete && onDelete(summary.id);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete summary
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpen && onOpen(summary.id)}
        className="block w-full h-full text-left focus:outline-none"
        aria-label={`Open ${subject} — ${lessonName}`}
      >
        <div className="summary-slip-clip" aria-hidden="true" />
        <div className="summary-slip-body">
          <div className="flex items-center justify-between gap-3 pr-10">
            <span className="summary-slip-kind">
              {lesson ? "Lesson recap" : "Web recap"}
            </span>
            <span className="text-[11px] font-medium text-slate-500">{date}</span>
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Subject</p>
          <h3 className="mt-1 text-[26px] leading-none font-black tracking-tight text-slate-900 line-clamp-2">
            {subject}
          </h3>

          <div className="summary-slip-lesson mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Lesson</span>
            <p className="mt-0.5 text-[15px] font-semibold text-slate-800 line-clamp-2">{lessonName}</p>
          </div>

          {isProcessing && (
            <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-amber-700">
              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              Writing…
            </p>
          )}
          {isFailed && (
            <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-rose-600">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Failed
            </p>
          )}

          <p className="mt-3 text-[13px] leading-relaxed text-slate-600 line-clamp-3">{preview}</p>

          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-700 group-hover:gap-2 transition-all">
              Open recap
              <span className="material-symbols-outlined text-[16px]">north_east</span>
            </span>
            <span className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[18px]">{lesson ? "lightbulb" : "link"}</span>
            </span>
          </div>
        </div>
      </button>
    </div>
    </article>
  );
}
