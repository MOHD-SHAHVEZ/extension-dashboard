// src/components/SummaryModal.jsx
// Simple modal with plain textarea (no rich editor)
// Replace the existing file with this exact content.

import React, { useState, useEffect } from "react"

export default function SummaryModal({ open, onClose = () => {}, onCreated = () => {} }) {
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    sourceUrl: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // reset when opened
  useEffect(() => {
    if (open) {
      setForm({ title: "", excerpt: "", content: "", sourceUrl: "" })
      setError("")
      setLoading(false)
    }
  }, [open])

  if (!open) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!form.title.trim()) return setError("Title is required")
    setLoading(true)
    try {
      await onCreated(form)
      onClose()
    } catch (err) {
      setError(err?.message || "Failed to create")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-11/12 max-w-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-700">Create Summary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input name="title" value={form.title} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Excerpt</label>
            <input name="excerpt" value={form.excerpt} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows={6}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Source URL</label>
            <input name="sourceUrl" value={form.sourceUrl} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2" />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex items-center justify-end gap-3 mt-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 rounded-md bg-blue-700 text-white font-semibold">
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
