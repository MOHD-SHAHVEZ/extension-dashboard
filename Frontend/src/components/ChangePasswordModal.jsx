// src/components/ChangePasswordModal.jsx
import React, { useState } from "react";
import { changePassword } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirm) {
      toast.push("Please fill all fields", { type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      toast.push("New password must be at least 6 characters", { type: "error" });
      return;
    }
    if (newPassword !== confirm) {
      toast.push("New password and confirmation do not match", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      if (typeof changePassword !== "function") {
        // if backend function not available - simulate success
        localStorage.setItem("fake_password_change", Date.now().toString());
        toast.push("Password changed (local simulation)", { type: "success" });
        onClose();
        return;
      }

      await changePassword({ currentPassword, newPassword });
      toast.push("Password changed successfully", { type: "success" });
      // clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      onClose();
    } catch (err) {
      console.error("changePassword error", err);
      const message = err?.body?.message || err?.message || "Failed to change password";
      toast.push(message, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Change Password</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✖</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
            <div className="text-xs text-gray-400 mt-1">Use at least 6 characters.</div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border rounded-lg p-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
              {loading ? "Saving..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
