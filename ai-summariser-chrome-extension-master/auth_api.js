// Auth endpoints

async function apiSignup({ firstName, lastName, email, password }) {
  return apiRequest("/auth/signup", { method: "POST", body: { firstName, lastName, email, password } });
}

async function apiLogin({ email, password }) {
  return apiRequest("/auth/login", { method: "POST", body: { email, password } });
}

async function apiRefresh({ refreshToken, token }) {
  return apiRequest("/api/auth/refresh", {
    method: "POST",
    body: refreshToken ? { refreshToken } : { token },
  });
}


