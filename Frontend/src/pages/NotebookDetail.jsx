import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import LessonMarkdown from "../components/LessonMarkdown";
import LessonReader from "../components/LessonReader";
import { isMarkdownNotes, notesToMarkdown } from "../utils/notesToMarkdown";
import { useToast } from "../context/ToastContext";
import {
  createLesson,
  deleteLesson,
  deleteLessonAiSummary,
  generateLessonAiSummary,
  getLesson,
  getLessonAiSummaries,
  getLessons,
  getNotebook,
  importLessonFile,
  saveLessonAiSummary,
  updateLesson,
} from "../services/api";

function isPlaceholderTitle(name) {
  const value = (name || "").trim();
  return !value || /^Lesson\s+\d+$/i.test(value) || /^Untitled$/i.test(value);
}

function suggestLessonTitle(content) {
  const lines = String(content || "").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      return heading[1].replace(/[*_`]/g, "").trim().slice(0, 200);
    }
    if (line.startsWith("|") || line.startsWith("```") || line.startsWith("---")) continue;
    return line.replace(/^[*_`#>]+/, "").trim().slice(0, 200);
  }
  return "";
}

export default function NotebookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [notebook, setNotebook] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("edit");
  const [loading, setLoading] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedSummaries, setSavedSummaries] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewMode, setPreviewMode] = useState("draft");
  const [titleLocked, setTitleLocked] = useState(false);
  const [pendingLessonDelete, setPendingLessonDelete] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePane, setMobilePane] = useState("toc");
  const titleInputRef = useRef(null);
  const lessonScrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const previewMarkdown = useMemo(() => notesToMarkdown(content), [content]);
  const contentIsMarkdown = useMemo(() => isMarkdownNotes(content), [content]);

  const loadSavedSummaries = useCallback(async (lessonId) => {
    if (!lessonId) {
      setSavedSummaries([]);
      return;
    }
    try {
      const rows = await getLessonAiSummaries(lessonId);
      setSavedSummaries(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setSavedSummaries([]);
      if (err?.status && err.status !== 404) {
        toast.push(err.message || "Could not load saved summaries", { type: "error" });
      }
    }
  }, []);

  const loadNotebook = useCallback(async () => {
    const [nb, toc] = await Promise.all([getNotebook(id), getLessons(id)]);
    setNotebook(nb);
    setLessons(Array.isArray(toc) ? toc : []);
    return Array.isArray(toc) ? toc : [];
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    setLesson(null);
    setMobilePane("toc");
    loadNotebook()
      .then((toc) => {
        if (toc[0]?.id) setSelectedId(toc[0].id);
      })
      .catch((err) => {
        toast.push(err?.message || "Notebook not found", { type: "error" });
        navigate("/notebooks");
      })
      .finally(() => setLoading(false));
  }, [loadNotebook, navigate]);

  useEffect(() => {
    if (!selectedId) {
      setLesson(null);
      setTitle("");
      setContent("");
      setDirty(false);
      setSavedSummaries([]);
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingLesson(true);
    setPreview(null);
    getLesson(selectedId)
      .then((data) => {
        if (cancelled) return;
        setLesson(data);
        const incomingTitle = data.lessonTitle || "";
        const suggested = isPlaceholderTitle(incomingTitle) ? suggestLessonTitle(data.content) : "";
        setTitle(suggested || incomingTitle);
        setContent(data.content || "");
        setTitleLocked(!isPlaceholderTitle(incomingTitle));
        setDirty(Boolean(suggested));
        setMode((data.content || "").trim() ? "preview" : "edit");
        loadSavedSummaries(selectedId);
        if (isPlaceholderTitle(data.lessonTitle) && !(data.content || "").trim()) {
          setTimeout(() => titleInputRef.current?.focus(), 0);
        }
      })
      .catch((err) => {
        if (!cancelled) toast.push(err?.message || "Failed to load lesson", { type: "error" });
      })
      .finally(() => {
        if (!cancelled) setLoadingLesson(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleAddLesson() {
    setAdding(true);
    try {
      const created = await createLesson(id, {
        lessonTitle: "Untitled",
        content: "",
      });
      const toc = await loadNotebook();
      setSelectedId(created.id || toc[toc.length - 1]?.id);
      setTitleLocked(false);
      setMode("edit");
      setMobilePane("editor");
      toast.push("Type a lesson name, or paste notes and it will pick one", { type: "success" });
    } catch (err) {
      toast.push(err?.message || "Could not add lesson", { type: "error" });
    } finally {
      setAdding(false);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    if (!title.trim()) {
      toast.push("Lesson title is required", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateLesson(selectedId, { lessonTitle: title.trim(), content });
      setLesson(saved);
      setDirty(false);
      setLessons((prev) => prev.map((item) => (
        item.id === saved.id
          ? { ...item, lessonTitle: saved.lessonTitle, updatedAt: saved.updatedAt }
          : item
      )));
      toast.push("Lesson saved", { type: "success" });
      return saved;
    } catch (err) {
      toast.push(err?.message || "Could not save lesson", { type: "error" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedId) return;
    setImporting(true);
    try {
      const result = await importLessonFile(selectedId, file);
      const incoming = (result?.text || "").trim();
      if (!incoming) {
        toast.push("Is file se text nahi nikla", { type: "error" });
        return;
      }
      setContent((prev) => {
        const current = (prev || "").trim();
        if (!current) return incoming;
        return `${current}\n\n---\n\n${incoming}`;
      });
      if (!titleLocked && result?.suggestedTitle) {
        setTitle(result.suggestedTitle);
        setTitleLocked(true);
      }
      setDirty(true);
      setMode("edit");
      toast.push(`${file.name} se notes nikal liye`, { type: "success" });
    } catch (err) {
      toast.push(err?.message || "File se text nahi nikal paya", { type: "error" });
    } finally {
      setImporting(false);
    }
  }

  async function handleGenerateSummary() {
    if (!selectedId) return;
    const source = dirty ? (await handleSave()) : lesson;
    if (dirty && !source) return;
    const body = (source?.content ?? content ?? "").trim();
    if (!body) {
      toast.push("Write some lesson content first, then generate a summary.", { type: "error" });
      return;
    }
    setGenerating(true);
    try {
      const draft = await generateLessonAiSummary(selectedId);
      setPreview(draft);
      setPreviewMode("draft");
      toast.push("Summary ready — review it before saving", { type: "success", ttl: 4500 });
    } catch (err) {
      toast.push(err?.message || "Could not generate summary", { type: "error", ttl: 6000 });
    } finally {
      setGenerating(false);
    }
  }

  async function handleKeepSummary() {
    if (!preview?.id) return;
    setSavingSummary(true);
    try {
      const saved = await saveLessonAiSummary(preview.id);
      setPreview(saved);
      setPreviewMode("saved");
      await loadSavedSummaries(selectedId);
      toast.push("Saved — also in AI Summaries & Notes", { type: "success" });
    } catch (err) {
      toast.push(err?.message || "Could not save summary", { type: "error" });
    } finally {
      setSavingSummary(false);
    }
  }

  async function handleDeleteSavedSummary(summaryId) {
    if (!window.confirm("Delete this saved summary?")) return;
    try {
      await deleteLessonAiSummary(summaryId);
      setSavedSummaries((prev) => prev.filter((row) => row.id !== summaryId));
      if (preview?.id === summaryId) setPreview(null);
      toast.push("Summary deleted", { type: "success" });
    } catch (err) {
      toast.push(err?.message || "Could not delete summary", { type: "error" });
    }
  }

  async function confirmDeleteLesson() {
    if (!pendingLessonDelete) return;
    setDeletingLesson(true);
    try {
      await deleteLesson(pendingLessonDelete.id);
      const removedId = pendingLessonDelete.id;
      setPendingLessonDelete(null);
      setPreview(null);
      toast.push("Lesson deleted", { type: "success" });
      const toc = await loadNotebook();
      const next = toc.find((item) => item.id !== removedId) || toc[0];
      setSelectedId(next?.id || null);
    } catch (err) {
      toast.push(err?.message || "Could not delete lesson", { type: "error" });
    } finally {
      setDeletingLesson(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-slate-400">Opening notebook…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/notebooks")}
              className="w-9 h-9 rounded-full bg-white shadow-sm text-slate-600 hover:bg-slate-50"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <span className="w-4 h-4 rounded-full shrink-0" style={{ background: notebook?.color || "#4F46E5" }} />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{notebook?.subjectName}</h1>
              <p className="text-[12px] text-slate-500">{lessons.length} lesson{lessons.length === 1 ? "" : "s"}</p>
            </div>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2 text-[11px] font-semibold text-slate-400">
          <span className={mobilePane === "toc" ? "text-indigo-600" : ""}>1. Lessons</span>
          <span>→</span>
          <span className={mobilePane === "editor" ? "text-indigo-600" : ""}>2. Write notes</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:h-[calc(100dvh-8.75rem)]">
          <aside className={`${mobilePane === "editor" ? "hidden lg:flex" : "flex"} bg-white rounded-2xl shadow-sm p-4 flex-col min-h-[60vh] lg:min-h-0 lg:max-h-none lg:h-full overflow-hidden`}>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Table of contents</h2>
              <button
                type="button"
                onClick={handleAddLesson}
                disabled={adding}
                className="h-8 px-3 rounded-full bg-indigo-600 text-white text-[11px] font-semibold disabled:opacity-60"
              >
                {adding ? "Adding…" : "+ Add Lesson"}
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {lessons.length === 0 && (
                <p className="text-[13px] text-slate-400 py-10 text-center">No lessons yet. Add your first chapter note.</p>
              )}
              {lessons.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (dirty && selectedId !== item.id && !window.confirm("Discard unsaved changes?")) return;
                    setSelectedId(item.id);
                    setMobilePane("editor");
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                    selectedId === item.id ? "bg-indigo-50 text-indigo-800 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] text-slate-400 block">Lesson {index + 1}</span>
                  <span className="truncate block">{item.lessonTitle}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className={`${mobilePane === "toc" ? "hidden lg:flex" : "flex"} relative rounded-2xl shadow-sm border border-slate-200 bg-white flex-col min-h-[70vh] lg:min-h-0 lg:h-full overflow-hidden`}>
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Select or add a lesson to start writing.
              </div>
            ) : loadingLesson ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">Loading lesson…</div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobilePane("toc")}
                      className="lg:hidden h-8 px-2.5 rounded-lg text-[12px] font-semibold text-slate-600"
                    >
                      ← Lessons
                    </button>
                    <div className="text-slate-500 text-[12px] min-w-0 truncate flex-1">
                      <span className="font-semibold text-slate-800">{notebook?.subjectName}</span>
                    </div>
                    <div className="flex items-center rounded-lg bg-slate-200/80 p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMode("edit")}
                        className={`h-7 px-2.5 rounded-md text-[11px] font-semibold ${mode === "edit" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("preview")}
                        className={`h-7 px-2.5 rounded-md text-[11px] font-semibold ${mode === "preview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                      >
                        Preview
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || generating}
                      className={`h-8 px-3 rounded-lg text-[11px] font-semibold disabled:opacity-60 shrink-0 ${
                        dirty ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      {saving ? "…" : dirty ? "Save" : "Saved"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.markdown,.txt,.text,.pdf,text/plain,text/markdown,application/pdf"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing || saving || generating}
                      className="flex-1 h-9 rounded-lg text-slate-600 disabled:opacity-60 inline-flex flex-col items-center justify-center gap-0 leading-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">{importing ? "progress_activity" : "upload_file"}</span>
                      <span className="text-[10px] font-semibold mt-0.5">{importing ? "Reading" : "Upload"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={saving || generating}
                      className="flex-1 h-9 rounded-lg text-violet-600 disabled:opacity-60 inline-flex flex-col items-center justify-center leading-none"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${generating ? "animate-spin" : ""}`}>
                        {generating ? "progress_activity" : "auto_awesome"}
                      </span>
                      <span className="text-[10px] font-semibold mt-0.5">{generating ? "Working" : "Summarize"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("preview");
                        setFullscreen(true);
                      }}
                      className="flex-1 h-9 rounded-lg text-slate-600 inline-flex flex-col items-center justify-center leading-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                      <span className="text-[10px] font-semibold mt-0.5">Expand</span>
                    </button>
                    {lesson && (
                      <button
                        type="button"
                        onClick={() => setPendingLessonDelete(lesson)}
                        className="flex-1 h-9 rounded-lg text-rose-500 inline-flex flex-col items-center justify-center leading-none"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        <span className="text-[10px] font-semibold mt-0.5">Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {savedSummaries.length > 0 && (
                  <div className="mx-5 mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">
                        Saved AI summaries
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/summaries")}
                        className="text-[11px] font-semibold text-violet-700 hover:text-violet-900"
                      >
                        Open AI Summaries →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {savedSummaries.map((row) => (
                        <div key={row.id} className="flex items-start justify-between gap-2 rounded-xl bg-white px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPreview(row);
                              setPreviewMode("saved");
                            }}
                            className="text-left min-w-0"
                          >
                            <span className="block text-[13px] font-semibold text-slate-800 truncate">{row.title}</span>
                            <span className="block text-[11px] text-violet-700 truncate">
                              {(row.subjectName || notebook?.subjectName || "Subject")} · {row.lessonTitle || lesson?.lessonTitle || "Lesson"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedSummary(row.id)}
                            className="text-[11px] text-rose-600 shrink-0"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-4 sm:px-5 pt-4 shrink-0">
                  <label htmlFor="lesson-name" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Lesson name
                  </label>
                  <input
                    id="lesson-name"
                    ref={titleInputRef}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleLocked(!isPlaceholderTitle(e.target.value));
                      setDirty(true);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[18px] font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Type a name, or paste notes below to auto-fill"
                  />
                </div>

                <div ref={lessonScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {mode === "edit" ? (
                    <textarea
                      value={content}
                      onChange={(e) => {
                        const next = e.target.value;
                        setContent(next);
                        setDirty(true);
                        if (!titleLocked) {
                          const suggested = suggestLessonTitle(next);
                          if (suggested) setTitle(suggested);
                        }
                      }}
                      placeholder="Type notes, or upload a .md / .txt / .pdf file. Text will appear here."
                      className="w-full min-h-[280px] sm:min-h-[520px] resize-y bg-white px-4 sm:px-5 py-4 text-[16px] leading-7 text-slate-800 outline-none whitespace-pre-wrap"
                    />
                  ) : (
                    <div className="px-5 py-4">
                      <LessonMarkdown tables={contentIsMarkdown}>
                        {previewMarkdown}
                      </LessonMarkdown>
                    </div>
                  )}
                  {lesson?.updatedAt && (
                    <p className="text-[11px] text-slate-400 px-5 pb-2">
                      Last saved {new Date(lesson.updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {pendingLessonDelete && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900">Delete lesson?</h3>
            <p className="text-[13px] text-slate-500 mt-2">
              This permanently deletes <b>{pendingLessonDelete.lessonTitle || "this lesson"}</b> and any AI summaries for it.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingLessonDelete(null)} className="h-10 px-4 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button type="button" onClick={confirmDeleteLesson} disabled={deletingLesson} className="h-10 px-5 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-60">
                {deletingLesson ? "Deleting…" : "Delete lesson"}
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreen && selectedId && (
        <LessonReader
          notebook={notebook}
          title={title}
          content={content}
          mode={mode}
          titleLocked={titleLocked}
          onModeChange={setMode}
          onContentChange={(next, locked) => {
            setContent(next);
            setDirty(true);
            if (!locked) {
              const suggested = suggestLessonTitle(next);
              if (suggested) setTitle(suggested);
            }
          }}
          onClose={() => setFullscreen(false)}
        />
      )}

      {preview && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-[#fdfcf8] w-full max-w-2xl max-h-[86vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-violet-600 font-bold">
                  {previewMode === "draft" && !preview.saved ? "Draft preview" : "Saved summary"}
                </p>
                <h3 className="text-lg font-serif font-bold text-slate-900">{preview.title}</h3>
                {preview.modelUsed && (
                  <p className="text-[11px] text-slate-400 mt-1">Model: {preview.modelUsed}</p>
                )}
              </div>
              <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {preview.excerpt && <p className="text-slate-600 italic mb-4">{preview.excerpt}</p>}
              <LessonMarkdown variant="paper" tables={isMarkdownNotes(preview.content || "")}>
                {notesToMarkdown(preview.content || "")}
              </LessonMarkdown>
            </div>
            <div className="px-5 py-4 border-t border-violet-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="h-9 px-4 rounded-full bg-white text-slate-600 text-[13px] font-semibold"
              >
                Close
              </button>
              {!preview.saved && (
                <button
                  type="button"
                  onClick={handleKeepSummary}
                  disabled={savingSummary}
                  className="h-9 px-4 rounded-full bg-violet-600 text-white text-[13px] font-semibold disabled:opacity-60"
                >
                  {savingSummary ? "Saving…" : "Save this summary"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
