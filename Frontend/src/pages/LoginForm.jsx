import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function LoginForm({ onNavigate }) {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const creds = { email: form.email, password: form.password };
      const res = await login(creds);
      toast.push(`Welcome ${res.email}`, { type: "success" });
      if (res.role === "ROLE_ADMIN" || res.role === "ADMIN") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      toast.push(err?.message || "Invalid email or password", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="w-full flex flex-col items-center text-center mb-8">
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(79,70,229,0.45)] ring-1 ring-indigo-500/20">
            <span className="material-symbols-outlined text-white text-[26px]">backpack</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-semibold tracking-wide mb-4">
          <span className="text-[12px]">✨</span>
          Welcome back
        </div>

        <h2 className="text-[32px] sm:text-[34px] font-bold tracking-tight text-slate-900 leading-none">
          eBag AI
        </h2>
        <p className="mt-2 text-[13px] font-medium text-slate-500">Notes, plan &amp; AI summaries</p>
      </div>

      <div className="w-full flex flex-col">
        <button className="w-full h-11 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 active:scale-[0.99]" type="button">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" fill="#4285F4"></path>
            <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853"></path>
            <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"></path>
            <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"></path>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-5 flex items-center">
          <div className="w-full h-px bg-slate-200"></div>
          <span className="absolute left-1/2 -translate-x-1/2 px-3 bg-white text-[11px] font-medium tracking-wider uppercase text-slate-400 whitespace-nowrap">
            Or continue with email
          </span>
        </div>

        <form className="w-full space-y-4 text-left" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="emailInput">Work Email</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[19px] pointer-events-none">mail</span>
              <input
                id="emailInput"
                type="email"
                required
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 pl-10 pr-4 bg-white text-slate-800 text-sm rounded-full border border-slate-200 outline-none custom-auth-input transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700" htmlFor="passwordInput">Password</label>
              <a className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors hover:underline" href="#">
                Forgot password?
              </a>
            </div>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[19px] pointer-events-none">lock</span>
              <input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your passkey"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 pl-10 pr-11 bg-white text-slate-800 text-sm rounded-full border border-slate-200 outline-none custom-auth-input transition-all placeholder:text-slate-400 shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[19px]">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none group pt-1">
            <div className="relative flex items-center shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              />
              <div className="w-4 h-4 rounded bg-white peer-checked:bg-indigo-600 border border-slate-300 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[13px] opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
              </div>
            </div>
            <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors font-medium">
              Remember me for 30 days
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="relative w-full h-11 mt-1 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </>
              )}
            </div>
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate() : navigate("/signup"))}
            className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
