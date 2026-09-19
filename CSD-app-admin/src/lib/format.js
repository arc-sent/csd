export const STATUS_LABEL = { draft: 'Черновик', published: 'Опубликован', archived: 'Архив' };
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

export function stageDiscountPercent(stagePrice, assignmentsTotal) {
  if (!(stagePrice > 0) || !(assignmentsTotal > 0) || stagePrice >= assignmentsTotal) return 0;
  return Math.round(((assignmentsTotal - stagePrice) / assignmentsTotal) * 100);
}

export function formatAmount(amount, currency = 'RUB') {
  const value = Number(amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 });
  return value + (currency === 'RUB' ? ' ₽' : ' ' + currency);
}
