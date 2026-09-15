import { useEffect } from 'react';
import { fenChainFor, resultFor } from '../../lib/solutionNotation.js';

// Общий список для ReviewView.jsx и SolutionBuilderView.jsx — результат
// партии (мат/ничья, resultFor умеет предложить его автоматически) отдельной
// группой от авторской оценки позиции без мата (±/∓/=, только руками —
// это суждение автора задачи, а не факт о позиции, который можно вычислить).
export const RESULT_GROUPS = [
  {
    label: 'Результат партии',
    options: { '1-0': '1-0 · победа белых', '0-1': '0-1 · победа чёрных', '1/2-1/2': '½-½ · ничья' }
  },
  {
    label: 'Оценка позиции (без мата)',
    options: { '±': '± · перевес белых', '∓': '∓ · перевес чёрных', '=': '= · равные шансы' }
  }
];

/**
 * Поле «Результат / оценка» — доступно и на шаге 2 (Решение), и на шаге 3
 * (Проверка): раньше выставить результат можно было только дойдя до
 * финальной проверки, теперь — сразу же, как только решение готово, без
 * обязательного перехода на следующий шаг.
 */
export default function ResultField({ draft, dispatch }) {
  const suggestedResult = resultFor(fenChainFor(draft).finalFen);
  useEffect(() => {
    if (!draft.result && suggestedResult) {
      dispatch({ type: 'SET_FIELD', field: 'result', value: suggestedResult });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedResult]);

  return (
    <>
      <select
        className="admin-input"
        value={draft.result || ''}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'result', value: e.target.value })}
      >
        <option value="">Без результата</option>
        {RESULT_GROUPS.map(group => (
          <optgroup key={group.label} label={group.label}>
            {Object.entries(group.options).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {suggestedResult && draft.result === suggestedResult && (
        <small className="review-hint">определено автоматически по финальной позиции решения</small>
      )}
    </>
  );
}
