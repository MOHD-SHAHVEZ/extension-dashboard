// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import InstallAppButton from "./InstallAppButton";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "Guest";
  const username = email.split("@")[0] || "Guest";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-white/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-6">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="text-slate-900 font-semibold capitalize">{username}</span>
          <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
          <span className="text-indigo-600 font-medium">Personal Space</span>
        </div>
        
        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
        
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          <span>Extension Live & Synced</span>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <InstallAppButton />
        {/* Search Bar */}
        <div className="relative hidden sm:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
          <input 
            type="text" 
            placeholder="Quick search..." 
            className="h-9 pl-9 pr-12 rounded-full bg-slate-50 text-slate-800 text-[12px] shadow-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all w-48 focus:w-60"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px] font-semibold">⌘K</kbd>
        </div>
        
        {/* Notifications */}
        <button 
          className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="w-8 h-8 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center shadow-md shadow-indigo-600/20"
          title="Open profile"
        >
          {localStorage.getItem("profile_avatar") ? (
            <img src={localStorage.getItem("profile_avatar")} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="h-8 px-4 rounded-full bg-slate-100 text-slate-600 text-[12px] font-semibold hover:bg-red-50 hover:text-red-600 transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
