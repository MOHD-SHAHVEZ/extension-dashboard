// src/pages/SummaryDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getSummary } from "../services/api";

export default function SummaryDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("Missing summary id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    getSummary(id)
      .then(res => {
        setItem(res || null);
      })
      .catch(err => {
        console.error("getSummary error:", err);
        setError(err?.message || "Failed to load summary");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="p-6 max-w-3xl mx-auto text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="p-6 max-w-3xl mx-auto text-center text-red-600">
          {error}
          <div className="mt-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="p-6 max-w-3xl mx-auto text-center text-gray-500">Summary not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold text-blue-700 mb-4">{item.title}</h1>
          <p className="text-gray-700 mb-6 whitespace-pre-line">{item.content || item.excerpt}</p>

          <div className="border-t pt-4 text-sm text-gray-600">
            <div className="mb-2">
              <b>Source:</b>{" "}
              {item.sourceUrl ? (
                <a href={item.sourceUrl} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                  {item.sourceUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="mb-1"><b>Created:</b> {item.createdAt || "—"}</div>
            <div className="mb-1"><b>Owner:</b> {item.owner || "—"}</div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-200 rounded">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
