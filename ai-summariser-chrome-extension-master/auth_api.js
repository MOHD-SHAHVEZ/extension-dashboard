// Auth endpoints

async function apiSignup({ firstName, lastName, email, password }) {
  return apiRequest("/auth/signup", { method: "POST", body: { firstName, lastName, email, password } });
}

async function apiLogin({ email, password }) {
  return apiRequest("/auth/login", { method: "POST", body: { email, password } });
}

async function apiRefresh({ refreshToken }) {
  return apiRequest("/auth/refresh", { method: "POST", body: { refreshToken } });
}


