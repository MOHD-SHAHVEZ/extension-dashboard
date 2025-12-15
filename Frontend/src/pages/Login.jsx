// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "", admin: false });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const creds = {
        username: form.username,
        password: form.password,
      };

      const res = await login(creds); // returns { token, username, role }
      toast.push(`Welcome ${res.username}`, { type: "success" });

      // ✅ redirect by role
      if (form.admin || res.role === "ROLE_ADMIN") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      toast.push("Invalid username or password", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 h-14 bg-linear-to-r from-cyan-500 to-blue-500">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md hover:scale-110 transition-all transform duration-300">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            required
          />

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.admin}
              onChange={(e) => setForm({ ...form, admin: e.target.checked })}
            />
            <span className="text-sm text-gray-600">Sign in as Admin</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
