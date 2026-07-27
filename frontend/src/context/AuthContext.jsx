import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { primeCsrf } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await primeCsrf();
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (fullName, email, password) => {
    await api.post('/auth/register', { fullName, email, password });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
