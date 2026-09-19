import {ApiError, logout} from './api.js';

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
