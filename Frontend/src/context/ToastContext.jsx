// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, { type = "info", ttl = 3500 } = {}) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl);
  }, []);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      {/* Toast container */}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              "max-w-sm w-full px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 " +
              (toast.type === "success"
                ? "bg-green-600 text-white"
                : toast.type === "error"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-white") +
              " animate-slideUp"
            }
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm leading-tight">{toast.message}</div>
              <button onClick={() => remove(toast.id)} className="text-white/80 ml-3">✖</button>
            </div>
          </div>
        ))}
      </div>

      {/* small animation style (tailwind utility classes used in markup; add fallback if not using tailwind) */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUp { animation: slideUp 220ms ease; }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
