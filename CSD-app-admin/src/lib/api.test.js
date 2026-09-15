import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function mockResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body
  };
}

describe('api', () => {
  let api;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    globalThis.fetch = vi.fn();
    api = await import('./api.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request()', () => {
    it('attaches Authorization header when a token is stored', async () => {
      localStorage.setItem('chesslab_admin_token', 'tok-123');
      globalThis.fetch.mockResolvedValue(mockResponse(200, { ok: true }));

      await api.request('/whatever');

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer tok-123');
    });

    it('omits Authorization header when there is no token', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { ok: true }));

      await api.request('/whatever');

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });

    it('returns null on a 204 response without reading a body', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(204, null));

      const result = await api.request('/whatever');

      expect(result).toBeNull();
    });

    it('throws ApiError with the server message and status on failure', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(400, { error: 'Неверный код', details: { field: 'code' } }));

      await expect(api.request('/whatever')).rejects.toMatchObject({
        status: 400,
        message: 'Неверный код',
        details: { field: 'code' }
      });
    });

    it('falls back to a generic error message when the server sends none', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(500, {}));

      await expect(api.request('/whatever')).rejects.toMatchObject({
        status: 500,
        message: 'Ошибка запроса к серверу'
      });
    });

    it('tolerates a response with no JSON body at all', async () => {
      globalThis.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => {
          throw new Error('Unexpected end of JSON input');
        }
      });

      await expect(api.request('/whatever')).resolves.toBeNull();
    });
  });

  describe('login()', () => {
    it('stores the returned token and resolves with the admin payload', async () => {
      globalThis.fetch.mockResolvedValue(
        mockResponse(200, { token: 'new-tok', admin: { email: 'admin@chesslab.local' } })
      );

      const admin = await api.login('admin@chesslab.local', 'secret12');

      expect(admin).toEqual({ email: 'admin@chesslab.local' });
      expect(localStorage.getItem('chesslab_admin_token')).toBe('new-tok');
    });

    it('does not store a token when login fails', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(401, { error: 'Неверный email или пароль' }));

      await expect(api.login('admin@chesslab.local', 'wrong')).rejects.toThrow();
      expect(localStorage.getItem('chesslab_admin_token')).toBeNull();
    });
  });

  describe('logout() / isAuthenticated()', () => {
    it('clears the stored token', () => {
      localStorage.setItem('chesslab_admin_token', 'tok-123');
      expect(api.isAuthenticated()).toBe(true);

      api.logout();

      expect(api.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('chesslab_admin_token')).toBeNull();
    });
  });

  describe('account endpoints', () => {
    it('changePassword() PUTs the new password', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { ok: true }));

      await api.changePassword('better-password');

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/auth/password');
      expect(options.method).toBe('PUT');
      expect(JSON.parse(options.body)).toEqual({ newPassword: 'better-password' });
    });

    it('requestEmailChange() posts the new email', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { sent: true }));

      const result = await api.requestEmailChange('new@chesslab.local');

      expect(result).toEqual({ sent: true });
      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/auth/email/request');
      expect(JSON.parse(options.body)).toEqual({ newEmail: 'new@chesslab.local' });
    });

    it('verifyEmailChange() posts the code and unwraps the admin', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { admin: { email: 'new@chesslab.local' } }));

      const admin = await api.verifyEmailChange('123456');

      expect(admin).toEqual({ email: 'new@chesslab.local' });
    });
  });

  describe('password reset endpoints', () => {
    it('requestPasswordReset() posts the email', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { sent: true }));

      await api.requestPasswordReset('admin@chesslab.local');

      const [url, options] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('/auth/password-reset/request');
      expect(JSON.parse(options.body)).toEqual({ email: 'admin@chesslab.local' });
    });

    it('verifyPasswordResetCode() returns the resetToken', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { resetToken: 'reset-tok' }));

      const result = await api.verifyPasswordResetCode('admin@chesslab.local', '654321');

      expect(result).toEqual({ resetToken: 'reset-tok' });
    });

    it('confirmPasswordReset() posts resetToken and newPassword', async () => {
      globalThis.fetch.mockResolvedValue(mockResponse(200, { ok: true }));

      await api.confirmPasswordReset('reset-tok', 'new-password1');

      const [, options] = globalThis.fetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ resetToken: 'reset-tok', newPassword: 'new-password1' });
    });
  });
});
