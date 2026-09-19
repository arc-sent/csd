import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api.js';
import { setSessionExpiredHandler } from '../lib/authError.js';

export function useAuth() {
  const [status, setStatus] = useState('checking');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setSessionExpiredHandler(message => {
      setStatus('unauthenticated');
      setLoginError(message || '');
    });
  }, []);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      setStatus('unauthenticated');
      return;
    }
    api.me()
      .then(() => setStatus('authenticated'))
      .catch(() => {
        api.logout();
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (email, password) => {
    setLoginError('');
    try {
      await api.login(email, password);
      setStatus('authenticated');
    } catch (err) {
      setLoginError(err.message || 'Не удалось войти');
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setStatus('unauthenticated');
    setLoginError('');
  }, []);

  return { status, loginError, login, logout };
}
