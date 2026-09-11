/**
 * Русское склонение по числу: plural(5, ['задача', 'задачи', 'задач']).
 * Формы — для 1, для 2–4 и для 5+ (11–14 идут в последнюю, как «11 задач»).
 */
export function plural(count, forms) {
  const n = Math.abs(count) % 100;
  if (n > 10 && n < 20) return forms[2];
  const last = n % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}
