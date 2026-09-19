import React, { useEffect, useMemo, useRef, useState } from "react";
import LessonMarkdown from "./LessonMarkdown";
import { isMarkdownNotes, notesToMarkdown } from "../utils/notesToMarkdown";

const NIGHT_KEY = "ebag-reader-night";

function stripMatchingTitle(text, title) {
  const heading = (title || "").trim();
  if (!heading) return text;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text || "").replace(new RegExp(`^#{1,2}\\s+${escaped}\\s*\\n+`, "i"), "");
}

function useLandscape() {
  const [landscape, setLandscape] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches
      || window.matchMedia("(orientation: landscape) and (max-width: 900px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => {
      const isLand = mq.matches;
      const shortPhone = window.innerHeight <= 560 || window.innerWidth <= 900;
      setLandscape(isLand && shortPhone);
    };
    update();
    mq.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      mq.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return landscape;
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
  const [headerHidden, setHeaderHidden] = useState(false);
  const [night, setNight] = useState(() => {
    try {
      return localStorage.getItem(NIGHT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const landscape = useLandscape();
  const progressRef = useRef(null);
  const rafRef = useRef(0);
  const lastScrollTop = useRef(0);
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

  // Landscape: keep chrome tucked away so the notebook fills the screen.
  useEffect(() => {
    if (landscape) setHeaderHidden(true);
  }, [landscape]);

  function toggleNight() {
    setNight((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NIGHT_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function requestClose() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onClose, 280);
  }

  function onScroll(e) {
    const el = e.currentTarget;
    const scrollTop = el.scrollTop;
    const delta = scrollTop - lastScrollTop.current;

    if (scrollTop < 24) {
      if (!landscape) setHeaderHidden(false);
    } else if (delta > 6) {
      setHeaderHidden(true);
    } else if (delta < -6) {
      setHeaderHidden(false);
    }
    lastScrollTop.current = scrollTop;

    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      const max = el.scrollHeight - el.clientHeight;
      const pct = max <= 0 ? 0 : Math.min(100, (scrollTop / max) * 100);
      if (progressRef.current) progressRef.current.style.width = `${pct}%`;
    });
  }

  const chromeHidden = headerHidden;

  return (
    <div className={`fixed inset-0 z-[80] reader-root ${night ? "reader-night" : ""}`}>
      <div
        className={`absolute inset-0 ${leaving ? "reader-backdrop-out" : "reader-backdrop-in"}`}
        style={{
          background: night
            ? "radial-gradient(ellipse 70% 50% at 50% 12%, rgba(99,102,241,0.12), transparent 58%), #020617"
            : "radial-gradient(ellipse 70% 50% at 50% 12%, rgba(99,102,241,0.16), transparent 58%), #0f172a",
        }}
        onClick={requestClose}
      />
      <div className="reader-vignette pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 h-[3px] z-20">
        <div ref={progressRef} className={`h-full w-0 ${night ? "bg-indigo-300" : "bg-indigo-400"}`} />
      </div>

      <div className="absolute inset-0 z-[2] flex flex-col">
        <div
          className={`reader-chrome shrink-0 flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 sm:py-3 transition-transform duration-300 ease-out ${
            chromeHidden ? "reader-chrome-hidden -translate-y-full pointer-events-none" : "translate-y-0"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-indigo-200/80">
              {notebook?.subjectName || "Notebook"}
            </p>
            <p className="text-[13px] text-slate-200/80 truncate max-w-[38vw] sm:max-w-[46vw]">{title || "Lesson"}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-slate-900/80 px-1 py-1 border border-white/10">
            <button
              type="button"
              onClick={toggleNight}
              className={`w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center ${
                night ? "text-amber-200 bg-white/10" : "text-slate-200"
              }`}
              aria-label={night ? "Day mode" : "Night mode"}
              title={night ? "Day mode" : "Night mode"}
            >
              <span className="material-symbols-outlined text-[18px]">{night ? "light_mode" : "dark_mode"}</span>
            </button>
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
            <span className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />
            <button
              type="button"
              onClick={() => onModeChange("preview")}
              className={`h-8 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-colors ${
                mode === "preview" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={`h-8 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold transition-colors ${
                mode === "edit" ? "bg-indigo-500 text-white" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={requestClose}
              className="h-8 px-2.5 sm:px-3 rounded-full text-[11px] font-semibold text-slate-900 bg-white hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tap strip to reveal chrome when hidden (esp. landscape) */}
        {chromeHidden && (
          <button
            type="button"
            aria-label="Show reader controls"
            className="absolute top-0 left-0 right-0 z-10 h-10 bg-transparent"
            onClick={() => setHeaderHidden(false)}
          />
        )}

        <div
          onScroll={onScroll}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain reader-scroll ${
            chromeHidden ? "pt-1" : ""
          }`}
        >
          <article
            className={`relative mx-auto w-full reader-paper-shell rounded-2xl reader-paper ${
              night ? "reader-paper-night" : "reader-paper-day"
            } ${leaving ? "reader-page-out" : "reader-page-in"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reader-paper-pad">
              <p className={`text-center text-[10px] uppercase tracking-[0.28em] mb-3 ${night ? "text-indigo-300" : "text-indigo-400"}`}>
                Lesson
              </p>
              <h1
                className={`text-center text-[26px] sm:text-[36px] font-semibold leading-[1.25] mb-3 ${
                  night ? "text-slate-100" : "text-slate-800"
                }`}
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                {title || "Untitled lesson"}
              </h1>
              <div className={`mx-auto mb-8 sm:mb-10 h-px w-16 ${night ? "bg-indigo-700" : "bg-indigo-200"}`} />

              <div style={{ fontSize: `${fontSize}px` }} className="reader-body">
                {mode === "edit" ? (
                  <textarea
                    value={content}
                    onChange={(e) => onContentChange(e.target.value, titleLocked)}
                    className={`w-full min-h-[58vh] resize-none bg-transparent leading-[1.85] outline-none whitespace-pre-wrap ${
                      night ? "text-slate-200" : "text-slate-700"
                    }`}
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
          <p className="text-center text-[11px] text-slate-400/70 pb-6 pt-2">
            Esc to close · scroll up for controls
          </p>
        </div>
      </div>
    </div>
  );
}
