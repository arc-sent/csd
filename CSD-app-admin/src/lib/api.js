const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'chesslab_admin_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (body && body.error) || 'Ошибка запроса к серверу',
      body && body.details
    );
  }
  return body;
}

export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setToken(result.token);
  return result.admin;
}

export async function me() {
  return (await request('/auth/me')).admin;
}

export function logout() {
  clearToken();
}

export function changePassword(newPassword) {
  return request('/auth/password', { method: 'PUT', body: JSON.stringify({ newPassword }) });
}

export function requestEmailChange(newEmail) {
  return request('/auth/email/request', { method: 'POST', body: JSON.stringify({ newEmail }) });
}

export async function verifyEmailChange(code) {
  return (await request('/auth/email/verify', { method: 'POST', body: JSON.stringify({ code }) })).admin;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function requestPasswordReset(email) {
  return request('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
}

export function verifyPasswordResetCode(email, code) {
  return request('/auth/password-reset/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
}

export function confirmPasswordReset(resetToken, newPassword) {
  return request('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ resetToken, newPassword }) });
}
