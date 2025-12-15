// src/pages/Admin.jsx
import React, { useEffect, useState } from "react";
import { getAdminStats } from "../services/api";

export default function Admin() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }

    getAdminStats(token)
      .then((res) => {
        setStats(res);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch admin stats");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-100 rounded-lg text-center shadow">
          <h3 className="text-xl font-bold text-blue-800">Total Summaries</h3>
          <p className="text-2xl font-semibold mt-2">{stats.totalSummaries ?? 0}</p>
        </div>
        <div className="p-6 bg-green-100 rounded-lg text-center shadow">
          <h3 className="text-xl font-bold text-green-800">Total Users</h3>
          <p className="text-2xl font-semibold mt-2">{stats.totalUsers ?? 0}</p>
        </div>
        <div className="p-6 bg-yellow-100 rounded-lg text-center shadow">
          <h3 className="text-xl font-bold text-yellow-800">Pinned Summaries</h3>
          <p className="text-2xl font-semibold mt-2">{stats.pinnedSummaries ?? 0}</p>
        </div>
      </div>
    </div>
  );
}
