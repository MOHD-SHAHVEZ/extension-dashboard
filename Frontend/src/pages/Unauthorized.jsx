// src/pages/Unauthorized.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow w-full max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-6">
          You don’t have permission to view this page.
        </p>
        <button
          onClick={() => navigate(localStorage.getItem("token") ? "/dashboard" : "/login")}
          className="h-11 w-full sm:w-auto bg-indigo-600 text-white px-6 rounded-full text-[13px] font-semibold hover:bg-indigo-700"
        >
          {localStorage.getItem("token") ? "Go to Dashboard" : "Go to Login"}
        </button>
      </div>
    </div>
  );
}
