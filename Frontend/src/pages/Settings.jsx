import React, { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useToast } from "../context/ToastContext";
import { getProfile, updateProfile, uploadAvatar } from "../services/api";
import { useAuth } from "../context/AuthContext";

const PERSONAS = [
  { id: "student", icon: "school", label: "Student" },
  { id: "professional", icon: "work", label: "Professional" },
  { id: "freelancer", icon: "rocket_launch", label: "Freelancer" },
  { id: "business", icon: "apartment", label: "Business" },
];

function initials(name, email) {
  const fromName = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (fromName.length >= 2) return (fromName[0][0] + fromName[1][0]).toUpperCase();
  if (fromName[0]) return fromName[0].slice(0, 2).toUpperCase();
  const user = String(email || "").split("@")[0];
  return (user.slice(0, 2) || "ME").toUpperCase();
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function Field({ icon, label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full h-12 px-4 rounded-2xl bg-slate-50 border border-transparent text-[14px] text-slate-800 outline-none transition focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50";

export default function SettingsPage() {
  const toast = useToast();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarLeft, setAvatarLeft] = useState(3);
  const [avatarMax, setAvatarMax] = useState(3);
  const [showPwd, setShowPwd] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);
  const [viewClosing, setViewClosing] = useState(false);
  const fileInputRef = useRef(null);
  const closeViewTimer = useRef(null);
  const [email, setEmail] = useState(localStorage.getItem("username") || localStorage.getItem("email") || "");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    persona: "student",
    bio: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    avatarDataUrl: "",
    emailNotifications: true,
  });

  useEffect(() => {
    setLoading(true);
    getProfile()
      .then((p) => {
        const user = p.user || p;
        const next = {
          firstName: p.firstName || user.firstName || "",
          lastName: p.lastName || user.lastName || "",
          phone: p.phone || user.phone || "",
          persona: p.persona || user.persona || "student",
          bio: p.bio || user.bio || "",
          githubUrl: p.githubUrl || user.githubUrl || "",
          linkedinUrl: p.linkedinUrl || user.linkedinUrl || "",
          portfolioUrl: p.portfolioUrl || user.portfolioUrl || "",
          avatarDataUrl: p.avatarDataUrl || user.avatarDataUrl || localStorage.getItem("profile_avatar") || "",
          emailNotifications: p.emailNotifications ?? user.emailNotifications ?? true,
        };
        setForm(next);
        const mail = p.username || user.username || email;
        setEmail(mail);
        const name = [next.firstName, next.lastName].filter(Boolean).join(" ").trim();
        if (name) localStorage.setItem("profile_name", name);
        if (next.avatarDataUrl) localStorage.setItem("profile_avatar", next.avatarDataUrl);
        setAvatarLeft(p.avatarChangesLeft ?? user.avatarChangesLeft ?? 3);
        setAvatarMax(p.avatarChangesMax ?? user.avatarChangesMax ?? 3);
      })
      .catch(() => toast.push("Could not load profile", { type: "error" }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!photoMenu && !viewPhoto) return;
    function onKey(e) {
      if (e.key === "Escape") {
        if (viewPhoto) closeViewPhoto();
        else setPhotoMenu(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photoMenu, viewPhoto, viewClosing]);

  useEffect(() => () => window.clearTimeout(closeViewTimer.current), []);

  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const completeness = useMemo(() => {
    const checks = [form.firstName, form.phone, form.persona, form.avatarDataUrl, form.bio];
    return Math.round((checks.filter((v) => String(v || "").trim()).length / checks.length) * 100);
  }, [form]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openPhotoMenu() {
    if (uploading) return;
    setPhotoMenu(true);
  }

  function viewCurrentPhoto() {
    if (!form.avatarDataUrl) {
      toast.push("No profile photo yet", { type: "error" });
      return;
    }
    setPhotoMenu(false);
    setViewClosing(false);
    setViewPhoto(true);
  }

  function closeViewPhoto(after) {
    if (!viewPhoto || viewClosing) return;
    setViewClosing(true);
    window.clearTimeout(closeViewTimer.current);
    closeViewTimer.current = window.setTimeout(() => {
      setViewPhoto(false);
      setViewClosing(false);
      after?.();
    }, 260);
  }

  function pickNewPhoto() {
    if (avatarLeft <= 0) {
      toast.push("You can change your photo only 3 times this month", { type: "error" });
      return;
    }
    setPhotoMenu(false);
    fileInputRef.current?.click();
  }

  async function onAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.push("Please choose an image", { type: "error" });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.push("Photo must be 5 MB or smaller", { type: "error" });
      return;
    }
    if (avatarLeft <= 0) {
      toast.push("You can change your photo only 3 times this month", { type: "error" });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadAvatar(file);
      const url = res.avatarDataUrl || res.user?.avatarDataUrl || "";
      setField("avatarDataUrl", url);
      setAvatarLeft(res.avatarChangesLeft ?? res.user?.avatarChangesLeft ?? Math.max(0, avatarLeft - 1));
      setAvatarMax(res.avatarChangesMax ?? res.user?.avatarChangesMax ?? avatarMax);
      if (url) localStorage.setItem("profile_avatar", url);
      toast.push("Photo updated", { type: "success" });
    } catch (err) {
      toast.push(err?.message || "Could not upload photo", { type: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.firstName.trim()) {
      toast.push("First name is required", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: fullName,
        phone: form.phone.trim(),
        persona: form.persona,
        bio: form.bio.trim(),
        githubUrl: form.githubUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        portfolioUrl: form.portfolioUrl.trim(),
        emailNotifications: form.emailNotifications,
      });
      localStorage.setItem("profile_name", fullName);
      localStorage.setItem("profile_avatar", form.avatarDataUrl || "");
      toast.push("Profile saved", { type: "success" });
    } catch (err) {
      toast.push(err?.message || "Could not save profile", { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <style>{`
        @keyframes fadeInUpSettings {
          0% { opacity: 0; transform: translateY(30px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-settings-card {
          animation: fadeInUpSettings 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-settings-card .stagger-1 { animation: fadeInUpSettings 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
        .animate-settings-card .stagger-2 { animation: fadeInUpSettings 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
        .animate-settings-card .stagger-3 { animation: fadeInUpSettings 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
      `}</style>
      <div className="max-w-3xl mx-auto pb-8">
        {loading ? (
          <div className="text-center py-24 text-slate-400 text-[14px]">Loading profile…</div>
        ) : (
          <div className="animate-settings-card overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.28)] ring-1 ring-slate-100">
            <div className="relative h-36 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 overflow-hidden">
              <div className="absolute -left-10 -top-16 w-48 h-48 rounded-full bg-white/10" />
              <div className="absolute right-8 -bottom-10 w-40 h-40 rounded-full bg-violet-300/20" />
              <svg className="absolute inset-x-0 bottom-0 w-full" viewBox="0 0 800 70" preserveAspectRatio="none">
                <path d="M0 40 C160 80 280 10 420 38 C560 66 680 20 800 48 L800 70 L0 70 Z" fill="white" />
              </svg>
              <div className="absolute top-5 right-5 flex items-center gap-3 text-white">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Profile strength</p>
                  <p className="text-[13px] font-semibold">{completeness}% complete</p>
                </div>
                <div className="w-11 h-11 rounded-full border-2 border-white/30 grid place-items-center text-[11px] font-bold">
                  {completeness}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-8 pb-8 relative z-10">
              <div className="stagger-1 flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="relative w-[112px] h-[112px] shrink-0 -mt-12 sm:-mt-16">
                  <button
                    type="button"
                    onClick={openPhotoMenu}
                    className="relative w-full h-full rounded-[28px] overflow-hidden bg-indigo-50 ring-4 ring-white shadow-lg grid place-items-center group transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:shadow-xl active:scale-[0.97]"
                    title="View or update photo"
                  >
                    {form.avatarDataUrl ? (
                      <img src={form.avatarDataUrl} alt="avatar" className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
                    ) : (
                      <span className="text-[28px] font-bold text-indigo-600">{initials(fullName, email)}</span>
                    )}
                    <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors duration-300 grid place-items-center">
                      <span className="material-symbols-outlined text-white text-[22px] opacity-0 translate-y-1 scale-75 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300">photo_camera</span>
                    </span>
                    {uploading && (
                      <div className="profile-fade absolute inset-0 bg-white/75 grid place-items-center text-[11px] font-semibold text-indigo-600">
                        Uploading…
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={openPhotoMenu}
                    className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-slate-900 text-white grid place-items-center shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:bg-indigo-600 active:scale-95"
                    title="Photo options"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading || avatarLeft <= 0}
                    onChange={onAvatar}
                  />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                    {PERSONAS.find((p) => p.id === form.persona)?.label || "Member"}
                  </p>
                  <h1 className="text-[28px] leading-tight font-semibold text-slate-900 truncate">
                    {fullName || "Your profile"}
                  </h1>
                  <p className="text-[13px] text-slate-500 truncate">{email}</p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    {avatarLeft > 0
                      ? `${avatarLeft} of ${avatarMax} photo changes left this month · max 5 MB`
                      : `Photo change limit reached for this month (${avatarMax}/month)`}
                  </p>
                </div>
              </div>

              <div className="stagger-2 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field icon="badge" label="First name">
                  <input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} className={inputClass} placeholder="Neha" />
                </Field>
                <Field icon="badge" label="Last name">
                  <input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} className={inputClass} placeholder="Gaur" />
                </Field>
                <Field icon="mail" label="Email">
                  <input value={email} readOnly className={`${inputClass} text-slate-400 cursor-not-allowed`} />
                </Field>
                <Field icon="call" label="Phone">
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
                </Field>
              </div>

              <div className="stagger-3 mt-4">
                <Field icon="edit_note" label="About you">
                  <textarea
                    value={form.bio}
                    onChange={(e) => setField("bio", e.target.value.slice(0, 220))}
                    rows={3}
                    placeholder="What you are studying, building, or preparing for"
                    className={`${inputClass} h-auto py-3 resize-none`}
                  />
                </Field>
                <p className="mt-1 text-right text-[11px] text-slate-400">{form.bio.length}/220</p>
              </div>

              <div className="mt-2">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">I am a</p>
                <div className="flex flex-wrap gap-2">
                  {PERSONAS.map((item) => {
                    const on = form.persona === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setField("persona", item.id)}
                        className={`h-10 px-3.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition ${
                          on ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Public links</p>
                {[
                  ["githubUrl", "code", "GitHub", "https://github.com/username"],
                  ["linkedinUrl", "work", "LinkedIn", "https://linkedin.com/in/username"],
                  ["portfolioUrl", "language", "Portfolio", "https://your-site.com"],
                ].map(([key, icon, label, placeholder]) => (
                  <div key={key} className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-slate-50 px-3">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">{icon}</span>
                    <span className="hidden sm:inline w-20 shrink-0 text-[12px] font-semibold text-slate-500">{label}</span>
                    <input
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 h-12 bg-transparent text-[14px] text-slate-800 outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowPwd(true)}
                    className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold hover:bg-slate-200 flex-1 sm:flex-none"
                  >
                    Change password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      window.location.href = "/login";
                    }}
                    className="h-11 px-4 rounded-full text-red-500 text-[13px] font-semibold hover:bg-red-50 flex-1 sm:flex-none"
                  >
                    Logout
                  </button>
                </div>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="h-11 px-6 rounded-full bg-indigo-600 text-white text-[13px] font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-60 w-full sm:w-auto"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ChangePasswordModal open={showPwd} onClose={() => setShowPwd(false)} />
      {photoMenu && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="profile-fade absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setPhotoMenu(false)} />
          <div className="profile-pop relative w-full max-w-xs overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="px-5 pt-5 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500">Profile photo</p>
              <h3 className="text-lg font-semibold text-slate-900">What do you want to do?</h3>
            </div>
            <button
              type="button"
              onClick={viewCurrentPhoto}
              disabled={!form.avatarDataUrl}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:pl-6 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:pl-5 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
              View photo
            </button>
            <button
              type="button"
              onClick={pickNewPhoto}
              disabled={uploading || avatarLeft <= 0}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[14px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:pl-6 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:pl-5 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[20px]">upload</span>
              Update photo
            </button>
            <button
              type="button"
              onClick={() => setPhotoMenu(false)}
              className="w-full border-t border-slate-100 px-5 py-3.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {viewPhoto && form.avatarDataUrl && (
        <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${viewClosing ? "pointer-events-none" : ""}`}>
          <div
            className={`${viewClosing ? "profile-fade-out" : "profile-fade"} absolute inset-0 bg-slate-900/70 backdrop-blur-sm`}
            onClick={() => closeViewPhoto()}
          />
          <div className={`${viewClosing ? "profile-pop-photo-out" : "profile-pop-photo"} relative max-h-[86vh] max-w-[min(92vw,520px)]`}>
            <img
              src={form.avatarDataUrl}
              alt="Profile photo"
              className="max-h-[86vh] w-full rounded-[28px] object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => closeViewPhoto()}
              className="absolute -right-2 -top-2 w-9 h-9 rounded-full bg-white text-slate-600 shadow-lg grid place-items-center transition-transform duration-200 hover:scale-110 hover:text-slate-900 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <button
              type="button"
              onClick={() => closeViewPhoto(() => pickNewPhoto())}
              className="absolute left-1/2 -bottom-4 -translate-x-1/2 h-10 px-4 rounded-full bg-white text-slate-800 text-[13px] font-semibold shadow-lg inline-flex items-center gap-1.5 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Update photo
            </button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes profileFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes profileFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes profilePop {
          from { opacity: 0; transform: translateY(16px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes profilePopOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(12px) scale(0.96); }
        }
        .profile-fade { animation: profileFade 220ms ease-out; }
        .profile-fade-out { animation: profileFadeOut 240ms ease-in forwards; }
        .profile-pop { animation: profilePop 320ms cubic-bezier(0.22, 1, 0.36, 1); }
        .profile-pop-photo { animation: profilePop 380ms cubic-bezier(0.22, 1, 0.36, 1); }
        .profile-pop-photo-out { animation: profilePopOut 260ms cubic-bezier(0.4, 0, 1, 1) forwards; }
      `}</style>
    </AppLayout>
  );
}
