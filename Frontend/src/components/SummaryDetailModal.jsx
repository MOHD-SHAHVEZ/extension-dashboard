// src/components/SummaryDetailModal.jsx
import React, { useEffect, useState } from "react";
import { getSummary } from "../services/api";

export default function SummaryDetailModal({ open, id, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (!id) {
      setError("Missing id");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);

    getSummary(id)
      .then((res) => setSummary(res))
      .catch((err) => {
        console.error("getSummary error:", err);
        setError(err?.message || "Failed to load summary");
      })
      .finally(() => setLoading(false));
  }, [open, id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-2xl w-full max-w-3xl shadow-xl transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-in"
        style={{ animationFillMode: "forwards" }}
      >
        <div className="p-6">
          <div className="flex justify-between items-start gap-4">
            <h2 className="text-2xl font-bold text-blue-700">Summary</h2>
            <div className="flex gap-2">
              <button onClick={onClose} className="text-gray-500 hover:text-gray-800 cursor-pointer hover:scale-110 transition duration-300">✖</button>
            </div>
          </div>

          <div className="mt-4">
            {loading && <div className="text-center text-gray-500 py-12">Loading...</div>}

            {error && (
              <div className="text-center text-red-600 py-8">
                {error}
                <div className="mt-4">
                  <button onClick={onClose} className=" px-4 py-2 bg-blue-600 text-white rounded">Close</button>
                </div>
              </div>
            )}

            {summary && (
              <div className="prose max-w-none">
                <h1 className="text-3xl font-extrabold text-blue-700">{summary.title}</h1>
                <p className="text-gray-700">{summary.content || summary.excerpt}</p>

                <hr className="my-4" />

                <div className="text-sm text-gray-600">
                  <div className="mb-2"><b>Source:</b>{" "}
                    {summary.sourceUrl ? (
                      <a href={summary.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {summary.sourceUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : "—"}
                  </div>
                  <div className="mb-1"><b>Created:</b> {summary.createdAt || "—"}</div>
                  <div className="mb-1"><b>Owner:</b> {summary.owner || "—"}</div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div />
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded cursor-pointer">Back</button>
                    <a href={summary.sourceUrl || "#"} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded hidden">Open Source</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { transform: translateY(8px) scale(.98); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-modal-in { animation: modalIn 200ms ease-out; }
      `}</style>
    </div>
  );
}
