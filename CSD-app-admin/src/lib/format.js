export const STATUS_LABEL = { draft: 'Черновик', published: 'Опубликован', archived: 'Архив' };
// Статусы платежа ЮKassa. Раскрашиваются существующими классами пилюль:
// pending → status-draft, succeeded → status-published, canceled → status-archived.
export const PAYMENT_STATUS_LABEL = { pending: 'Ожидает оплаты', succeeded: 'Оплачен', canceled: 'Отменён' };
export const PAYMENT_STATUS_PILL = { pending: 'draft', succeeded: 'published', canceled: 'archived' };

export const DIFFICULTY_LABEL = { easy: 'Лёгкая', medium: 'Средняя', hard: 'Сложная' };

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatPrice(price) {
  return price ? price + ' ₽' : 'бесплатно';
}

// Сумма платежа: в отличие от цены задания, ноль здесь — это ноль рублей,
// а не «бесплатно».
export function formatAmount(amount, currency = 'RUB') {
  const value = Number(amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 });
  return value + (currency === 'RUB' ? ' ₽' : ' ' + currency);
}
