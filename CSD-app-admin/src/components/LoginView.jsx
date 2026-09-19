import { useState } from 'react';
import PasswordInput from './PasswordInput.jsx';
import * as api from '../lib/api.js';

function ResetPasswordForm({ initialEmail, onDone, onCancel }) {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.requestPasswordReset(email.trim());
      setStep('code');
    } catch (err) {
      setError(err.message || 'Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { resetToken: token } = await api.verifyPasswordResetCode(email.trim(), code);
      setResetToken(token);
      setStep('newPassword');
    } catch (err) {
      setError(err.message || 'Неверный код. Проверьте и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetNewPassword(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.confirmPasswordReset(resetToken, newPassword);
      onDone(email.trim());
    } catch (err) {
      setError(err.message || 'Не удалось поменять пароль. Попробуйте запросить код заново.');
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    try {
      await api.requestPasswordReset(email.trim());
      setNotice('Если код ещё не пришёл — проверьте, что прошла минута с прошлой отправки.');
    } catch (err) {
      setError(err.message || 'Не удалось отправить код.');
    }
  }

  if (step === 'request') {
    return (
      <form onSubmit={handleRequest}>
        <p>Укажите email администратора — пришлём код для смены пароля.</p>
        <label className="field-label" htmlFor="reset-email">Email</label>
        <input
          id="reset-email" type="email" className="admin-input" autoFocus required autoComplete="username"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Отправляем…' : 'Отправить код'}
        </button>
        <button type="button" className="login-link-btn" onClick={onCancel}>Назад ко входу</button>
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode}>
        <p>Если аккаунт с адресом {email} существует, мы отправили на него код.</p>
        <label className="field-label" htmlFor="reset-code">Код из письма</label>
        <input
          id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code"
          className="admin-input profile-code-input" autoFocus required maxLength={6}
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        {notice && <p className="hint-text">{notice}</p>}
        <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
        <button type="submit" className="button button-primary" disabled={submitting || code.length !== 6}>
          {submitting ? 'Проверяем…' : 'Подтвердить код'}
        </button>
        <button type="button" className="login-link-btn" onClick={handleResend}>Отправить код ещё раз</button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSetNewPassword}>
      <p>Код подтверждён. Задайте новый пароль для входа.</p>
      <label className="field-label" htmlFor="reset-new-password">Новый пароль</label>
      <PasswordInput
        id="reset-new-password" autoFocus required minLength={8} autoComplete="new-password"
        value={newPassword} onChange={e => setNewPassword(e.target.value)}
      />
      <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
      <button type="submit" className="button button-primary" disabled={submitting}>
        {submitting ? 'Меняем пароль…' : 'Сменить пароль'}
      </button>
    </form>
  );
}

export default function LoginView({ onLogin, error }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  const isReset = mode === 'reset';

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
      setPassword('');
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetDone(resetEmail) {
    setEmail(resetEmail);
    setPassword('');
    setResetNotice('Пароль изменён — войдите с новым паролем.');
    setMode('login');
  }

  return (
    <section className="login-view">
      <div className="container login-wrap">
        <div className="login-card">
          <span className="section-label">{isReset ? 'Восстановление пароля' : 'Вход'}</span>
          <h2>Админ-панель ChessSchoolDinamik</h2>

          {isReset ? (
            <ResetPasswordForm initialEmail={email} onDone={handleResetDone} onCancel={() => setMode('login')} />
          ) : (
            <>
              <p>Войдите под учётной записью администратора, чтобы управлять уровнями.</p>
              {resetNotice && <p className="login-reset-notice">{resetNotice}</p>}
              <form onSubmit={handleSubmit}>
                <label className="field-label" htmlFor="login-email">Email</label>
                <input
                  type="email" id="login-email" className="admin-input" autoComplete="username" required
                  value={email} onChange={e => setEmail(e.target.value)}
                />
                <label className="field-label" htmlFor="login-password">Пароль</label>
                <PasswordInput
                  id="login-password" autoComplete="current-password" required
                  className="password-tight"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="login-forgot-link" onClick={() => setMode('reset')}>
                  Забыли пароль?
                </button>
                <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
                <button type="submit" className="button button-primary" disabled={submitting}>Войти</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
