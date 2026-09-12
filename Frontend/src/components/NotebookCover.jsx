import React, { useEffect, useRef, useState } from "react";

function shade(hex, amount) {
  const raw = (hex || "#1E3A8A").replace("#", "");
  const num = parseInt(raw.length === 6 ? raw : "1E3A8A", 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const TAB_LABELS = ["PLAN", "LEARN", "PRACTICE", "ACHIEVE"];
const CORNER_WORDS = ["LEARN", "DESIGN", "BUILD", "GROW"];

export default function NotebookCover({ notebook, onOpen, onEdit, onDelete }) {
  const accent = notebook.color || "#1E3A8A";
  const deep = shade(accent, -30);
  const mid = shade(accent, -8);
  const uid = `nb-${notebook.id}`;
  const date = notebook.createdAt
    ? new Date(notebook.createdAt).toLocaleDateString()
    : "";
  const lessons = notebook.lessonCount || 0;
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

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-sm"
        aria-label={`Open ${notebook.subjectName}`}
      >
        <div className="relative mx-auto w-full max-w-[248px] notebook-cover">
          <div className="notebook-floor" />
          <svg viewBox="0 0 268 348" className="relative z-[1] w-full h-auto" aria-hidden="true">
            <defs>
              <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3e3b0" />
                <stop offset="45%" stopColor="#d4b45a" />
                <stop offset="100%" stopColor="#a8842a" />
              </linearGradient>
              <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f6e7b0" />
                <stop offset="40%" stopColor="#d4b45a" />
                <stop offset="100%" stopColor="#8d6b1c" />
              </linearGradient>
              <linearGradient id={`${uid}-cream`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbf4e6" />
                <stop offset="55%" stopColor="#f6edd8" />
                <stop offset="100%" stopColor="#efe3cc" />
              </linearGradient>
              <linearGradient id={`${uid}-accent`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={mid} />
                <stop offset="100%" stopColor={deep} />
              </linearGradient>
              <clipPath id={`${uid}-clip`}>
                <rect x="28" y="14" width="200" height="320" rx="18" />
              </clipPath>
              <filter id={`${uid}-soft`} x="-10%" y="-8%" width="120%" height="120%">
                <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.16" />
              </filter>
              <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g className="notebook-pages">
              <rect x="226" y="26" width="16" height="296" rx="3" fill="#eadfc8" />
              <rect x="228" y="24" width="16" height="296" rx="3" fill="#f4ead6" />
              <path d="M240 28 v288" stroke="#ddcfb4" strokeWidth="1" />
              <path d="M243 32 v280" stroke="#eadfca" strokeWidth="1" />
            </g>

            <rect x="246" y="46" width="14" height="256" rx="5" fill={`url(#${uid}-accent)`} />
            {TAB_LABELS.map((label, i) => (
              <text
                key={label}
                x="253.5"
                y={68 + i * 60}
                fill="#e8d48a"
                fontSize="5.5"
                fontFamily="Georgia, serif"
                letterSpacing="1.8"
                textAnchor="middle"
                writingMode="tb"
              >
                {label}
              </text>
            ))}

            <g filter={`url(#${uid}-soft)`}>
              <rect x="18" y="14" width="14" height="320" rx="10" fill={deep} />
              <rect x="28" y="14" width="200" height="320" rx="18" fill={`url(#${uid}-cream)`} />
            </g>

            <g clipPath={`url(#${uid}-clip)`}>
              <path
                d="M28 14 H228 C210 78 150 108 78 82 C46 70 28 44 28 14 Z"
                fill={deep}
              />
              <path
                d="M92 14 H228 V78 C196 108 138 96 104 58 C88 38 86 14 92 14 Z"
                fill={accent}
              />
              <path
                d="M48 52 C102 102 168 108 228 62"
                fill="none"
                stroke={`url(#${uid}-gold)`}
                strokeWidth="1.4"
              />
              <path
                d="M118 14 C150 42 188 58 228 36"
                fill="none"
                stroke={`url(#${uid}-gold)`}
                strokeWidth="1.1"
                opacity="0.85"
              />

              <path
                d="M28 334 H228 C200 268 132 248 70 278 C42 292 28 314 28 334 Z"
                fill={deep}
              />
              <path
                d="M28 334 H170 C148 286 88 274 28 304 Z"
                fill={accent}
              />
              <path
                d="M28 300 C86 258 168 262 228 308"
                fill="none"
                stroke={`url(#${uid}-gold)`}
                strokeWidth="1.4"
              />
            </g>

            <rect x="28" y="14" width="200" height="320" rx="18" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />

            {[54, 98, 142, 186, 230, 274].map((y) => (
              <g key={y}>
                <ellipse cx="25" cy={y} rx="7.2" ry="6" fill={`url(#${uid}-ring)`} />
                <ellipse cx="25" cy={y} rx="3.2" ry="2.6" fill="#3b2a0c" />
                <ellipse cx="23.4" cy={y - 1.6} rx="2.1" ry="1.2" fill="#fff6d2" opacity="0.55" />
              </g>
            ))}

            {CORNER_WORDS.map((word, i) => (
              <text
                key={word}
                x="208"
                y={58 + i * 13}
                textAnchor="end"
                fill={deep}
                fontSize="6"
                fontFamily="Georgia, serif"
                letterSpacing="1.8"
                opacity="0.72"
              >
                {word}
              </text>
            ))}

            <rect x="58" y="104" width="140" height="132" rx="10" fill="#fbf3e4" />
            <rect x="58" y="104" width="140" height="132" rx="10" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="1.3" />
            <rect x="63" y="109" width="130" height="122" rx="7" fill="none" stroke="#ead9b0" strokeWidth="0.7" />
            <text x="128" y="128" textAnchor="middle" fill="#8b7d68" fontSize="7" fontFamily="Georgia, serif" letterSpacing="2.3">
              SUBJECT NOTEBOOK
            </text>
            <foreignObject x="68" y="136" width="120" height="52">
              <div xmlns="http://www.w3.org/1999/xhtml" className="h-full flex items-center justify-center text-center px-1">
                <p
                  style={{
                    margin: 0,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontWeight: 700,
                    fontSize: notebook.subjectName?.length > 16 ? "15px" : "20px",
                    lineHeight: 1.15,
                    color: "#1a2744",
                  }}
                >
                  {notebook.subjectName}
                </p>
              </div>
            </foreignObject>
            <line x1="86" y1="196" x2="114" y2="196" stroke={`url(#${uid}-gold)`} strokeWidth="1" />
            <path
              d="M120 191 h16 a2 2 0 0 1 2 2 v3 h-20 v-3 a2 2 0 0 1 2-2zm2 2.2 h12 M128 191 v5"
              fill="none"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="1.05"
              strokeLinecap="round"
            />
            <line x1="142" y1="196" x2="170" y2="196" stroke={`url(#${uid}-gold)`} strokeWidth="1" />
            <text x="128" y="218" textAnchor="middle" fill="#6f675c" fontSize="8" fontFamily="Georgia, serif">
              {lessons} {lessons === 1 ? "lesson" : "lessons"}
              {date ? `  •  ${date}` : ""}
            </text>

            <text x="42" y="292" fill={deep} fontSize="8.5" fontFamily="'Segoe Script', 'Brush Script MT', cursive" opacity="0.78">
              Better Notes
            </text>
            <text x="42" y="304" fill={deep} fontSize="8.5" fontFamily="'Segoe Script', 'Brush Script MT', cursive" opacity="0.78">
              Brighter Ideas
            </text>

            <rect className="notebook-shine" x="28" y="14" width="54" height="320" fill={`url(#${uid}-shine)`} />
          </svg>
        </div>
      </button>

      <div
        ref={menuRef}
        className={`absolute top-1 right-1 z-20 ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="w-8 h-8 rounded-full bg-white/95 text-slate-500 shadow-sm border border-slate-200 hover:bg-white hover:text-slate-800"
          aria-label="Notebook options"
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
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>
              Edit name & color
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              Delete notebook
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
