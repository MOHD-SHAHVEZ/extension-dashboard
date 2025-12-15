// src/pages/Summaries.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SummaryCard from "../components/SummaryCard";
import EditSummaryModal from "../components/EditSummaryModel";
import SummaryDetailModal from "../components/SummaryDetailModal";

import { useToast } from "../context/ToastContext";
import AppLayout from "../layouts/AppLayout";

import { getSummaries, createSummary, updateSummary, deleteSummary } from "../services/api";

export default function SummariesPage() {
  const [summaries, setSummaries] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", sourceUrl: "" });
  const [showDetail, setShowDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const toast = useToast();
  const navigate = useNavigate();

  async function loadSummaries() {
    try {
      const res = await getSummaries({ page: 1, limit: 30 });
      setSummaries(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Fetch error", err);
      toast.push("Failed to load summaries", { type: "error" });
    }
  }

  useEffect(() => {
    loadSummaries();
  }, []);

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
      toast.push("Create failed", { type: "error" });
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
      await updateSummary(id, data);
      toast.push("Summary updated", { type: "success" });
      await loadSummaries();
    } catch (err) {
      toast.push("Update failed", { type: "error" });
      throw err;
    }
  }

  // Open detail modal
  function openDetail(id) {
    setDetailId(id);
    setShowDetail(true);
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Saved Summaries</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Create Summary</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {summaries.filter(Boolean).length ? (
          summaries.filter(Boolean).map((s) => (
            <SummaryCard
              key={s?.id ?? Math.random()}
              summary={s}
              onEdit={onEdit}
              onDelete={handleDelete}
              onPin={handlePin}
              onOpen={openDetail}
            />
          ))
        ) : (
          <div className="text-gray-500 py-12 text-center col-span-full">No summaries found.</div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl transform transition-all duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Create Summary</h3>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setShowCreate(false)}>✖</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border rounded-lg p-2" required />
              <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Excerpt" className="w-full border rounded-lg p-2" required />
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Content" className="w-full border rounded-lg p-2 h-36" required />
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Source URL" className="w-full border rounded-lg p-2" />

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      <EditSummaryModal open={showEdit} summary={editing} onClose={() => setShowEdit(false)} onSaved={loadSummaries} updateFn={handleUpdate} />

      {/* Detail modal */}
      <SummaryDetailModal open={showDetail} id={detailId} onClose={closeDetail} />
    </AppLayout>
  );
}
