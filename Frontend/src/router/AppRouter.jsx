// src/router/AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../Pages/Login";
import Signup from "../Pages/Signup";
import Dashboard from "../Pages/Dashboard";
import SummariesPage from "../Pages/Summaries";
import SummaryDetail from "../Pages/SummaryDetail";   // ⭐ ADD THIS
import NotFound from "../Pages/NotFound";
import AdminDashboard from "../Pages/AdminDashboard";
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
