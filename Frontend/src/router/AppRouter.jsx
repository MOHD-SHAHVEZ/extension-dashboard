// src/router/AppRouter.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "../pages/AuthPage";
import Dashboard from "../pages/Dashboard";
import SchedulePage from "../pages/SchedulePage";
import TasksPage from "../pages/TasksPage";
import SummariesPage from "../pages/Summaries";
import SummaryDetail from "../pages/SummaryDetail";
import NotFound from "../pages/NotFound";
import AdminDashboard from "../pages/AdminDashboard";
import SettingsPage from "../pages/Settings";
import Unauthorized from "../pages/Unauthorized";
import NotebooksPage from "../pages/NotebooksPage";
import NotebookDetail from "../pages/NotebookDetail";
import PrivateRoute from "../components/PrivateRoute";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
      <Route path="/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
      <Route path="/summaries" element={<PrivateRoute><SummariesPage /></PrivateRoute>} />
      <Route path="/summaries/:id" element={<PrivateRoute><SummaryDetail /></PrivateRoute>} />
      <Route path="/notebooks" element={<PrivateRoute><NotebooksPage /></PrivateRoute>} />
      <Route path="/notebooks/:id" element={<PrivateRoute><NotebookDetail /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/settings" element={<Navigate to="/profile" replace />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={["ROLE_ADMIN", "ADMIN"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
