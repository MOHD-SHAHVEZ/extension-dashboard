// src/components/EditSummaryModal.jsx
import React, { useEffect, useState } from "react";
import { useToast } from "../context/ToastContext";

export default function EditSummaryModal({ open, summary, onClose, onSaved, updateFn }) {
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", sourceUrl: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (summary) {
      setForm({
        title: summary.title || "",
        excerpt: summary.excerpt || "",
        content: summary.content || "",
        sourceUrl: summary.sourceUrl || "",
      });
    } else {
      setForm({ title: "", excerpt: "", content: "", sourceUrl: "" });
    }
  }, [summary]);

  if (!open) return null;

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFn(summary.id, form);
      toast.push("Summary updated", { type: "success" });
      onSaved();
      onClose();
    } catch (err) {
      console.error("Update failed", err);
      toast.push("Update failed", { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Edit Summary</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✖</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full border rounded-lg p-2" required />
          <input value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Excerpt" className="w-full border rounded-lg p-2" required />
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Content" className="w-full border rounded-lg p-2 h-36" required />
          <input value={form.sourceUrl} onChange={e => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Source URL" className="w-full border rounded-lg p-2" />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
