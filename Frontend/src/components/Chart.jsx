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
    <div className="bg-blue-700 text-white rounded-lg p-4 shadow">
      <h3 className="text-lg font-semibold mb-2">Summary Statistics</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="name" stroke="#cfe8ff" />
            <YAxis stroke="#cfe8ff" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
