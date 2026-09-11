import {ApiError, logout} from './api.js';

// Порт CSD-app-admin/src/lib/authError.js: истёкший токен нужно обрабатывать в
// одном месте, иначе каждый экран кабинета будет по-своему решать, что делать
// с 401.
let onSessionExpired = () => {};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler || (() => {});
}

export function handleApiError(err, notify) {
  if (err instanceof ApiError && err.status === 401) {
    logout();
    onSessionExpired('Сессия истекла — войдите снова.');
    return;
  }
  notify?.(err.message || 'Не удалось выполнить запрос.');
}
