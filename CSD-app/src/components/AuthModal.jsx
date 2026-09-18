import {useEffect, useState} from 'react';
import {useAuthContext} from '../context/AuthContext.jsx';
import {ModalShell, fieldLabelClass, inputClass, submitClass, PasswordInput} from './ModalShell.jsx';
import {TermsModal} from './TermsModal.jsx';
import {requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset} from '../lib/api.js';

const tabClass = active =>
  `flex-1 min-h-[38px] rounded-[10px] text-xs font-extrabold transition duration-200 ${
    active ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(18,19,17,.08)]' : 'text-faint hover:text-ink'
  }`;

// Восстановление пароля — отдельный "экран" той же модалки, а не отдельная
// модалка: не нужно тащить наружу onClose/onSuccess ещё раз, оболочка та же.
// Три шага (email → код → новый пароль) внутри одного компонента, а не
// отдельные режимы AuthModal, — сама смена пароля никогда не должна попадать
// в историю вкладок "Вход/Регистрация" сверху. Поле нового пароля показывается
// только на третьем шаге, после того как код уже проверен сервером
// (POST /password-reset/verify) и обменян на resetToken — ввод кода и ввод
// нового пароля не должны быть одной формой, иначе неверный код узнаётся
// только вместе с уже введённым (и потерянным при ошибке) новым паролем.
function ResetPasswordForm({initialEmail, autoSend, onDone}) {
  // С «Забыли пароль?» в форме входа email уже известен — код уходит сразу,
  // без лишнего экрана, где его пришлось бы вводить второй раз. Экран запроса
  // email остаётся только как запасной путь (email пуст или сам код нужно
  // запросить заново из середины флоу).
  const skipToCode = autoSend && Boolean(initialEmail);
  const [step, setStep] = useState(skipToCode ? 'sending' : 'request'); // 'request' | 'sending' | 'code' | 'newPassword'
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!skipToCode) return;
    requestPasswordReset(initialEmail)
      .then(() => setStep('code'))
      .catch(err => {
        setError(err.message || 'Не удалось отправить код. Попробуйте ещё раз.');
        setStep('request');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRequest(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Сервер всегда отвечает {sent: true} вне зависимости от того,
      // существует ли email — так и должно быть, это не ошибка.
      await requestPasswordReset(email);
      setStep('code');
    } catch (err) {
      setError(err.message || 'Не удалось отправить код. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const {resetToken: token} = await verifyPasswordResetCode({email, code});
      setResetToken(token);
      setStep('newPassword');
    } catch (err) {
      setError(err.message || 'Неверный код. Проверьте и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetNewPassword(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await confirmPasswordReset({resetToken, newPassword});
      onDone(email);
    } catch (err) {
      setError(err.message || 'Не удалось поменять пароль. Попробуйте запросить код заново.');
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    try {
      await requestPasswordReset(email);
      setNotice('Если код ещё не пришёл — проверьте, что прошла минута с прошлой отправки.');
    } catch (err) {
      setError(err.message || 'Не удалось отправить код.');
    }
  }

  if (step === 'sending') {
    return <p className="text-[13px] text-faint">Отправляем код на {initialEmail}…</p>;
  }

  if (step === 'request') {
    return (
      <form onSubmit={handleRequest}>
        <p className="text-[13px] leading-[1.6] text-muted mb-5">
          Укажите email, на который зарегистрирован аккаунт — пришлём код для
          смены пароля.
        </p>

        <label className={fieldLabelClass} htmlFor="reset-email">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          required
          autoFocus
          autoComplete="username"
          placeholder="you@example.com"
          value={email}
          onChange={event => setEmail(event.target.value)}
          className={`${inputClass} mb-4`}
        />

        {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? 'Отправляем…' : 'Отправить код'}
        </button>
      </form>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerifyCode}>
        <p className="text-[13px] leading-[1.6] text-muted mb-5">
          Если аккаунт с адресом {email} существует, мы отправили на него код.
        </p>

        <label className={fieldLabelClass} htmlFor="reset-code">
          Код из письма
        </label>
        <input
          id="reset-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className={`${inputClass} mb-4 tracking-[.3em] text-center`}
        />

        {notice && <p className="text-[12px] text-muted mb-4">{notice}</p>}
        {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

        <button type="submit" disabled={submitting || code.length !== 6} className={submitClass}>
          {submitting ? 'Проверяем…' : 'Подтвердить код'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          className="block w-full mt-3 text-[12px] font-bold text-muted hover:text-ink transition duration-200"
        >
          Отправить код ещё раз
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSetNewPassword}>
      <p className="text-[13px] leading-[1.6] text-muted mb-5">
        Код подтверждён. Задайте новый пароль для входа.
      </p>

      <label className={fieldLabelClass} htmlFor="reset-new-password">
        Новый пароль
      </label>
      <PasswordInput
        id="reset-new-password"
        required
        autoFocus
        minLength={8}
        autoComplete="new-password"
        placeholder="Не короче 8 символов"
        value={newPassword}
        onChange={event => setNewPassword(event.target.value)}
        className="mb-4"
      />

      {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

      <button type="submit" disabled={submitting} className={submitClass}>
        {submitting ? 'Меняем пароль…' : 'Сменить пароль'}
      </button>
    </form>
  );
}

/**
 * Вход, регистрация и восстановление пароля покупателя. onSuccess нужен,
 * чтобы не потерять действие, ради которого пользователя попросили войти
 * (например, начатую покупку).
 */
export function AuthModal({mode: initialMode = 'login', onClose, onSuccess}) {
  const {login, register} = useAuthContext();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [autoSendReset, setAutoSendReset] = useState(false);
  // Соглашение показывается перед формой регистрации и принимается заново при
  // каждом открытии окна — принятие не «запоминается» надолго.
  const [termsAccepted, setTermsAccepted] = useState(false);

  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = isRegister ? await register({email, password}) : await login({email, password});
      onSuccess?.(user);
    } catch (err) {
      setError(err.message || 'Не удалось войти. Попробуйте ещё раз.');
      setSubmitting(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setResetNotice('');
  }

  function handleResetDone(resetEmail) {
    setEmail(resetEmail);
    setPassword('');
    setResetNotice('Пароль изменён — войдите с новым паролем.');
    setMode('login');
  }

  if (isRegister && !termsAccepted) {
    return (
      <TermsModal
        onAccept={() => setTermsAccepted(true)}
        onClose={onClose}
        onDecline={() => switchMode('login')}
      />
    );
  }

  return (
    <ModalShell
      eyebrow="Личный кабинет"
      title={isReset ? 'Восстановление пароля' : isRegister ? 'Регистрация' : 'Вход'}
      onClose={onClose}
    >
      {!isReset && (
        <div className="flex gap-1 p-1 rounded-xl bg-paper border border-line mb-5">
          <button type="button" className={tabClass(!isRegister)} onClick={() => switchMode('login')}>
            Вход
          </button>
          <button type="button" className={tabClass(isRegister)} onClick={() => switchMode('register')}>
            Регистрация
          </button>
        </div>
      )}

      {isReset ? (
        <ResetPasswordForm initialEmail={email} autoSend={autoSendReset} onDone={handleResetDone} />
      ) : (
        <>
          <p className="text-[13px] leading-[1.6] text-muted mb-5">
            {isRegister
              ? 'Заведите аккаунт, чтобы купленные задания и прогресс сохранялись за вами.'
              : 'Войдите, чтобы открыть купленные задания и продолжить с того места, где остановились.'}
          </p>

          {resetNotice && <p className="text-[12px] text-accent-strong mb-4">{resetNotice}</p>}

          <form onSubmit={handleSubmit}>
            <label className={fieldLabelClass} htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className={`${inputClass} mb-4`}
            />

            <label className={fieldLabelClass} htmlFor="auth-password">
              Пароль
            </label>
            <PasswordInput
              id="auth-password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? 'Не короче 8 символов' : '••••••••'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mb-1.5"
            />
            {!isRegister && (
              <button
                type="button"
                onClick={() => {
                  setAutoSendReset(true);
                  switchMode('reset');
                }}
                className="block text-[12px] font-bold text-muted hover:text-ink transition duration-200 mb-4"
              >
                Забыли пароль?
              </button>
            )}
            {isRegister && <div className="mb-4" />}

            {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

            <button type="submit" disabled={submitting} className={submitClass}>
              {submitting ? 'Подождите…' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>
        </>
      )}
    </ModalShell>
  );
}
