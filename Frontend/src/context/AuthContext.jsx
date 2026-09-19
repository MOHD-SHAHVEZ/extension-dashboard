// src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from "react";
import { 
  login as loginApi, 
  register as registerApi,
  verifyOtp as verifyOtpApi,
  resendOtp as resendOtpApi,
  updateProfile as updateProfileApi,
  persistAuthSession,
  logout as logoutApi,
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    return email ? { email, role } : null;
  });

  async function login(credentials) {
    const res = await loginApi(credentials); // {token, refreshToken, email, role}
    if (!res || !(res.token || res.accessToken)) throw new Error("Invalid login response");
    persistAuthSession(res);
    setUser({ email: res.email, role: res.role });
    return res;
  }

  async function register(credentials) {
    return registerApi(credentials);
  }

  async function verifyOtp(data) {
    const res = await verifyOtpApi(data);
    if (!res || !(res.token || res.accessToken)) throw new Error("Invalid verification response");
    persistAuthSession(res);
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
    logoutApi();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, verifyOtp, resendOtp, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
