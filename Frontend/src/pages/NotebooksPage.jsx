import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import { useToast } from "../context/ToastContext";
import NotebookCover from "../components/NotebookCover";
import { createNotebook, deleteNotebook, getNotebooks, updateNotebook } from "../services/api";

const COVER_COLORS = [
  "#4F46E5",
  "#E11D48",
  "#D97706",
  "#059669",
  "#0284C7",
  "#7C3AED",
  "#0F172A",
];

export default function NotebooksPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [subjectName, setSubjectName] = useState("");
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setSubjectName("");
    setColor(COVER_COLORS[0]);
    setModalOpen(true);
  }

  function openEdit(nb) {
    setEditing(nb);
    setSubjectName(nb.subjectName || "");
    setColor(nb.color || COVER_COLORS[0]);
    setModalOpen(true);
  }

  const load = useCallback(async () => {
    const data = await getNotebooks();
    setNotebooks(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => toast.push(err?.message || "Failed to load notebooks", { type: "error" }))
      .finally(() => setLoading(false));
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (!subjectName.trim()) {
      toast.push("Enter a subject name", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateNotebook(editing.id, { subjectName: subjectName.trim(), color });
        toast.push("Notebook updated", { type: "success" });
      } else {
        await createNotebook({ subjectName: subjectName.trim(), color });
        toast.push("Notebook created", { type: "success" });
      }
      setSubjectName("");
      setColor(COVER_COLORS[0]);
      setEditing(null);
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.push(err?.message || (editing ? "Could not update notebook" : "Could not create notebook"), { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteNotebook(pendingDelete.id);
      toast.push("Notebook deleted", { type: "success" });
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.push(err?.message || "Could not delete notebook", { type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="material-symbols-outlined text-white text-[22px]">menu_book</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Notebooks</h1>
              <p className="text-[13px] text-slate-500">Subject notebooks with chapter-wise lesson notes — separate from AI summaries</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="h-10 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 w-full sm:w-auto"
          >
            + Create New Notebook
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 text-[14px]">Loading notebooks…</div>
        ) : notebooks.length === 0 ? (
          <div className="rounded-3xl bg-white border border-dashed border-slate-200 py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-indigo-200">library_books</span>
            <p className="mt-3 text-slate-600 font-semibold">No notebooks yet</p>
            <p className="text-[13px] text-slate-400 mt-1">Create one for Java, Python, or any subject you are studying.</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-5 h-10 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold w-full sm:w-auto"
            >
              Create your first notebook
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 pt-2">
            {notebooks.map((nb) => (
              <NotebookCover
                key={nb.id}
                notebook={nb}
                onOpen={() => navigate(`/notebooks/${nb.id}`)}
                onEdit={() => openEdit(nb)}
                onDelete={() => setPendingDelete(nb)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setModalOpen(false);
              setEditing(null);
            }}
          />
          <form onSubmit={handleSave} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">{editing ? "Edit notebook" : "New subject notebook"}</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              {editing ? "Change the subject name or cover color." : "Pick a cover color and give it a subject name."}
            </p>
            <label className="block mt-5 text-[12px] font-semibold text-slate-700">Subject name</label>
            <input
              autoFocus
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="Java, C++, System Design…"
              className="mt-1.5 w-full h-11 px-4 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <label className="block mt-4 text-[12px] font-semibold text-slate-700">Cover color</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COVER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color.toLowerCase() === c.toLowerCase() ? "border-slate-900 scale-110" : "border-white"} shadow`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                className="h-10 px-4 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 w-full sm:w-auto">
                {saving ? (editing ? "Saving…" : "Creating…") : editing ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPendingDelete(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Delete notebook?</h2>
            <p className="text-[13px] text-slate-500 mt-2">
              This permanently deletes <b>{pendingDelete.subjectName}</b> and all {pendingDelete.lessonCount || 0} lesson notes inside it.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="h-10 px-4 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 w-full sm:w-auto">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="h-10 px-5 rounded-full bg-red-600 text-white text-sm font-semibold disabled:opacity-60 w-full sm:w-auto">
                {deleting ? "Deleting…" : "Delete all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
