// src/components/DeleteConfirm.jsx
import React from "react"

/**
 * Simple Delete confirmation modal
 * Props:
 * - open (bool)
 * - item (object) optional (for showing name)
 * - onClose()
 * - onConfirm() => async function to delete
 */
export default function DeleteConfirm({ open, item, onClose = () => {}, onConfirm = async () => {} }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 max-w-md w-11/12 shadow">
        <h3 className="text-lg font-semibold">Delete summary?</h3>
        <p className="text-sm text-gray-600 mt-2">
          Are you sure you want to delete <b>{item?.title || "this summary"}</b>? This action cannot be undone.
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
