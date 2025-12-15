// src/Pages/Settings.jsx
import React, { useEffect, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { useToast } from "../context/ToastContext";
import { getProfile as apiGetProfile, updateProfile as apiUpdateProfile } from "../services/api";

/**
 * Settings page with Beta badge & prototype note
 * Replace your existing file with this code.
 */

export default function SettingsPage() {
  const toast = useToast();

  // profile state
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState({
    username: localStorage.getItem("username") || "",
    name: "",
    avatarDataUrl: "",
  });

  // form states
  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  // modals / toggles
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // preferences
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("pref_dark") === "1");
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem("pref_email") !== "0");

  useEffect(() => {
    async function loadProfile() {
      setLoadingProfile(true);
      try {
        if (typeof apiGetProfile === "function") {
          const p = await apiGetProfile();
          setProfile({
            username: p.username || localStorage.getItem("username") || "",
            name: p.name || "",
            avatarDataUrl: p.avatarDataUrl || p.avatarUrl || localStorage.getItem("profile_avatar") || "",
          });
          setName(p.name || "");
          setAvatarPreview(p.avatarDataUrl || p.avatarUrl || localStorage.getItem("profile_avatar") || "");
        } else {
          setProfile({
            username: localStorage.getItem("username") || "",
            name: localStorage.getItem("profile_name") || "",
            avatarDataUrl: localStorage.getItem("profile_avatar") || "",
          });
          setName(localStorage.getItem("profile_name") || "");
          setAvatarPreview(localStorage.getItem("profile_avatar") || "");
        }
      } catch (err) {
        console.error("loadProfile error", err);
        toast.push("Failed to load profile (using local data)", { type: "warning" });
        setProfile({
          username: localStorage.getItem("username") || "",
          name: localStorage.getItem("profile_name") || "",
          avatarDataUrl: localStorage.getItem("profile_avatar") || "",
        });
        setName(localStorage.getItem("profile_name") || "");
        setAvatarPreview(localStorage.getItem("profile_avatar") || "");
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  // handle avatar file -> preview DataURL
  function onAvatarChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.push("Please select an image file", { type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setAvatarFile(f);
    };
    reader.readAsDataURL(f);
  }

  // Save profile: try API updateProfile, else store to localStorage
  async function saveProfile() {
    setSavingProfile(true);
    try {
      const payload = {
        username: profile.username,
        name: name,
        avatarDataUrl: avatarPreview || "",
      };

      if (typeof apiUpdateProfile === "function") {
        await apiUpdateProfile(payload);
        toast.push("Profile updated", { type: "success" });
      } else {
        localStorage.setItem("profile_name", name);
        localStorage.setItem("profile_avatar", avatarPreview || "");
        toast.push("Profile saved locally (prototype)", { type: "success" });
      }

      setProfile(prev => ({ ...prev, name, avatarDataUrl: avatarPreview || "" }));
      if (profile.username) localStorage.setItem("username", profile.username);

    } catch (err) {
      console.error("saveProfile error", err);
      const msg = err?.body?.message || err?.message || "Failed to save profile";
      toast.push(msg, { type: "error" });
    } finally {
      setSavingProfile(false);
    }
  }

  // Logout quick helper
  function doLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  // preferences toggles
  function toggleDark(v) {
    setDarkMode(v);
    localStorage.setItem("pref_dark", v ? "1" : "0");
    if (v) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    toast.push("Theme updated", { type: "success" });
  }
  function toggleEmail(v) {
    setEmailNotif(v);
    localStorage.setItem("pref_email", v ? "1" : "0");
    toast.push("Preference saved", { type: "success" });
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Heading row with Beta pill */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-blue-700">Settings</h1>
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              Beta
            </span>
          </div>

          {/* small prototype notice card */}
          <div className="bg-yellow-50 border border-yellow-100 text-yellow-900 px-4 py-2 rounded-md text-sm">
            Prototype / Work-in-progress — kuch features abhi development me hain. Improvements aayengi.
          </div>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">Account</h2>
              <p className="text-gray-600 mb-4">Manage your profile and password. (Beta)</p>
            </div>
            <div className="text-xs text-gray-400">Prototype v0.9</div>
          </div>

          <div className="md:flex md:items-center md:gap-6 mt-4">
            <div className="w-28 h-28 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-400">No avatar</div>
              )}
            </div>

            <div className="flex-1 mt-4 md:mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Username</label>
                  <input
                    type="text"
                    value={profile.username}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 bg-gray-100 rounded-lg cursor-pointer">
                  <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
                  <span className="text-sm text-gray-700">Upload avatar</span>
                </label>

                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>

                <button onClick={() => setShowChangePwd(true)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                  Change Password
                </button>

                <button onClick={doLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg ml-auto">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PREFERENCES */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">Preferences</h2>
              <p className="text-gray-600 mb-4">Customize your experience.</p>
            </div>
            <div className="text-sm text-gray-400">Saved locally (prototype)</div>
          </div>

          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Dark mode</div>
                <div className="text-xs text-gray-400">Toggle interface theme</div>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => toggleDark(e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email notifications</div>
                <div className="text-xs text-gray-400">Receive notifications by email</div>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => toggleEmail(e.target.checked)}
              />
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal open={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </AppLayout>
  );
}
