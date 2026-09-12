// src/pages/Summaries.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SummaryCard from "../components/SummaryCard";
import EditSummaryModal from "../components/EditSummaryModel";
import SummaryDetailModal from "../components/SummaryDetailModal";

import { useToast } from "../context/ToastContext";
import AppLayout from "../layouts/AppLayout";

import { getSummaries, createSummary, updateSummary, deleteSummary, summarizeUrl, getSavedLessonAiSummaries } from "../services/api";

export default function SummariesPage() {
  const [summaries, setSummaries] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", sourceUrl: "" });
  const [aiUrl, setAiUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [loading, setLoading] = useState(true);

  const toast = useToast();
  const navigate = useNavigate();

  async function loadSummaries() {
    try {
      await getSavedLessonAiSummaries().catch(() => []);
      const res = await getSummaries({ page: 1, limit: 80 });
      setSummaries(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Fetch error", err);
      toast.push(err?.message || "Failed to load summaries", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummaries();
  }, []);

  async function handleAiFromUrl(e) {
    e.preventDefault();
    if (!aiUrl.trim()) return;
    setAiLoading(true);
    try {
      const result = await summarizeUrl(aiUrl.trim());
      if (result?.status === "FAILED") {
        toast.push(result.errorMessage || "Summarization failed", { type: "error" });
      } else {
        toast.push("AI summary ready", { type: "success" });
      }
      setAiUrl("");
      await loadSummaries();
    } catch (err) {
      console.error(err);
      toast.push(err?.message || "Failed to summarize URL", { type: "error" });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createSummary(form);
      toast.push("Summary created", { type: "success" });
      setForm({ title: "", excerpt: "", content: "", sourceUrl: "" });
      setShowCreate(false);
      await loadSummaries();
    } catch (err) {
      console.error("Create error", err);
      toast.push(err?.message || "Create failed", { type: "error" });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this summary?")) return;
    try {
      await deleteSummary(id);
      toast.push("Summary deleted", { type: "success" });
      await loadSummaries();
    } catch (err) {
      console.error("Delete error", err);
      toast.push("Delete failed", { type: "error" });
    }
  }

  function onEdit(summary) {
    setEditing(summary);
    setShowEdit(true);
  }

  async function handleUpdate(id, data) {
    try {
      await updateSummary(id, {
        pinned: editing?.pinned,
        tags: editing?.tags,
        status: editing?.status,
        ...data,
      });
      toast.push("Summary updated", { type: "success" });
      await loadSummaries();
    } catch (err) {
      toast.push("Update failed", { type: "error" });
      throw err;
    }
  }

  function openDetail(id) {
    navigate(`/summaries/${id}`);
  }
  
  function closeDetail() {
    setDetailId(null);
    setShowDetail(false);
  }

  // NEW: toggle pin (optimistic + backend update)
  async function handlePin(id) {
    try {
      const s = summaries.find(x => String(x.id) === String(id));
      if (!s) {
        toast.push("Summary not found", { type: "error" });
        return;
      }
      const newPinned = !Boolean(s.pinned);

      // optimistic UI update
      setSummaries(prev => prev.map(x => (String(x.id) === String(id) ? { ...x, pinned: newPinned } : x)));

      // update backend (send changed field)
      await updateSummary(id, { ...s, pinned: newPinned });

      toast.push(newPinned ? "Pinned" : "Unpinned", { type: "success" });

      // refresh lists to sync
      await loadSummaries();

      // navigate to dashboard so user sees pinned item on top
      navigate("/dashboard");
      // if you don't want to auto-navigate, comment above line
    } catch (err) {
      console.error("Pin error", err);
      toast.push("Failed to update pin", { type: "error" });
      // rollback optimistic change
      await loadSummaries();
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
              <span className="material-symbols-outlined text-white text-[20px] sm:text-[22px]">auto_stories</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">AI Summaries</h1>
              <p className="hidden sm:block text-[13px] text-slate-500">Lesson recaps and web notes — tap a card to see the subject and lesson</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-9 sm:h-10 px-3 sm:px-5 rounded-full bg-indigo-600 text-white text-[12px] sm:text-[13px] font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 shrink-0 inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">Create Summary</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <form onSubmit={handleAiFromUrl} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 p-2 sm:p-3">
          <span className="material-symbols-outlined text-slate-400 text-[20px] ml-2 shrink-0">link</span>
          <input
            type="url"
            value={aiUrl}
            onChange={(e) => setAiUrl(e.target.value)}
            placeholder="Paste article or YouTube URL"
            className="flex-1 min-w-0 h-10 bg-transparent text-[13px] sm:text-sm outline-none"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="h-10 px-3 sm:px-5 rounded-xl bg-indigo-600 text-white text-[12px] sm:text-[13px] font-semibold disabled:opacity-60 shrink-0 inline-flex items-center gap-1"
          >
            <span className={`material-symbols-outlined text-[18px] ${aiLoading ? "animate-spin" : ""}`}>
              {aiLoading ? "progress_activity" : "auto_awesome"}
            </span>
            <span className="hidden sm:inline">{aiLoading ? "Summarizing…" : "Summarize"}</span>
          </button>
        </form>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-[14px]">Opening your summaries…</div>
        ) : summaries.filter(Boolean).length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-2 overflow-visible">
            {summaries.filter(Boolean).map((s) => (
              <SummaryCard
                key={s.id}
                summary={s}
                onEdit={onEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onOpen={openDetail}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-dashed border-slate-200 py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-violet-200">auto_stories</span>
            <p className="mt-3 text-slate-600 font-semibold">No summaries yet</p>
            <p className="text-[13px] text-slate-400 mt-1">Save a lesson summary from a notebook, or summarize a URL.</p>
            <button
              type="button"
              onClick={() => navigate("/notebooks")}
              className="mt-5 h-10 px-5 rounded-full bg-violet-600 text-white text-[13px] font-semibold"
            >
              Open notebooks
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <form onSubmit={handleCreate} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Create summary</h2>
            <p className="text-[13px] text-slate-500 mt-1">Write a note by hand, or save one from a lesson later.</p>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="mt-5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200" required />
            <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Excerpt" className="mt-3 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200" required />
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="mt-3 w-full h-36 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200" required />
            <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Source URL (optional)" className="mt-3 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="h-10 px-4 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 w-full sm:w-auto">Cancel</button>
              <button type="submit" className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-semibold w-full sm:w-auto">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit modal */}
      <EditSummaryModal open={showEdit} summary={editing} onClose={() => setShowEdit(false)} onSaved={loadSummaries} updateFn={handleUpdate} />

      {/* Detail modal */}
      <SummaryDetailModal open={showDetail} id={detailId} onClose={closeDetail} />
    </AppLayout>
  );
}
