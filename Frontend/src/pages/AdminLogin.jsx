// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, redirect
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "ROLE_ADMIN" || role === "ADMIN") {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form); // AuthContext.login should store token & role
      const role = localStorage.getItem("role");
      if (role === "ROLE_ADMIN" || role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        // not admin — clear storage and show message
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        setError("Access denied. Use admin credentials.");
      }
    } catch (err) {
      console.error("admin login error:", err);
      setError("Invalid credentials or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Admin Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Admin username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-2 rounded-md font-semibold disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in as Admin"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Use <b>admin/admin</b> (or your admin credentials).
        </p>
      </div>
    </div>
  );
}
