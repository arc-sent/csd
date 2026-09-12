import {useCallback, useEffect, useState} from 'react';
import * as api from '../lib/api.js';
import {setSessionExpiredHandler} from '../lib/authError.js';

// Обязательное подтверждение почты (см. account.guard.js.requireVerifiedEmail
// на сервере): статус после входа/регистрации зависит от emailVerified, а не
// всегда 'authenticated'. 'unverified' — отдельное состояние, а не просто
// флаг поверх 'authenticated': им управляет тот же App.jsx-роутинг, что и
// 'unauthenticated'/'checking', и по нему решается, что показать в кабинете —
// сам кабинет или экран ввода кода.
const statusFor = user => (user.emailVerified ? 'authenticated' : 'unverified');

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
        setStatus(statusFor(current));
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
      setStatus(statusFor(current));
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
      setStatus(statusFor(current));
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

  const verifyEmail = useCallback(async code => {
    const current = await api.verifyEmailCode(code);
    setUser(current);
    setStatus(statusFor(current));
    return current;
  }, []);

  // Возвращает результат как есть ({sent}|{retryAfterSeconds}|{alreadyVerified})
  // — обратный отсчёт и текст ошибки рисует сам экран подтверждения, здесь
  // только запрос.
  const resendVerification = useCallback(() => api.resendVerificationCode(), []);

  return {status, user, authError, login, register, logout, verifyEmail, resendVerification};
}
