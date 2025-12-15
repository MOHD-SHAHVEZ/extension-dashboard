// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-blue-700 text-white shadow">
      <div className="font-bold text-lg">AI Summarizer Dashboard</div>
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {localStorage.getItem("username") || "Guest"}
        </span>
        <button
          onClick={handleLogout}
          className="bg-white text-blue-700 font-semibold px-4 py-1 rounded-md hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
