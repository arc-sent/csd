import {useState} from 'react';
import {createPayment, ApiError} from '../lib/api.js';
import {useAuthContext} from '../context/AuthContext.jsx';
import {navigate} from '../lib/route.js';
import {ModalShell, submitClass} from './ModalShell.jsx';

/**
 * Модалка «оплатить задание» — или, если передан `stage` вместо `assignment`,
 * «купить этап целиком» (см. Plans.jsx: «Купить этап целиком»). Почта для
 * чека (54-ФЗ) берётся из аккаунта — сервер email от клиента не принимает,
 * поэтому поля ввода здесь нет. После создания платежа уводим на страницу
 * оплаты ЮKassa; подтверждение обрабатывает вебхук на сервере, он же
 * открывает доступ (к заданию или сразу ко всем заданиям этапа).
 */
export function PaymentModal({assignment, stage, onClose}) {
  const {user} = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyBought, setAlreadyBought] = useState(false);

  const item = stage || assignment;
  if (!item) return null;
  const isStage = Boolean(stage);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await createPayment(isStage ? {stageId: item.id} : {assignmentId: item.id});
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
      eyebrow={isStage ? 'Оплата этапа' : 'Оплата задания'}
      title={item.name}
      ariaLabel={`Оплата ${isStage ? 'этапа' : 'задания'} «${item.name}»`}
      onClose={onClose}
    >
      <div className="flex items-baseline gap-1.5 mb-5">
        <b className="font-display text-[26px] tracking-[-.04em]">{item.price.toLocaleString('ru-RU')} ₽</b>
        <small className="text-[10px] text-faint">{isStage ? '/ этап целиком' : '/ задание'}</small>
      </div>

      {alreadyBought ? (
        <>
          <p className="text-[13px] leading-[1.6] text-muted mb-4">
            {isStage ? 'Этот этап уже куплен' : 'Это задание уже куплено'} — он{isStage ? '' : 'о'} ждёт вас в личном
            кабинете.
          </p>
          <button
            type="button"
            className={submitClass}
            onClick={() => {
              onClose();
              navigate(isStage ? {view: 'cabinet'} : {view: 'cabinet', assignmentId: item.id});
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
            {isStage
              ? 'После оплаты все задания этапа появятся в личном кабинете.'
              : 'После оплаты задание появится в личном кабинете.'}
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
