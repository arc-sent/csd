import { useEffect } from 'react';
import { fenChainFor, resultFor } from '../../lib/solutionNotation.js';

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
