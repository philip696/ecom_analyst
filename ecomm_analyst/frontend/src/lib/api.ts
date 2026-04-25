/**
 * Axios instance pre-configured to talk to the FastAPI backend.
 * Automatically attaches the JWT Bearer token from localStorage.
 */
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Typed API helpers ─────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", new URLSearchParams({ username: email, password }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  register: (email: string, username: string, password: string) =>
    api.post("/api/auth/register", { email, username, password }),
  me: () => api.get("/api/auth/me"),
};

export const dashboardApi = {
  summary: () => api.get("/api/dashboard/summary"),
  kpiDetail: (kpiType: string) => api.get(`/api/dashboard/kpi-detail/${kpiType}`),
  chartsOverview: () => api.get("/api/dashboard/charts/overview"),
  salesByCountry: () => api.get("/api/dashboard/sales-by-country"),
};

export const productsApi = {
  list: (params?: object) => api.get("/api/products/", { params }),
};

export const salesApi = {
  trends: (days = 30, marketplace?: string) => api.get("/api/sales/analytics/trends", { params: { days, marketplace } }),
  topProducts: (limit = 5, marketplace?: string) => api.get("/api/sales/analytics/top-products", { params: { limit, marketplace } }),
  mostReturned: (limit = 5, marketplace?: string) => api.get("/api/sales/analytics/most-returned", { params: { limit, marketplace } }),
  bundledItems: (limit = 5, marketplace?: string) => api.get("/api/sales/analytics/bundled-items", { params: { limit, marketplace } }),
  bundleAnalytics: (marketplace?: string) => api.get("/api/sales/analytics/bundle-analytics", { params: { marketplace } }),
  competitorPricing: (productId?: number, marketplace?: string) =>
    api.get("/api/sales/analytics/competitor-pricing", {
      params: { ...(productId ? { product_id: productId } : {}), marketplace },
    }),
  productPricingDetail: (productId: number) =>
    api.get(`/api/sales/analytics/product-pricing/${productId}`),
  priceTrends: (marketplace?: string) =>
    api.get("/api/sales/analytics/price-trends", { params: { marketplace } }),
  competitorBreakdown: (marketplace?: string) =>
    api.get("/api/sales/analytics/competitor-breakdown", { params: { marketplace } }),
};

export const engagementApi = {
  trends: (days = 30) => api.get("/api/engagement/analytics/trends", { params: { days } }),
  topViewed: (limit = 5) => api.get("/api/engagement/analytics/top-viewed", { params: { limit } }),
  imageViews: (limit = 5) => api.get("/api/engagement/analytics/image-views", { params: { limit } }),
};

export const commentsApi = {
  topPositive: (limit = 5) => api.get("/api/comments/analytics/top-positive", { params: { limit } }),
  topNegative: (limit = 5) => api.get("/api/comments/analytics/top-negative", { params: { limit } }),
  sentimentSummary: () => api.get("/api/comments/analytics/sentiment-summary"),
  wordFrequency: (sentiment?: string, limit = 20) =>
    api.get("/api/comments/analytics/word-frequency", {
      params: { limit, ...(sentiment ? { sentiment } : {}) },
    }),
  themes: () => api.get("/api/comments/analytics/themes"),
};

export const insightsApi = {
  ask: (segments: string[], question: string) =>
    api.post("/api/insights/ask", { segments, question }),
  history: (limit = 20) => api.get("/api/insights/history", { params: { limit } }),
};