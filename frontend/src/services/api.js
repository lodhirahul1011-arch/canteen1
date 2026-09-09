import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 10000
});

let accessToken = localStorage.getItem('canteen_access_token');

export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('canteen_access_token', token);
  else localStorage.removeItem('canteen_access_token');
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      try {
        const response = await api.post('/auth/refresh');
        setAccessToken(response.data.data.accessToken);
        original.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
