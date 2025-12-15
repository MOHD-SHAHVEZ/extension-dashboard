// src/components/Table.jsx
// Replace or create file at this path

import React from "react"

export default function Table({ columns = [], rows = [] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-100 text-left">
          <tr>
            {columns.map((c, i) => <th key={i} className="px-6 py-3 text-sm font-medium text-gray-700">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-6 py-4 text-gray-500">No data</td></tr>
          ) : rows.map((r, idx) => (
            <tr key={idx} className="border-t">
              {columns.map((c, j) => <td key={j} className="px-6 py-3 text-sm text-gray-700">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
