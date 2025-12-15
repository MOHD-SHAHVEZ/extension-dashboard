// src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { login as loginApi, register as registerApi } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const username = localStorage.getItem("username");
    const role = localStorage.getItem("role");
    return username ? { username, role } : null;
  });

  async function login(credentials) {
    const res = await loginApi(credentials); // {token, username, role}
    if (!res || !res.token) throw new Error("Invalid login response");
    localStorage.setItem("token", res.token);
    localStorage.setItem("username", res.username);
    localStorage.setItem("role", res.role);
    setUser({ username: res.username, role: res.role });
    return res;
  }

  async function register(credentials) {
    return registerApi(credentials);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
