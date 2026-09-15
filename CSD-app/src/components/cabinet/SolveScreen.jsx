import {useCallback, useEffect, useMemo, useState} from 'react';
import {TrainerPanel} from '../TrainerPanel.jsx';
import {ApiError, fetchLevel, markLevelMistake, markLevelSolved} from '../../lib/api.js';
import {handleApiError} from '../../lib/authError.js';
import {toTrainerLevel} from '../../lib/trainerLevel.js';
import {useToast} from '../../hooks/useToast.jsx';
import {LoadingState} from '../Spinner.jsx';
import {NotFoundPage} from '../NotFoundPage.jsx';

export function SolveScreen({levelId, siblings, onBack, onOpenLevel, onSolvedChange}) {
  const notify = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    setNotFound(false);
    fetchLevel(levelId)
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err.message || 'Не удалось загрузить задачу.');
        handleApiError(err, notify);
      });
    return () => {
      cancelled = true;
    };
  }, [levelId, notify]);

  const trainerLevel = useMemo(() => (data ? toTrainerLevel(data.level) : null), [data]);

  const handleSolved = useCallback(
    async ({usedSolution}) => {
      try {
        await markLevelSolved(levelId, {usedSolution});
        onSolvedChange?.(levelId);
        notify('Задача засчитана.');
      } catch (err) {
        handleApiError(err, notify);
      }
    },
    [levelId, notify, onSolvedChange]
  );

  // Ошибка учитывается в статистике, но она не должна мешать решать задачу:
  // сбой отправки гасим молча, тост про «не удалось» здесь только отвлекал бы.
  const handleMistake = useCallback(() => {
    markLevelMistake(levelId).catch(() => {});
  }, [levelId]);

  const position = siblings.findIndex(l => l.id === levelId);
  const prev = position > 0 ? siblings[position - 1] : null;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null;
  const current = position >= 0 ? siblings[position] : null;

  if (notFound) {
    return (
      <NotFoundPage
        title="Такой задачи не существует"
        message="Возможно, ссылка устарела, или задачу сняли с публикации."
        actionLabel="← К списку задач"
        onAction={onBack}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center min-h-[38px] px-4 mb-6 rounded-xl border border-line bg-fill text-xs font-extrabold transition duration-200 hover:border-ink hover:bg-fill-hover"
      >
        ← К списку задач
      </button>

      {error && <p className="text-[13px] text-danger">{error}</p>}
      {!data && !error && <LoadingState text="Загружаем задачу…" />}

      {data && !data.supported && (
        <div className="rounded-[18px] border border-dashed border-line bg-paper px-6 py-10 text-center">
          <p className="text-[15px] font-extrabold mb-1.5">Задача пока недоступна</p>
          <p className="text-[13px] text-faint">{data.unsupportedReason}</p>
        </div>
      )}

      {data && data.supported && trainerLevel && (
        // key обязателен: useTrainer читает уровень только в ленивом
        // инициализаторе состояния, при смене пропса доска бы не сбросилась.
        <TrainerPanel
          key={data.level.id}
          level={trainerLevel}
          notify={notify}
          title={`Задача ${current ? String(current.index).padStart(2, '0') : ''} · ${data.level.name}`}
          subtitle={data.level.description || 'Найдите сильнейшее продолжение.'}
          onSolved={handleSolved}
          onMistake={handleMistake}
        />
      )}

      {(prev || next) && (
        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && onOpenLevel(prev)}
            className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-xl border border-line bg-fill text-xs font-extrabold transition duration-200 enabled:hover:border-ink enabled:hover:bg-fill-hover disabled:opacity-35"
          >
            ← Предыдущая
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onOpenLevel(next)}
            className="inline-flex items-center justify-center min-h-[46px] px-4 rounded-xl border border-line bg-fill text-xs font-extrabold transition duration-200 enabled:hover:border-ink enabled:hover:bg-fill-hover disabled:opacity-35"
          >
            Следующая →
          </button>
        </div>
      )}
    </>
  );
}
