import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('authError', () => {
  let ApiError;
  let handleApiError;
  let setSessionExpiredHandler;
  let logoutSpy;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('./api.js', () => {
      class MockApiError extends Error {
        constructor(status, message) {
          super(message);
          this.status = status;
        }
      }
      return { ApiError: MockApiError, logout: vi.fn() };
    });

    const apiModule = await import('./api.js');
    ApiError = apiModule.ApiError;
    logoutSpy = apiModule.logout;

    const mod = await import('./authError.js');
    handleApiError = mod.handleApiError;
    setSessionExpiredHandler = mod.setSessionExpiredHandler;
  });

  it('logs out and reports session expiry on a 401 ApiError', () => {
    const notify = vi.fn();
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    handleApiError(new ApiError(401, 'Токен истёк'), notify);

    expect(logoutSpy).toHaveBeenCalled();
    expect(onExpired).toHaveBeenCalledWith('Сессия истекла — войдите снова.');
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not treat a non-401 ApiError as a session expiry', () => {
    const notify = vi.fn();
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    handleApiError(new ApiError(400, 'Неверный код'), notify);

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('Неверный код');
  });

  it('notifies with a generic message when the error carries none', () => {
    const notify = vi.fn();

    handleApiError(new Error(), notify);

    expect(notify).toHaveBeenCalledWith('Ошибка запроса к серверу');
  });
});
