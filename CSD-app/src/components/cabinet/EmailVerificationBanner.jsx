import {useState} from 'react';
import {useAuthContext} from '../../context/AuthContext.jsx';
import {useToast} from '../../hooks/useToast.jsx';

// Мягкий режим: почта не подтверждена — это просто баннер, а не блокировка
// кабинета/покупки (см. account.service.js.publicUser — emailVerified только
// для бейджа, никаких гейтов на маршрутах). Компонент сам решает, показываться
// ли, и сам исчезает, как только user.emailVerified становится true.
//
// Своя, не общая с ModalShell.jsx разметка поля/кнопки: там inputClass и
// submitClass жёстко на w-full — здесь код узкий и в одну строку с кнопками,
// смешивать конфликтующие ширины из одного класса рискованно (в проекте уже
// был баг ровно на этой почве, см. историю правок Button variant="small").
export function EmailVerificationBanner() {
  const {user, verifyEmail, resendVerification} = useAuthContext();
  const notify = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  if (!user || user.emailVerified) return null;

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
    <div className="rounded-[18px] border border-line bg-paper px-5 py-4 sm:px-6 sm:py-5">
      <p className="font-display text-[15px] tracking-[-.02em] mb-1">Подтвердите почту</p>
      <p className="text-[12px] text-muted leading-[1.6] mb-3.5">
        Мы отправили код на {user.email}. Это не блокирует кабинет и покупки —
        просто подтверждает, что адрес реальный.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-[130px] min-h-[44px] px-4 rounded-xl border border-line bg-surface text-sm tracking-[.3em] text-center outline-none transition duration-200 focus:border-ink"
        />
        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="inline-flex min-h-[44px] items-center justify-center px-5 rounded-xl text-[13px] font-extrabold bg-accent text-on-accent transition duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none disabled:translate-y-0"
        >
          {submitting ? 'Проверяем…' : 'Подтвердить'}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-[12px] font-bold text-muted hover:text-ink transition duration-200 disabled:opacity-50 disabled:pointer-events-none"
        >
          {cooldown > 0 ? `Отправить ещё раз (${cooldown}с)` : 'Отправить код ещё раз'}
        </button>
      </form>

      {error && <p className="text-[12px] text-danger mt-2.5">{error}</p>}
    </div>
  );
}
