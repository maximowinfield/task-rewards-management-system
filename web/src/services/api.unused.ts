import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ✅ the shared axios instance used everywhere
export const api = axios.create({
  baseURL: API_BASE,
});

// Optional but recommended: always attach token (mobile-safe)
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("kidsrewards.auth.v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.parentToken;
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

export function setApiToken(token?: string) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}
