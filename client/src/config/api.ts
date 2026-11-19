const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const apiUrl = (path: string) => {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export default API_URL;