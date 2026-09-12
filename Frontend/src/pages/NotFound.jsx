// src/pages/NotFound.jsx
import React from "react"
import { Link } from "react-router-dom"

export default function NotFound(){
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 text-center w-full max-w-md">
        <h1 className="text-4xl font-bold text-indigo-700 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Page not found.</p>
        <Link to="/dashboard" className="inline-flex items-center justify-center h-11 w-full sm:w-auto bg-indigo-600 text-white px-5 rounded-full text-[13px] font-semibold">Go Home</Link>
      </div>
    </div>
  )
}
