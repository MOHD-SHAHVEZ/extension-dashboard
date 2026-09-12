import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSummary, getProfile } from "../services/api";
import LessonMarkdown from "../components/LessonMarkdown";
import { isMarkdownNotes, notesToMarkdown } from "../utils/notesToMarkdown";

function stripMatchingTitle(text, title) {
  const heading = (title || "").trim();
  if (!heading) return text;
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(text || "").replace(new RegExp(`^#{1,6}\\s+${escaped}\\s*\\n+`, "i"), "");
}

function SummaryBody({ title, raw }) {
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

export default function SummaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authorName, setAuthorName] = useState("Loading...");

  useEffect(() => {
    if (!id) {
      setError("Missing summary id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      getSummary(id),
      getProfile().catch(() => null)
    ])
      .then(([summaryRes, profileRes]) => {
        setItem(summaryRes);

        const localName = localStorage.getItem("profile_name");

        if (localName) {
          setAuthorName(localName);
        } else if (profileRes?.firstName || profileRes?.lastName) {
          setAuthorName(`${profileRes.firstName || ""} ${profileRes.lastName || ""}`.trim());
        } else if (profileRes?.name) {
          setAuthorName(profileRes.name);
        } else if (summaryRes.owner) {
          const email = summaryRes.owner;
          setAuthorName(email.includes("@") ? email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1) : email);
        } else {
          setAuthorName("Anonymous Student");
        }
      })
      .catch((err) => {
        console.error("getSummary error:", err);
        setError(err?.message || "Failed to load summary");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc] flex items-center justify-center">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-200 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center gap-3 text-slate-600">
          <span className="material-symbols-outlined text-[40px] animate-spin text-indigo-500">progress_activity</span>
          <p className="text-[16px] font-medium tracking-wide">Opening your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-100 via-transparent to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-100">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
            <span className="material-symbols-outlined text-[32px]">error</span>
          </div>
          <p className="text-[15px] font-medium text-slate-700">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-5 py-3 mt-2 rounded-xl bg-slate-800 text-white text-[14px] font-bold hover:bg-slate-900 transition-colors shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center text-slate-700 bg-white px-6 py-4 rounded-full text-[15px] font-medium shadow-md border border-slate-200 flex items-center gap-3">
          <span className="material-symbols-outlined">search_off</span>
          Summary not found.
          <button onClick={() => navigate(-1)} className="ml-2 text-indigo-600 hover:underline">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex items-center justify-center p-0 sm:p-6 md:p-10 overflow-hidden">

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-200/30 blur-[120px]"></div>
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-teal-200/20 blur-[100px]"></div>
        <div className="absolute top-[20%] left-[40%] w-[50%] h-[50%] rounded-full bg-purple-200/20 blur-[100px]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "32px 32px" }}></div>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-8 md:left-8 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white text-slate-500 hover:text-indigo-600 shadow-md hover:shadow-lg hover:scale-110 transition-all z-[110] border border-slate-100"
        title="Go Back"
      >
        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
      </button>

      <style>{`
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.95) translateY(20px) rotateX(5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotateX(0); }
        }
        .animate-modal-pop {
          animation: modalPop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom center;
        }

        @keyframes floatUpDown {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(10deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .floating-emoji {
          animation: floatUpDown 6s ease-in-out infinite;
        }
        
        .notebook-paper {
          background-color: #fcf9eb;
        }
        
        .notebook-margin {
          display: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-indigo-50/50">
        <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-pink-300/40 blur-[100px] animate-pulse" style={{ animationDuration: "8s" }}></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-[150%] h-[150%] bg-gradient-to-tl from-cyan-300/40 via-teal-200/40 to-yellow-200/40 blur-[100px] animate-pulse" style={{ animationDuration: "10s", animationDirection: "reverse" }}></div>

        <div className="absolute inset-0 hidden sm:flex items-center justify-center z-0">
          <div className="floating-emoji absolute top-[12%] left-[8%] text-[70px] opacity-40 drop-shadow-lg">🚀</div>
          <div className="floating-emoji absolute top-[25%] right-[10%] text-[60px] opacity-40 drop-shadow-lg" style={{ animationDelay: "1s" }}>💡</div>
          <div className="floating-emoji absolute bottom-[15%] left-[15%] text-[80px] opacity-40 drop-shadow-lg" style={{ animationDelay: "2s" }}>📚</div>
          <div className="floating-emoji absolute bottom-[22%] right-[15%] text-[70px] opacity-40 drop-shadow-lg" style={{ animationDelay: "1.5s" }}>✏️</div>
          <div className="floating-emoji absolute top-[40%] left-[4%] text-[50px] opacity-40 drop-shadow-lg" style={{ animationDelay: "0.5s" }}>🌟</div>
          <div className="floating-emoji absolute top-[55%] right-[6%] text-[65px] opacity-40 drop-shadow-lg" style={{ animationDelay: "2.5s" }}>🎓</div>
          <div className="floating-emoji absolute bottom-[5%] right-[40%] text-[55px] opacity-40 drop-shadow-lg" style={{ animationDelay: "3s" }}>🎨</div>
        </div>

        <div className="absolute inset-0 opacity-[0.15] z-0" style={{ backgroundImage: "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      </div>

      <article className="animate-modal-pop relative w-full max-w-5xl h-[100dvh] sm:h-[90vh] bg-[#fdfcf8] rounded-none sm:rounded-2xl md:rounded-r-3xl md:rounded-l-lg shadow-[0_30px_80px_-15px_rgba(79,70,229,0.3)] overflow-hidden flex flex-row ring-0 sm:ring-4 ring-white/80 border-0 sm:border-2 border-indigo-100 z-10">

        <div className="absolute top-0 right-10 md:right-16 w-10 md:w-12 h-20 bg-pink-400 z-30 shadow-md flex items-end justify-center pb-2" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}>
          <span className="text-white text-[20px]">⭐</span>
        </div>

        <div className="hidden sm:flex w-12 md:w-16 bg-gradient-to-r from-[#e7e5e4] to-[#f5f5f4] border-r border-slate-300 flex-col items-center py-10 gap-8 shrink-0 shadow-[inset_-2px_0_10px_rgba(0,0,0,0.02)] z-20">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#d6d3d1] shadow-[inset_0_3px_5px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.8)] relative">
              <div className="absolute -left-3 md:-left-4 top-1/2 -translate-y-1/2 w-3 md:w-4 h-[2px] bg-slate-300/50"></div>
            </div>
          ))}
        </div>

        <div className="flex-1 notebook-paper relative z-10 overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="hidden sm:block absolute top-0 bottom-0 left-8 md:left-12 notebook-margin z-0 pointer-events-none"></div>

          <div className="relative z-10 p-4 pt-16 sm:p-10 md:p-12 sm:pl-16 md:pl-20 sm:pt-10 min-h-full flex flex-col">

            <div className="flex flex-wrap justify-between items-end gap-3 mb-8 border-b-2 border-blue-300 pb-2 border-dashed">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <span className="text-[14px] md:text-[16px] font-serif font-bold text-slate-800 mr-2">Subject:</span>
                  <span className="text-[14px] md:text-[16px] font-serif text-slate-700 font-bold px-3 py-1 bg-yellow-200/80 rounded-md shadow-sm border border-yellow-300 transform -rotate-1 inline-block">
                    {item.subjectName || (item.sourceUrl?.startsWith("lesson-ai:") ? "Notebook" : item.tags?.[0]) || "My Awesome Notes"}
                  </span>
                </div>
                {(item.lessonTitle || item.sourceUrl?.startsWith("lesson-ai:")) && (
                  <div>
                    <span className="text-[14px] md:text-[16px] font-serif font-bold text-slate-800 mr-2">Lesson:</span>
                    <span className="text-[14px] md:text-[16px] font-serif text-slate-700 font-bold px-3 py-1 bg-violet-100 rounded-md shadow-sm border border-violet-200 inline-block">
                      {item.lessonTitle || "Lesson notes"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[14px] md:text-[16px] font-serif font-bold text-slate-800 mr-2">Date:</span>
                <span className="text-[14px] md:text-[16px] font-serif text-slate-600 font-medium">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "Today"}
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold text-slate-900 leading-tight mb-6 sm:mb-10 decoration-wavy decoration-indigo-200 underline-offset-8">
              {item.title || "Untitled Summary"}
            </h1>

            {item.status === "PROCESSING" && (
              <div className="flex items-center gap-4 p-6 rounded-xl bg-indigo-50/80 border-2 border-dashed border-indigo-200 font-serif mb-8">
                <span className="material-symbols-outlined text-indigo-500 animate-spin text-[32px]">progress_activity</span>
                <div>
                  <h4 className="text-[18px] font-bold text-indigo-900 mb-1">AI Scribe is writing...</h4>
                  <p className="text-[15px] text-indigo-700">Please wait while the notes are being prepared.</p>
                </div>
              </div>
            )}

            {item.status === "FAILED" && (
              <div className="flex items-center gap-4 p-6 rounded-xl bg-red-50/80 border-2 border-dashed border-red-200 font-serif mb-8">
                <span className="material-symbols-outlined text-red-500 text-[32px]">error_outline</span>
                <div>
                  <h4 className="text-[18px] font-bold text-red-900 mb-1">Failed to write notes</h4>
                  <p className="text-[15px] text-red-700">{item.errorMessage || "Something went wrong."}</p>
                </div>
              </div>
            )}

            {(item.content || item.excerpt) && (
              <div className="flex-1 mb-12">
                <SummaryBody title={item.title} raw={item.content || item.excerpt} />
              </div>
            )}

            <div className="mt-auto pt-6 pb-2 border-t-2 border-blue-300 flex flex-wrap justify-between items-center gap-4 bg-[#fdfcf8] sticky bottom-0 z-20 shadow-[0_-10px_20px_-10px_rgba(253,252,248,1)]">
              <div className="font-serif text-[14px] md:text-[16px] text-slate-700 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-500 border border-indigo-200">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </span>
                <div>
                  <span className="text-slate-500 text-[12px] block leading-tight">Student / Author</span>
                  <strong className="text-indigo-900">
                    {authorName}
                  </strong>
                </div>
              </div>

              {item.notebookId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/notebooks/${item.notebookId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl font-sans text-[13px] md:text-[14px] font-bold hover:bg-violet-700 hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(124,58,237,0.4)] transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  Open {item.subjectName || "lesson"}
                </button>
              ) : item.sourceUrl && !item.sourceUrl.startsWith("lesson-ai:") ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl font-sans text-[13px] md:text-[14px] font-bold hover:bg-indigo-600 hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)] transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">link</span>
                  View original
                </a>
              ) : null}
            </div>

          </div>
        </div>
      </article>
    </div>
  );
}
