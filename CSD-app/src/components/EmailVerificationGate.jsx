import {useState} from 'react';
import {useAuthContext} from '../context/AuthContext.jsx';
import {useToast} from '../hooks/useToast.jsx';
import {container, sectionPad} from './ui.jsx';

export function EmailVerificationGate() {
  const {user, verifyEmail, resendVerification} = useAuthContext();
  const notify = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  if (!user) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyEmail(code);
      notify('Почта подтверждена.');
    } catch (err) {
      setError(err.message || 'Не удалось подтвердить. Проверьте код.');
    } finally {
      setSubmitting(false);
    }
  }

  function startCooldown(seconds) {
    setCooldown(seconds);
    const id = window.setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setError('');
    try {
      const result = await resendVerification();
      if (result.sent) notify('Код отправлен повторно.');
      else if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
    } catch (err) {
      setError(err.message || 'Не удалось отправить код.');
    }
  }

  return (
    <section className={`bg-bg ${sectionPad}`}>
      <div className={`${container} max-w-[440px] text-center`}>
        <h1 className="font-display text-[32px] leading-[1.05] tracking-[-.04em] mb-3">
          Подтвердите почту
        </h1>
        <p className="text-sm text-muted leading-[1.7] mb-7">
          Мы отправили код на {user.email}. Введите его ниже, чтобы открыть
          кабинет и покупку заданий.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-center gap-2.5">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-[140px] min-h-[52px] px-4 rounded-xl border border-line bg-surface text-base tracking-[.3em] text-center outline-none transition duration-200 focus:border-ink"
          />
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="inline-flex min-h-[52px] items-center justify-center px-6 rounded-[15px] text-sm font-extrabold bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none disabled:translate-y-0"
          >
            {submitting ? 'Проверяем…' : 'Подтвердить'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="mt-4 text-[13px] font-bold text-muted hover:text-ink transition duration-200 disabled:opacity-50 disabled:pointer-events-none"
        >
          {cooldown > 0 ? `Отправить ещё раз (${cooldown}с)` : 'Отправить код ещё раз'}
        </button>

        {error && <p className="text-[13px] text-danger mt-4">{error}</p>}
      </div>
    </section>
  );
}
