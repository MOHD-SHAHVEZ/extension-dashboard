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
      await changePassword({ currentPassword, newPassword });
      toast.push("Password changed successfully", { type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      onClose();
    } catch (err) {
      toast.push(err?.body?.message || err?.message || "Failed to change password", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const field = "w-full h-12 px-4 rounded-2xl bg-slate-50 border border-transparent text-[14px] outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Security</p>
            <h3 className="text-xl font-semibold text-slate-900">Change password</h3>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="space-y-3">
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className={field} required />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6)" className={field} required />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className={field} required />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-full text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="h-11 px-5 rounded-full bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-60">
            {loading ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
