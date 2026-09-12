// src/components/Table.jsx
// Replace or create file at this path

import React from "react"

export default function Table({ columns = [], rows = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead className="bg-slate-50 text-left">
          <tr>
            {columns.map((c, i) => <th key={i} className="px-3 sm:px-6 py-3 text-[12px] sm:text-sm font-semibold text-slate-600 whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-3 sm:px-6 py-8 text-center text-slate-400 text-sm">No data</td></tr>
          ) : rows.map((r, idx) => (
            <tr key={idx} className="border-t border-slate-100">
              {columns.map((c, j) => <td key={j} className="px-3 sm:px-6 py-3 text-[13px] text-slate-700">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
