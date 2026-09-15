import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', async () => {
  class MockApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError: MockApiError,
    me: vi.fn(),
    changePassword: vi.fn(),
    requestEmailChange: vi.fn(),
    verifyEmailChange: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(() => true)
  };
});

import * as api from '../lib/api.js';
import ProfileView from './ProfileView.jsx';

describe('ProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.me.mockResolvedValue({ email: 'admin@chesslab.local' });
  });

  it('loads and displays the current email on mount', async () => {
    render(<ProfileView notify={vi.fn()} />);

    expect(await screen.findByText('Текущий email: admin@chesslab.local')).toBeInTheDocument();
  });

  it('requires both the new email and the new password fields', async () => {
    const user = userEvent.setup();
    render(<ProfileView notify={vi.fn()} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(api.changePassword).not.toHaveBeenCalled();
    expect(api.requestEmailChange).not.toHaveBeenCalled();
  });

  it('saves both password and email in one submit, then notifies', async () => {
    const user = userEvent.setup();
    const notify = vi.fn();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: true });

    render(<ProfileView notify={notify} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith('brand-new-pass'));
    expect(api.requestEmailChange).toHaveBeenCalledWith('new@chesslab.local');
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Пароль изменён.'));
  });

  it('moves to the code step and shows the server notice after requesting an email change', async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: true });

    render(<ProfileView notify={vi.fn()} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Код отправлен на new@chesslab.local.')).toBeInTheDocument();
    expect(screen.getByLabelText('Код из письма')).toBeInTheDocument();
  });

  it('shows the retry notice instead of an error when a code was already sent recently', async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: false, retryAfterSeconds: 42 });

    render(<ProfileView notify={vi.fn()} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Код уже отправлен — попробуйте снова через 42 с, либо введите код из предыдущего письма.')
    ).toBeInTheDocument();
  });

  it('verifies the emailed code and returns to the form with the new email shown', async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: true });
    api.verifyEmailChange.mockResolvedValue({ email: 'new@chesslab.local' });
    const notify = vi.fn();

    render(<ProfileView notify={notify} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    const codeInput = await screen.findByLabelText('Код из письма');
    await user.type(codeInput, '654321');
    await user.click(screen.getByRole('button', { name: 'Подтвердить код' }));

    await waitFor(() => expect(api.verifyEmailChange).toHaveBeenCalledWith('654321'));
    expect(await screen.findByText('Текущий email: new@chesslab.local')).toBeInTheDocument();
    expect(notify).toHaveBeenCalledWith('Email изменён.');
  });

  it('lets the user cancel out of the code step back to the form', async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: true });

    render(<ProfileView notify={vi.fn()} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    await screen.findByLabelText('Код из письма');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.getByLabelText('Новый email')).toBeInTheDocument();
  });

  it('handles a 401 while verifying the code via the shared session-expiry path', async () => {
    const user = userEvent.setup();
    api.changePassword.mockResolvedValue({ ok: true });
    api.requestEmailChange.mockResolvedValue({ sent: true });
    api.verifyEmailChange.mockRejectedValue(new api.ApiError(401, 'Сессия истекла'));

    render(<ProfileView notify={vi.fn()} />);
    await screen.findByText('Текущий email: admin@chesslab.local');

    await user.type(screen.getByLabelText('Новый email'), 'new@chesslab.local');
    await user.type(screen.getByLabelText('Новый пароль'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    const codeInput = await screen.findByLabelText('Код из письма');
    await user.type(codeInput, '654321');
    await user.click(screen.getByRole('button', { name: 'Подтвердить код' }));

    await waitFor(() => expect(api.logout).toHaveBeenCalled());
  });
});
