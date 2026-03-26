// src/router/AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import SummariesPage from "../pages/Summaries";
import SummaryDetail from "../pages/SummaryDetail";   // ⭐ ADD THIS
import NotFound from "../pages/NotFound";
import AdminDashboard from "../pages/AdminDashboard";
import SettingsPage from "../pages/Settings";

export default function AppRouter() {
  return (
    <Routes>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* User Dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Summaries List */}
      <Route path="/summaries" element={<SummariesPage />} />

      {/* ⭐ Summary Read Page (Fix for 404) */}
      <Route path="/summaries/:id" element={<SummaryDetail />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Setting. */}
      <Route path="/settings" element={<SettingsPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}
