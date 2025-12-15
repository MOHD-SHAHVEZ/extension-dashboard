// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import SummaryCard from "../components/SummaryCard";
import Sidebar from "../components/sidebar";
import { getSummaries, updateSummary } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function Dashboard() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  async function loadSummaries() {
    setLoading(true);
    setError(null);
    try {
      const list = await getSummaries({ page: 1, limit: 100 });
      setSummaries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("getSummaries error", err);
      setError("Failed to load summaries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummaries();
  }, []);

  // Only pinned items to show on dashboard
  const pinned = summaries.filter(s => !!s.pinned);

  // Unpin handler (toggle pinned -> false)
  async function handleUnpin(id) {
    // optimistic remove from UI
    setSummaries(prev => prev.map(x => (String(x.id) === String(id) ? { ...x, pinned: false } : x)));
    try {
      // find original summary to preserve other fields
      const s = summaries.find(x => String(x.id) === String(id));
      if (!s) throw new Error("Summary not found");
      await updateSummary(id, { ...s, pinned: false });
      toast.push("Removed from Dashboard", { type: "success" });
      // refresh to sync with backend (optional)
      await loadSummaries();
    } catch (err) {
      console.error("Unpin error", err);
      toast.push("Failed to unpin", { type: "error" });
      // rollback by reloading
      await loadSummaries();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="p-6 flex-1 max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-blue-700 mb-4">Pinned Summaries</h1>

          {loading && <div className="text-gray-500">Loading...</div>}
          {error && <div className="text-red-600 mb-4">{error}</div>}

          {!loading && !error && (
            <>
              {pinned.length === 0 ? (
                <div className="text-gray-500">No pinned summaries. Pin summaries from the Summaries page to show them here.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinned.map((s) => (
                    <SummaryCard
                      key={s.id}
                      summary={s}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onPin={handleUnpin}   // clicking the pin here will unpin (toggle)
                      onOpen={() => {}}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
