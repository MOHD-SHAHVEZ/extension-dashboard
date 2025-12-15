// src/components/SummaryCard.jsx
import React from "react";

export default function SummaryCard({ summary, onEdit, onDelete, onPin, onOpen }) {
  if (!summary) return null;
  const { id, title, excerpt, sourceUrl, createdAt, owner, pinned } = summary;

  // stop propagation when clicking inner buttons
  function stop(e) {
    e.stopPropagation();
  }

  return (
    <div
      onClick={() => onOpen && onOpen(id)}
      className="bg-white rounded-xl shadow-sm border overflow-hidden transform transition hover:-translate-y-1 hover:shadow-lg duration-200 cursor-pointer"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold flex items-center gap-3">
            <span>{title || "Untitled"}</span>
            {pinned && (
              <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded-full">Pinned</span>
            )}
          </h3>
          <p className="text-sm opacity-90 mt-2 line-clamp-3">{excerpt || "No excerpt"}</p>
        </div>

        <div className="flex flex-col gap-2 items-center">
          {/* Pin Button */}
          <button
            title={pinned ? "Unpin" : "Pin"}
            onClick={(e) => { stop(e); onPin && onPin(id); }}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
          >
            {pinned ? "📌" : "📍"}
          </button>

          {/* Edit Button */}
          <button
            title="Edit"
            onClick={(e) => { stop(e); onEdit && onEdit(summary); }}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
          >
            ✏️
          </button>

          {/* Delete Button */}
          <button
            title="Delete"
            onClick={(e) => { stop(e); onDelete && onDelete(id); }}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="p-4 text-sm text-gray-700">
        <div className="mb-2">
          <span className="font-medium text-gray-800">Source:</span>{" "}
          {sourceUrl ? (
            <a
              className="text-blue-600 hover:underline"
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {sourceUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            <span className="opacity-70">—</span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          Created: {createdAt || "—"} • Owner: <span className="text-blue-600">{owner || "—"}</span>
        </div>
      </div>
    </div>
  );
}
