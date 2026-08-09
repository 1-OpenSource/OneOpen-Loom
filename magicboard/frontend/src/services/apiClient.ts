import axios from "axios";
import { clearAuthToken, getAuthToken } from "../utils/authToken";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8002";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    // Remove default application/json so the runtime can set multipart boundary.
    const headers = config.headers as { delete?: (name: string) => void; ["Content-Type"]?: unknown };
    if (typeof headers.delete === "function") {
      headers.delete("Content-Type");
    } else {
      delete headers["Content-Type"];
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isAuthRoute = path === "/login" || path === "/register";
      // Only clear session for protected routes — avoid wiping a fresh login
      // when unrelated optional endpoints 401.
      if (!isAuthRoute && !error.config?.url?.includes("/auth/login")) {
        clearAuthToken();
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);
