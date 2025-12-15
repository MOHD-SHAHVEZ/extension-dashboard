// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/sidebar";
import Chart from "../components/Chart";
import Table from "../components/Table";
import { getStats, getSummaries } from "../services/api";

/**
 * Admin dashboard page.
 * - If user is not admin (role in localStorage), show centered modal telling them to login as admin.
 * - If admin, load stats + recent summaries.
 */

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalSummaries: 0, today: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false); // show "only admin" popup
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role") || "";
    // Accept either "ADMIN" or "ROLE_ADMIN"
    const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
    if (!isAdmin) {
      // show popup telling user they need to login as admin
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
          getSummaries({ page: 1, limit: 10 })
        ]);
        setStats(statsData || { totalUsers: 0, totalSummaries: 0, today: 0 });
        const sorted = Array.isArray(summaries) ? summaries.slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 5) : [];
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
    { label: "Source URL", key: "sourceUrl" },
    { label: "Time", key: "createdAt" },
  ];

  // Modal shown when non-admin tries to access
  function AdminAuthModal() {
    if (!showAuthModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-3">Access restricted</h3>
          <p className="text-gray-700 mb-6">Only admin can access this page. Please login as an admin to continue.</p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setShowAuthModal(false); navigate("/login"); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Go to Login
            </button>

            <button
              onClick={() => { setShowAuthModal(false); navigate("/dashboard"); }}
              className="px-4 py-2 bg-gray-200 rounded-lg bg-gray-200 hover:cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthModal) {
    // show only layout + modal so top navbar/sidebar still visible (or optionally hide them)
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <div className="p-6 flex-1 max-w-6xl mx-auto">
            <div className="text-red-600">You do not have admin access.</div>
          </div>
        </div>

        <AdminAuthModal />
      </div>
    );
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="p-6 flex-1 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-700 mb-6">Admin Dashboard</h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-3xl font-bold text-blue-700">{stats.totalUsers}</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-sm text-gray-500">Total Summaries</div>
              <div className="text-3xl font-bold text-blue-700">{stats.totalSummaries}</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="text-sm text-gray-500">Summaries (Today)</div>
              <div className="text-3xl font-bold text-blue-700">{stats.today}</div>
            </div>
          </div>

          <div className="mb-6">
            <Chart />
          </div>

          <div>
            <Table columns={cols} rows={recent} />
          </div>
        </div>
      </div>
    </div>
  );
}
