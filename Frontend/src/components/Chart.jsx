// src/components/Chart.jsx
// Replace or create file at this path

import React from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const sampleData = [
  { name: "Mon", value: 3 },
  { name: "Tue", value: 5 },
  { name: "Wed", value: 4 },
  { name: "Thu", value: 6 },
  { name: "Fri", value: 5 },
  { name: "Sat", value: 7 },
  { name: "Sun", value: 6 },
]

export default function Chart({ data = sampleData }) {
  return (
    <div className="bg-indigo-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
      <h3 className="text-[15px] sm:text-lg font-semibold mb-2">Summary Statistics</h3>
      <div className="h-40 sm:h-48 -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#cfe8ff" tick={{ fontSize: 11 }} />
            <YAxis stroke="#cfe8ff" tick={{ fontSize: 11 }} width={28} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#e0e7ff" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
