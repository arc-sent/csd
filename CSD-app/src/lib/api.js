// Клиент к API ChessSchoolDinamik для публичного сайта: витрина тарифов, оплата и
// личный кабинет покупателя.
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Ключ намеренно отличается от 'chesslab_admin_token' в CSD-app-admin: в деве оба
// приложения могут жить на одном origin и затирали бы токены друг друга.
const TOKEN_KEY = 'chesslab_user_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = token => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = () => Boolean(getToken());
export const logout = () => clearToken();

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || null;
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { ...options, headers });

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    // тело могло быть пустым
  }

  if (!res.ok) {
    throw new ApiError(res.status, (body && body.error) || 'Ошибка запроса к серверу', body && body.details);
  }
  return body;
}

// ---------- Витрина (без авторизации) ----------

export function fetchPublicStages() {
  return request('/public/stages');
}

// ---------- Аккаунт ----------

export async function registerAccount({ email, password, name }) {
  const result = await request('/account/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  });
  setToken(result.token);
  return result.user;
}

export async function loginAccount({ email, password }) {
  const result = await request('/account/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setToken(result.token);
  return result.user;
}

export async function me() {
  return (await request('/account/me')).user;
}

// ---------- Подтверждение email (мягкий режим — не блокирует кабинет) ----------

export async function verifyEmailCode(code) {
  return (await request('/email-verification/verify', {
    method: 'POST',
    body: JSON.stringify({ code })
  })).user;
}

export function resendVerificationCode() {
  return request('/email-verification/resend', { method: 'POST' });
}

// ---------- Восстановление пароля (публичное, без токена) ----------

export function requestPasswordReset(email) {
  return request('/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

// Возвращает {resetToken} — код проверяется и гасится сразу здесь, дальше
// пароль меняется по токену, а не по коду повторно.
export function verifyPasswordResetCode({ email, code }) {
  return request('/password-reset/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
}

export function confirmPasswordReset({ resetToken, newPassword }) {
  return request('/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ resetToken, newPassword })
  });
}

// ---------- Кабинет ----------

export async function fetchMyAssignments() {
  return (await request('/account/assignments')).assignments;
}

export function fetchDashboard() {
  return request('/account/dashboard');
}

export function fetchAssignmentLevels(assignmentId) {
  return request(`/account/assignments/${assignmentId}/levels`);
}

export function fetchLevel(levelId) {
  return request(`/account/levels/${levelId}`);
}

export async function markLevelSolved(levelId, { usedSolution = false } = {}) {
  const result = await request(`/account/levels/${levelId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ event: 'solved', usedSolution })
  });
  return result.progress;
}

// Неверный ход. Из этих отметок считается точность в кабинете, поэтому ошибка
// отправки не должна мешать решать задачу — вызывающий код её глушит.
export function markLevelMistake(levelId) {
  return request(`/account/levels/${levelId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ event: 'mistake' })
  });
}

// Часовой пояс нужен серверу, чтобы считать серию по местным дням.
export function saveTimeZone(timeZone) {
  return request('/account/timezone', { method: 'PUT', body: JSON.stringify({ timeZone }) });
}

export function markAchievementsSeen() {
  return request('/account/achievements/seen', { method: 'POST' });
}

// ---------- Оплата ----------
// email не передаётся: сервер берёт почту для чека из аккаунта покупателя.

// Ровно один из двух параметров — оплата задания или этапа целиком
// (см. CSD-server/src/modules/payments/payments.validation.js).
export function createPayment({ assignmentId, stageId }) {
  return request('/payments/create', {
    method: 'POST',
    body: JSON.stringify({ assignmentId, stageId })
  });
}
