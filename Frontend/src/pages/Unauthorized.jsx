// src/pages/Unauthorized.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-6">
          You don’t have permission to view this page.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-700 text-white px-6 py-2 rounded-md hover:bg-blue-800"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
