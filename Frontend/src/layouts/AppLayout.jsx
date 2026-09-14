// src/layouts/AppLayout.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import MobileBottomNav from "../components/MobileBottomNav";
import InstallAppButton from "../components/InstallAppButton";
import BrandMark from "../components/BrandMark";

const MAIN_PATHS = ["/", "/dashboard", "/schedule", "/tasks", "/notebooks", "/summaries", "/admin"];

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMainPage = MAIN_PATHS.includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="md:hidden sticky top-0 z-40 h-14 bg-white/90 backdrop-blur-lg shadow-sm flex items-center justify-between px-4 border-b border-slate-100">
        {isMainPage ? (
          <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white text-[16px]">backpack</span>
            </div>
            <BrandMark compact />
          </Link>
        ) : (
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="text-[13px] font-semibold">Back</span>
          </button>
        )}
        <div className="flex items-center gap-2">
          <InstallAppButton />
          <Link to="/profile" className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center" aria-label="Profile">
          {localStorage.getItem("profile_avatar") ? (
            <img src={localStorage.getItem("profile_avatar")} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="material-symbols-outlined text-white text-[16px]">person</span>
          )}
        </Link>
        </div>
      </div>

      <main className="md:pl-72 md:pt-16 min-h-screen pb-[4.5rem] md:pb-0">
        <div className="w-full px-3 sm:px-6 py-4 sm:py-6">
          {children}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
