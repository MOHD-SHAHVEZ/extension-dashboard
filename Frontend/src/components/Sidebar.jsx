// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { path: "/dashboard", icon: "dashboard", label: "Overview" },
  { path: "/schedule", icon: "calendar_today", label: "Daily Schedule", badge: "New" },
  { path: "/tasks", icon: "check_circle", label: "Tasks & To-Do", badge: "New" },
  { path: "/notebooks", icon: "menu_book", label: "My Notebooks", badge: "New" },
  { path: "/summaries", icon: "auto_awesome", label: "AI Summaries & Notes" },
  { path: "/admin", icon: "insights", label: "Analytics & Habits" },
  { path: "/profile", icon: "person", label: "Profile" },
];

export default function Sidebar({ onNavigate }) {
  const location = useLocation();
  const role = localStorage.getItem("role") || "";
  const isAdmin = role === "ROLE_ADMIN" || role === "ADMIN";
  const items = navItems.filter((item) => item.path !== "/admin" || isAdmin);

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="material-symbols-outlined text-white text-[20px]">smart_toy</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] text-slate-900 tracking-tight leading-tight">AI Summarizer</span>
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider">COCKPIT v2.4</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 py-4">
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path
                || (item.path === "/dashboard" && location.pathname === "/")
                || (item.path === "/notebooks" && location.pathname.startsWith("/notebooks"));
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => onNavigate && onNavigate()}
                  className={`flex items-center justify-between px-4 py-3 rounded-full transition-all duration-200 group ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/15"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}>
                      {item.icon}
                    </span>
                    <span className="text-[14px]">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-teal-400 text-white"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-3 flex flex-col gap-2 bg-slate-50/80 border-t border-slate-100">
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-indigo-600 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          <span className="text-[11px] font-bold tracking-wide">Interview Demo Mode: Active</span>
        </div>
        
        {/* Quick Links */}
        <NavLink
          to="/profile"
          onClick={() => onNavigate && onNavigate()}
          className="flex items-center justify-between px-4 py-2 rounded-full text-slate-400 hover:bg-white hover:text-slate-700 transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
            <span className="text-[12px] font-semibold">Account & profile</span>
          </div>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </NavLink>
      </div>
    </aside>
  );
}
