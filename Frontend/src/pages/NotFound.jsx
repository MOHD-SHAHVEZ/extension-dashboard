// src/pages/NotFound.jsx
import React from "react"
import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"

export default function NotFound(){
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-10 text-center w-full max-w-md">
          <h1 className="text-4xl font-bold text-blue-700 mb-4">404</h1>
          <p className="text-gray-600 mb-6">Page not found.</p>
          <Link to="/" className="inline-block bg-blue-700 text-white px-4 py-2 rounded-md">Go Home</Link>
        </div>
      </div>
    </div>
  )
}
