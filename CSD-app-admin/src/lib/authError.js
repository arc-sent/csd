import { ApiError, logout } from './api.js';

let onSessionExpired = () => {};

export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

export function handleApiError(err, notify) {
  if (err instanceof ApiError && err.status === 401) {
    logout();
    onSessionExpired('Сессия истекла — войдите снова.');
    return;
  }
  notify((err && err.message) || 'Ошибка запроса к серверу');
}
