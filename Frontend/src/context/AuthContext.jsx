// src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { 
  login as loginApi, 
  register as registerApi,
  verifyOtp as verifyOtpApi,
  resendOtp as resendOtpApi,
  updateProfile as updateProfileApi
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    return email ? { email, role } : null;
  });

  async function login(credentials) {
    const res = await loginApi(credentials); // {token, email, role}
    if (!res || !res.token) throw new Error("Invalid login response");
    localStorage.setItem("token", res.token);
    localStorage.setItem("email", res.email);
    localStorage.setItem("role", res.role);
    setUser({ email: res.email, role: res.role });
    return res;
  }

  async function register(credentials) {
    return registerApi(credentials);
  }

  async function verifyOtp(data) {
    const res = await verifyOtpApi(data);
    if (!res || !res.token) throw new Error("Invalid verification response");
    localStorage.setItem("token", res.token);
    localStorage.setItem("email", res.email);
    localStorage.setItem("role", res.role);
    setUser({ email: res.email, role: res.role });
    return res;
  }

  async function resendOtp(data) {
    return resendOtpApi(data);
  }

  async function updateProfile(data) {
    return updateProfileApi(data);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, verifyOtp, resendOtp, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
