// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import Chart from "../components/Chart";
import Table from "../components/Table";
import { getStats, getAdminSummaries } from "../services/api";

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalSummaries: 0, today: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role") || "";
    const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
    if (!isAdmin) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, summaries] = await Promise.all([
          getStats(),
          getAdminSummaries({ limit: 10 }),
        ]);
        setStats(statsData || { totalUsers: 0, totalSummaries: 0, today: 0 });
        const sorted = Array.isArray(summaries)
          ? summaries.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 5)
          : [];
        setRecent(sorted);
      } catch (err) {
        console.error("Error fetching admin dashboard data:", err);
        setError("Failed to load admin dashboard data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cols = [
    { label: "User", key: "owner" },
    {
      label: "Source",
      key: "sourceUrl",
      render: (row) => {
        const url = row.sourceUrl || "";
        if (!url) return "—";
        const label = url.startsWith("lesson-ai:") ? "Lesson AI" : url;
        return (
          <span className="block max-w-[180px] sm:max-w-xs truncate" title={url}>
            {label}
          </span>
        );
      },
    },
    {
      label: "Time",
      key: "createdAt",
      render: (row) => formatWhen(row.createdAt),
    },
  ];

  function AdminAuthModal() {
    if (!showAuthModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 sm:p-6 text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-3">Access restricted</h3>
          <p className="text-gray-700 mb-6">Only admin can access this page. Please login as an admin to continue.</p>
          <div className="flex flex-col-reverse sm:flex-row justify-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setShowAuthModal(false);
                navigate("/dashboard");
              }}
              className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 text-[13px] font-semibold w-full sm:w-auto"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowAuthModal(false);
                navigate("/login");
              }}
              className="h-11 px-4 rounded-full bg-indigo-600 text-white text-[13px] font-semibold w-full sm:w-auto"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {showAuthModal && <AdminAuthModal />}

      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="material-symbols-outlined text-white text-[22px]">insights</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analytics & Habits</h1>
            <p className="text-[13px] text-slate-500">Admin overview of users and recent summaries</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-[14px]">Loading admin data…</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-600 text-[14px]">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Users</div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-700 mt-1">{stats.totalUsers}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Summaries</div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-700 mt-1">{stats.totalSummaries}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Summaries today</div>
                <div className="text-2xl sm:text-3xl font-bold text-indigo-700 mt-1">{stats.today}</div>
              </div>
            </div>

            <Chart />

            <div>
              <h2 className="text-[14px] font-semibold text-slate-800 mb-3">Recent summaries</h2>
              <Table columns={cols} rows={recent} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
