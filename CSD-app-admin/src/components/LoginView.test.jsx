import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({
  requestPasswordReset: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn()
}));

import * as api from '../lib/api.js';
import LoginView from './LoginView.jsx';

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits trimmed email and the password as typed', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginView onLogin={onLogin} error="" />);

    await user.type(screen.getByLabelText('Email'), '  admin@chesslab.local  ');
    await user.type(screen.getByLabelText('Пароль'), 'super-secret');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('admin@chesslab.local', 'super-secret'));
  });

  it('clears the password field after a successful login', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginView onLogin={onLogin} error="" />);

    const passwordInput = screen.getByLabelText('Пароль');
    await user.type(screen.getByLabelText('Email'), 'admin@chesslab.local');
    await user.type(passwordInput, 'super-secret');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => expect(passwordInput).toHaveValue(''));
  });

  it('keeps the password field when login fails, and surfaces the error prop', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue(new Error('Неверный email или пароль'));
    const { rerender } = render(<LoginView onLogin={onLogin} error="" />);

    const passwordInput = screen.getByLabelText('Пароль');
    await user.type(screen.getByLabelText('Email'), 'admin@chesslab.local');
    await user.type(passwordInput, 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(passwordInput).toHaveValue('wrong-pass');

    rerender(<LoginView onLogin={onLogin} error="Неверный email или пароль" />);
    expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument();
  });

  it('switches to the password-reset screen and requests a code', async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValue({ sent: true });
    render(<LoginView onLogin={vi.fn()} error="" />);

    await user.type(screen.getByLabelText('Email'), 'admin@chesslab.local');
    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));

    expect(screen.getByText('Восстановление пароля')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отправить код' }));

    await waitFor(() => expect(api.requestPasswordReset).toHaveBeenCalledWith('admin@chesslab.local'));
    expect(await screen.findByLabelText('Код из письма')).toBeInTheDocument();
  });

  it('completes the reset flow end to end and returns to the login screen with a notice', async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValue({ sent: true });
    api.verifyPasswordResetCode.mockResolvedValue({ resetToken: 'reset-tok' });
    api.confirmPasswordReset.mockResolvedValue({ ok: true });

    render(<LoginView onLogin={vi.fn()} error="" />);

    await user.type(screen.getByLabelText('Email'), 'admin@chesslab.local');
    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));
    await user.click(screen.getByRole('button', { name: 'Отправить код' }));

    const codeInput = await screen.findByLabelText('Код из письма');
    await user.type(codeInput, '123456');
    await user.click(screen.getByRole('button', { name: 'Подтвердить код' }));

    await waitFor(() => expect(api.verifyPasswordResetCode).toHaveBeenCalledWith('admin@chesslab.local', '123456'));

    const newPasswordInput = await screen.findByLabelText('Новый пароль');
    await user.type(newPasswordInput, 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Сменить пароль' }));

    await waitFor(() => expect(api.confirmPasswordReset).toHaveBeenCalledWith('reset-tok', 'brand-new-pass'));
    expect(await screen.findByText('Пароль изменён — войдите с новым паролем.')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toHaveValue('');
  });

  it('only accepts digits in the reset code field, capped at 6', async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValue({ sent: true });
    render(<LoginView onLogin={vi.fn()} error="" />);

    await user.type(screen.getByLabelText('Email'), 'admin@chesslab.local');
    await user.click(screen.getByRole('button', { name: 'Забыли пароль?' }));
    await user.click(screen.getByRole('button', { name: 'Отправить код' }));

    const codeInput = await screen.findByLabelText('Код из письма');
    await user.type(codeInput, 'ab12cd34ef');

    expect(codeInput).toHaveValue('1234');
  });
});
