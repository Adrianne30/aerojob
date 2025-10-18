import axios from "axios";

/* -------------------- BASE URL -------------------- */
const API_BASE_RESOLVED =
  import.meta?.env?.VITE_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.aerojob.space";

const API_ROOT = `${API_BASE_RESOLVED.replace(/\/+$/, "")}/api`;

export { API_BASE_RESOLVED as API_BASE, API_ROOT };

/* -------------------- AXIOS INSTANCES -------------------- */
export const http = axios.create({
  baseURL: API_ROOT,
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

export const httpRaw = axios.create({
  baseURL: API_BASE_RESOLVED,
  withCredentials: false,
});

/* -------------------- AUTH TOKEN HELPER -------------------- */
export function setAuthToken(token) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    httpRaw.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
    delete httpRaw.defaults.headers.common.Authorization;
  }
}

/* -------------------- REQUEST + RESPONSE INTERCEPTORS -------------------- */
http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token && !cfg.headers.Authorization) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message =
      data?.message || data?.error || error?.message || `HTTP ${status || "ERR"}`;
    error.normalizedMessage = message;
    return Promise.reject(error);
  }
);

/* -------------------- HELPERS -------------------- */
const unwrap = (p) =>
  p.then((r) => r.data).catch((e) => {
    throw new Error(e.normalizedMessage || e.message || "Request failed");
  });

export function absoluteUrl(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : `${API_BASE_RESOLVED}${path}`;
}

export function normalizeWebsite(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* -------------------- API WRAPPERS -------------------- */
export const healthAPI = { ping: () => unwrap(http.get("/health")) };

export const authAPI = {
  login: (credentials) => unwrap(http.post("/auth/login", credentials)),
  register: (payload) => unwrap(http.post("/auth/register", payload)),
  verifyOTP: ({ email, otp }) => unwrap(http.post("/auth/verify-otp", { email, otp })),
  resendOTP: ({ email }) => unwrap(http.post("/auth/resend-otp", { email })),
  forgotPassword: ({ email }) => unwrap(http.post("/auth/forgot-password", { email })),
  resetPassword: ({ email, token, password }) =>
    unwrap(http.post("/auth/reset-password", { email, token, password })),
  me: () => unwrap(http.get("/auth/me")),
  logout: () => unwrap(http.post("/auth/logout")),
};

export const jobsAPI = {
  list: (params = {}) => unwrap(http.get("/jobs", { params })),
  get: (id) => unwrap(http.get(`/jobs/${id}`)),
  create: (payload) => unwrap(http.post("/jobs", payload)),
  update: (id, payload) => unwrap(http.put(`/jobs/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/jobs/${id}`)),
  listCategories: () => unwrap(http.get("/jobs/categories")),
};
jobsAPI.getAll = jobsAPI.list;

export const companiesAPI = {
  list: (params = {}) => unwrap(http.get("/companies", { params })),
  get: (id) => unwrap(http.get(`/companies/${id}`)),
  create: (payload) => unwrap(http.post("/companies", payload)),
  update: (id, payload) => unwrap(http.put(`/companies/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/companies/${id}`)),
};
companiesAPI.getAll = companiesAPI.list;

export const uploadsAPI = {
  async uploadCompanyLogo(file) {
    const formData = new FormData();
    formData.append("logo", file);
    const data = await unwrap(
      httpRaw.post("/upload/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
    return data?.url;
  },
};

export const usersAPI = {
  list: (params = {}) => unwrap(http.get("/admin/users", { params })),
  get: (id) => unwrap(http.get(`/admin/users/${id}`)),
  create: (payload) => unwrap(http.post("/admin/users", payload)),
  update: (id, payload) => unwrap(http.put(`/admin/users/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/admin/users/${id}`)),
};
usersAPI.getAll = usersAPI.list;

export const surveysAPI = {
  list: (params = {}) => unwrap(http.get("/surveys", { params })),
  get: (id) => unwrap(http.get(`/surveys/${id}`)),
  create: (payload) => unwrap(http.post("/surveys", payload)),
  update: (id, payload) => unwrap(http.put(`/surveys/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/surveys/${id}`)),
  listResponses: (surveyId, params = {}) =>
    unwrap(http.get(`/surveys/${surveyId}/responses`, { params })),
  deleteResponse: (surveyId, responseId) =>
    unwrap(http.delete(`/surveys/${surveyId}/responses/${responseId}`)),
  exportCSV: (surveyId) =>
    http.get(`/surveys/${surveyId}/responses/export`, { responseType: "blob" }),
  forMe: (params = {}) => unwrap(http.get("/surveys/active/eligible", { params })),
  submitResponse: (surveyId, payload) =>
    unwrap(http.post(`/surveys/${surveyId}/responses`, payload)),
};

export const profileAPI = {
  getMe: () => unwrap(http.get("/profile/me")),
  updateMe: (data) => unwrap(http.put("/profile/me", data)),
};

export const adminAPI = { getStats: () => unwrap(http.get("/admin/stats")) };

export const analyticsAPI = {
  logSearch: (term) => http.post("/analytics/search", { term }).catch(() => {}),
};

export function logApiBase() {
  console.log("[API] Base URL:", API_BASE_RESOLVED, "Root:", API_ROOT);
}

export default http;
