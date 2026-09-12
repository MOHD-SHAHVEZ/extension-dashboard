import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const TABS = [
  { path: "/dashboard", icon: "dashboard", label: "Home" },
  { path: "/schedule", icon: "calendar_today", label: "Plan" },
  { path: "/tasks", icon: "check_circle", label: "Tasks" },
  { path: "/notebooks", icon: "menu_book", label: "Notes" },
  { path: "/summaries", icon: "auto_awesome", label: "AI" },
  { path: "/admin", icon: "insights", label: "Stats", adminOnly: true },
];

function isTabActive(pathname, path) {
  if (path === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (path === "/notebooks") return pathname.startsWith("/notebooks");
  if (path === "/summaries") return pathname.startsWith("/summaries");
  return pathname === path;
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const role = localStorage.getItem("role") || "";
  const isAdmin = role === "ROLE_ADMIN" || role === "ADMIN";
  const tabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]"
      style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.path);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
                active ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] leading-none ${active ? "font-bold" : "font-semibold"}`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
