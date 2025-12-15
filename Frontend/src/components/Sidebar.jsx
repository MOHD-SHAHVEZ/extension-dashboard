// src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const NavItem = ({ to, icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium
       ${isActive ? "bg-blue-600 text-white shadow-lg" : "text-gray-700 hover:bg-gray-100"}`
    }
  >
    <span className="w-6 h-6 flex items-center justify-center text-lg">{icon}</span>
    <span>{children}</span>
  </NavLink>
);

export default function Sidebar({ collapsed = false }) {
  return (
    <aside
      className={`bg-white border-r border-gray-200 p-4 min-h-screen w-64 ${collapsed ? "hidden md:block" : ""}`}
    >
      <div className="mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            AI
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Dashboard</h1>
            <p className="text-xs text-gray-500">Summaries App</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2">
        <NavItem to="/dashboard" icon="🏠">Dashboard</NavItem>
        <NavItem to="/summaries" icon="📄">Summaries</NavItem>
        <NavItem to="/admin" icon="🛡️">Admin</NavItem>
        <NavItem to="/settings" icon="⚙️">Settings</NavItem>
      </nav>

      <div className="mt-8 pt-4 border-t border-gray-100 text-sm text-gray-600">
        <div className="px-2">
          <p className="mb-1">Quick Links</p>
          <a className="block text-blue-600 hover:underline" href="#help">Help & Docs</a>
        </div>
      </div>
    </aside>
  );
}
