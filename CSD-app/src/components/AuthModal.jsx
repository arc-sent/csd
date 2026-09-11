import {useState} from 'react';
import {useAuthContext} from '../context/AuthContext.jsx';
import {ModalShell, fieldLabelClass, inputClass, submitClass} from './ModalShell.jsx';

const tabClass = active =>
  `flex-1 min-h-[38px] rounded-[10px] text-xs font-extrabold transition duration-200 ${
    active ? 'bg-surface text-ink shadow-[0_2px_8px_rgba(18,19,17,.08)]' : 'text-faint hover:text-ink'
  }`;

/**
 * Вход и регистрация покупателя. onSuccess нужен, чтобы не потерять действие,
 * ради которого пользователя попросили войти (например, начатую покупку).
 */
export function AuthModal({mode: initialMode = 'login', onClose, onSuccess}) {
  const {login, register} = useAuthContext();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

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
  }

  return (
    <ModalShell
      eyebrow="Личный кабинет"
      title={isRegister ? 'Регистрация' : 'Вход'}
      onClose={onClose}
    >
      <div className="flex gap-1 p-1 rounded-xl bg-paper border border-line mb-5">
        <button type="button" className={tabClass(!isRegister)} onClick={() => switchMode('login')}>
          Вход
        </button>
        <button type="button" className={tabClass(isRegister)} onClick={() => switchMode('register')}>
          Регистрация
        </button>
      </div>

      <p className="text-[13px] leading-[1.6] text-muted mb-5">
        {isRegister
          ? 'Заведите аккаунт, чтобы купленные задания и прогресс сохранялись за вами.'
          : 'Войдите, чтобы открыть купленные задания и продолжить с того места, где остановились.'}
      </p>

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
        <input
          id="auth-password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder={isRegister ? 'Не короче 8 символов' : '••••••••'}
          value={password}
          onChange={event => setPassword(event.target.value)}
          className={`${inputClass} mb-1.5`}
        />
        {isRegister && (
          // Восстановления пароля пока нет — честнее предупредить заранее,
          // чем оставить человека без доступа к оплаченному.
          <p className="text-[11px] text-faint mb-4">
            Сохраните пароль: восстановление по почте пока не работает.
          </p>
        )}
        {!isRegister && <div className="mb-4" />}

        {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

        <button type="submit" disabled={submitting} className={submitClass}>
          {submitting ? 'Подождите…' : isRegister ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>
    </ModalShell>
  );
}
