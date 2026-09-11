import {useCallback, useEffect, useState} from 'react';
import * as api from '../lib/api.js';
import {setSessionExpiredHandler} from '../lib/authError.js';

/**
 * Состояние авторизации покупателя. Порт машины состояний из
 * CSD-app-admin/src/hooks/useAuth.js: 'checking' нужен, чтобы залогиненный
 * пользователь не видел вспышку экрана входа, пока проверяется токен.
 *
 * Вызывать напрямую нельзя — только через AuthProvider, иначе каждый
 * потребитель отправит свой запрос /me.
 */
export function useAuth() {
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    setSessionExpiredHandler(message => {
      setUser(null);
      setStatus('unauthenticated');
      setAuthError(message);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      setStatus('unauthenticated');
      return;
    }
    api
      .me()
      .then(current => {
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => {
        api.logout();
        setStatus('unauthenticated');
      });
  }, []);

  // login/register пробрасывают ошибку дальше (как в админке), чтобы форма
  // сняла спиннер и осталась открытой.
  const login = useCallback(async credentials => {
    setAuthError('');
    try {
      const current = await api.loginAccount(credentials);
      setUser(current);
      setStatus('authenticated');
      return current;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async credentials => {
    setAuthError('');
    try {
      const current = await api.registerAccount(credentials);
      setUser(current);
      setStatus('authenticated');
      return current;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setAuthError('');
    setStatus('unauthenticated');
  }, []);

  return {status, user, authError, login, register, logout};
}
