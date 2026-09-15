import { useEffect, useState } from 'react';
import * as api from '../lib/api.js';
import { ApiError } from '../lib/api.js';
import { handleApiError } from '../lib/authError.js';
import PasswordInput from './PasswordInput.jsx';

// Смена пароля и email администратора — одна форма, одна кнопка (как
// модалка регистрации на сайте: email + пароль в одной форме, один сабмит),
// а не два раздельных мини-флоу с двумя кнопками. Пароль меняется сразу, без
// кода; email, если указан, требует подтверждения кодом на НОВЫЙ адрес — та
// же проверка, что и email-verification на сайте (см.
// CSD-server/src/modules/auth/auth.service.js). Пока код не подтверждён,
// форма показывает только поле кода — тоже одно поле, одна кнопка.
export default function ProfileView({ notify }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.me()
      .then(admin => setEmail(admin.email))
      .catch(err => handleApiError(err, notify));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');

    const password = newPassword.trim();
    const targetEmail = newEmail.trim();
    if (!password && !targetEmail) {
      setError('Укажите новый пароль, новый email — или оба сразу.');
      return;
    }

    setSubmitting(true);
    try {
      const messages = [];
      if (password) {
        await api.changePassword(password);
        setNewPassword('');
        messages.push('Пароль изменён.');
      }
      if (targetEmail) {
        const result = await api.requestEmailChange(targetEmail);
        setStep('code');
        setNotice(
          result.sent
            ? `Код отправлен на ${targetEmail}.`
            : `Код уже отправлен — попробуйте снова через ${result.retryAfterSeconds} с, либо введите код из предыдущего письма.`
        );
      }
      if (messages.length) notify(messages.join(' '));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err, notify);
      } else {
        setError(err.message || 'Не удалось сохранить изменения.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const admin = await api.verifyEmailChange(code);
      notify('Email изменён.');
      setEmail(admin.email);
      setNewEmail('');
      setCode('');
      setNotice('');
      setStep('form');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleApiError(err, notify);
      } else {
        setError(err.message || 'Не удалось подтвердить код.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelCode() {
    setStep('form');
    setCode('');
    setError('');
    setNotice('');
  }

  return (
    <section className="login-view profile-view">
      <div className="login-wrap">
        <div className="login-card profile-form-card">
          <span className="section-label">Аккаунт</span>
          <h2>Профиль</h2>
          <p>Текущий email: {email}</p>

          {step === 'form' ? (
            <form onSubmit={handleSubmit}>
              <label className="field-label" htmlFor="profile-new-email">Новый email</label>
              <input
                id="profile-new-email"
                type="email"
                className="admin-input"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
              <label className="field-label" htmlFor="profile-new-password">Новый пароль</label>
              <PasswordInput
                id="profile-new-password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Не короче 8 символов"
                className="password-tight"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <div className="login-spacer" />
              <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <p className="profile-form-desc">{notice || `Если аккаунт с адресом ${newEmail} существует, мы отправили на него код.`}</p>
              <label className="field-label" htmlFor="profile-email-code">Код из письма</label>
              <input
                id="profile-email-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="admin-input profile-code-input"
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <p className={'feedback error validation-msg' + (error ? ' show' : '')}>{error}</p>
              <button type="submit" className="button button-primary" disabled={submitting || code.length !== 6}>
                {submitting ? 'Проверяем…' : 'Подтвердить код'}
              </button>
              <button type="button" className="login-link-btn" onClick={handleCancelCode}>Отмена</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
