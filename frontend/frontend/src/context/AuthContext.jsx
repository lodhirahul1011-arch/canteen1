import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch {
      try {
        const refresh = await api.post('/auth/refresh');
        setAccessToken(refresh.data.data.accessToken);
        const res = await api.get('/auth/me');
        setUser(res.data.data.user);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, reload: loadUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
