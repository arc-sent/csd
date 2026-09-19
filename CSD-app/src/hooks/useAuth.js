import {useCallback, useEffect, useState} from 'react';
import * as api from '../lib/api.js';
import {setSessionExpiredHandler} from '../lib/authError.js';

const statusFor = user => (user.emailVerified ? 'authenticated' : 'unverified');

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

  const resendVerification = useCallback(() => api.resendVerificationCode(), []);

  return {status, user, authError, login, register, logout, verifyEmail, resendVerification};
}
