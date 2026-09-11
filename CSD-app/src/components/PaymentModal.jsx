import {useState} from 'react';
import {createPayment, ApiError} from '../lib/api.js';
import {useAuthContext} from '../context/AuthContext.jsx';
import {navigate} from '../lib/route.js';
import {ModalShell, submitClass} from './ModalShell.jsx';

/**
 * Модалка «оплатить задание». Почта для чека (54-ФЗ) берётся из аккаунта —
 * сервер email от клиента не принимает, поэтому поля ввода здесь нет.
 * После создания платежа уводим на страницу оплаты ЮKassa; подтверждение
 * обрабатывает вебхук на сервере, он же открывает доступ к заданию.
 */
export function PaymentModal({assignment, onClose}) {
  const {user} = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyBought, setAlreadyBought] = useState(false);

  if (!assignment) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await createPayment({assignmentId: assignment.id});
      if (!result?.confirmationUrl) throw new Error('ЮKassa не вернула ссылку на оплату.');
      window.location.href = result.confirmationUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAlreadyBought(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Не удалось начать оплату. Попробуйте ещё раз.');
      }
      setLoading(false);
    }
  }

  return (
    <ModalShell
      eyebrow="Оплата задания"
      title={assignment.name}
      ariaLabel={`Оплата задания «${assignment.name}»`}
      onClose={onClose}
    >
      <div className="flex items-baseline gap-1.5 mb-5">
        <b className="font-display text-[26px] tracking-[-.04em]">{assignment.price.toLocaleString('ru-RU')} ₽</b>
        <small className="text-[10px] text-faint">/ задание</small>
      </div>

      {alreadyBought ? (
        <>
          <p className="text-[13px] leading-[1.6] text-muted mb-4">
            Это задание уже куплено — оно ждёт вас в личном кабинете.
          </p>
          <button
            type="button"
            className={submitClass}
            onClick={() => {
              onClose();
              navigate({view: 'cabinet', assignmentId: assignment.id});
            }}
          >
            Открыть в кабинете
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-[13px] leading-[1.6] text-muted mb-1.5">
            Чек придёт на <b className="text-ink">{user?.email}</b>
          </p>
          <p className="text-[11px] text-faint mb-4">
            После оплаты задание появится в личном кабинете.
          </p>

          {error && <p className="text-[12px] text-danger mb-4">{error}</p>}

          <button type="submit" disabled={loading} className={submitClass}>
            {loading ? 'Переходим к оплате…' : 'Перейти к оплате'}
          </button>
        </form>
      )}
    </ModalShell>
  );
}
