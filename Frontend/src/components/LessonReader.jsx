import React, { useEffect, useMemo, useRef, useState } from "react";
import LessonMarkdown from "./LessonMarkdown";
import { isMarkdownNotes, notesToMarkdown } from "../utils/notesToMarkdown";

function stripMatchingTitle(text, title) {
  const heading = (title || "").trim();
  if (!heading) return text;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text || "").replace(new RegExp(`^#{1,2}\\s+${escaped}\\s*\\n+`, "i"), "");
}

export default function LessonReader({
  notebook,
  title,
  content,
  mode,
  titleLocked,
  onModeChange,
  onContentChange,
  onClose,
}) {
  const [leaving, setLeaving] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const progressRef = useRef(null);
  const rafRef = useRef(0);
  const alreadyMd = isMarkdownNotes(content);
  const previewMarkdown = useMemo(() => notesToMarkdown(content), [content]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  function requestClose() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onClose, 280);
  }

  function onScroll(e) {
    const el = e.currentTarget;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max <= 0 ? 0 : Math.min(100, (el.scrollTop / max) * 100);
      if (progressRef.current) progressRef.current.style.width = `${pct}%`;
    });
  }

  return (
    <div className="fixed inset-0 z-[80] reader-root">
      <div
        className={`absolute inset-0 ${leaving ? "reader-backdrop-out" : "reader-backdrop-in"}`}
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 12%, rgba(99,102,241,0.16), transparent 58%), #0f172a",
        }}
        onClick={requestClose}
      />
      <div className="reader-vignette pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 h-[3px] z-10">
        <div ref={progressRef} className="h-full w-0 bg-indigo-400" />
      </div>

      <div className="absolute inset-0 z-[2] flex flex-col pointer-events-none">
        <div className="pointer-events-auto shrink-0 flex items-center justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-indigo-200/80">
              {notebook?.subjectName || "Notebook"}
            </p>
            <p className="text-[13px] text-slate-200/80 truncate max-w-[46vw]">{title || "Lesson"}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-1.5 py-1 border border-white/10">
            <button
              type="button"
              onClick={() => setFontSize((n) => Math.max(16, n - 1))}
              className="w-8 h-8 rounded-full text-slate-200 hover:bg-white/10 text-[13px] font-semibold"
              aria-label="Smaller text"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => setFontSize((n) => Math.min(22, n + 1))}
              className="w-8 h-8 rounded-full text-white hover:bg-white/10 text-[15px] font-semibold"
              aria-label="Larger text"
            >
              A+
            </button>
            <span className="w-px h-5 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => onModeChange("preview")}
              className={`h-8 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                mode === "preview" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={`h-8 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                mode === "edit" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="h-8 px-3 rounded-full text-[11px] font-semibold text-slate-900 bg-white hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div
          onScroll={onScroll}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-14 pointer-events-auto reader-scroll"
        >
          <article
            className={`relative mx-auto w-full max-w-[720px] mt-1 mb-8 rounded-2xl bg-[#fbfcfe] ${
              leaving ? "reader-page-out" : "reader-page-in"
            }`}
            style={{
              boxShadow: "0 28px 60px -24px rgba(15,23,42,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 sm:px-14 py-12">
              <p className="text-center text-[10px] uppercase tracking-[0.28em] text-indigo-400 mb-3">
                Lesson
              </p>
              <h1
                className="text-center text-[30px] sm:text-[36px] font-semibold leading-[1.25] text-slate-800 mb-3"
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                {title || "Untitled lesson"}
              </h1>
              <div className="mx-auto mb-10 h-px w-16 bg-indigo-200" />

              <div style={{ fontSize: `${fontSize}px` }} className="reader-body">
                {mode === "edit" ? (
                  <textarea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value, titleLocked)}
                    className="w-full min-h-[58vh] resize-none bg-transparent leading-[1.85] text-slate-700 outline-none whitespace-pre-wrap"
                    style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: "inherit" }}
                  />
                ) : (
                  <LessonMarkdown variant="reader" tables={alreadyMd}>
                    {stripMatchingTitle(previewMarkdown, title)}
                  </LessonMarkdown>
                )}
              </div>
            </div>
          </article>
          <p className="text-center text-[11px] text-slate-400/70 pb-2">
            Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}
