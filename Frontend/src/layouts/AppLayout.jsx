// src/layouts/AppLayout.jsx
import React, { useState } from "react";
import Sidebar from "../components/sidebar";
import { useAuth } from "../context/AuthContext";

export default function AppLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden p-2 rounded-md hover:bg-blue-700/40"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <div className="text-lg font-semibold">AI Summarizer Dashboard</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-sm">
            <div className="text-gray-200">Signed in as</div>
            <div className="bg-white/10 px-3 py-1 rounded-lg text-white">{user?.username || "Guest"}</div>
          </div>

          <button
            onClick={() => logout()}
            className="bg-white text-blue-800 px-3 py-1 rounded-md font-medium hover:opacity-90"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for md+ */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile slide-in */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative w-64 bg-white h-full shadow-xl p-4">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
