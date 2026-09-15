import { useEffect, useState } from 'react';
import Stepper from './Stepper.jsx';
import PositionEditorView from './PositionEditorView.jsx';
import SolutionBuilderView from './SolutionBuilderView.jsx';
import ReviewView from './ReviewView.jsx';
import { useTaskDraft, blankLevel } from '../../hooks/useTaskDraft.js';
import * as storage from '../../lib/storage.js';
import { handleApiError } from '../../lib/authError.js';

// Порт Admin.router (часть про Позицию/Решение/Проверку одной задачи) из
// admins/js/admin.js — владеет шагом и черновиком задачи, остальное (список
// задач) — в LevelsView.
export default function TaskEditorFlow({ assignmentId, levelId, onDone, onCancel, notify }) {
  const [step, setStep] = useState('position');
  const [loading, setLoading] = useState(Boolean(levelId));
  const [draft, dispatch] = useTaskDraft(blankLevel(assignmentId));

  useEffect(() => {
    if (!levelId) return;
    setLoading(true);
    storage.getLevel(levelId)
      .then(level => dispatch({ type: 'RESET', level }))
      .catch(err => { handleApiError(err, notify); onCancel(); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  async function persist(status) {
    try {
      await storage.upsertLevel({ ...draft, status });
      notify(status === 'published' ? 'Уровень опубликован.' : 'Уровень сохранён как черновик.');
      onDone();
    } catch (err) {
      handleApiError(err, notify);
    }
  }

  if (loading) return null;

  return (
    <>
      <Stepper current={step} onNavigate={setStep} />
      <main className="admin-main">
        {/* key={step} — переигрывает admin-view-in при каждой смене шага,
            как и переключение .active между отдельными <section> в оригинале. */}
        <section key={step} className="admin-view active">
          {step === 'position' && (
            <PositionEditorView draft={draft} dispatch={dispatch} onCancel={onCancel} onNext={setStep} notify={notify} />
          )}
          {step === 'solution' && (
            <SolutionBuilderView
              draft={draft}
              dispatch={dispatch}
              onBack={() => setStep('position')}
              onNext={setStep}
              onSaveDraft={() => persist('draft')}
              onPublish={() => persist('published')}
              notify={notify}
            />
          )}
          {step === 'review' && (
            <ReviewView
              draft={draft}
              dispatch={dispatch}
              onEdit={() => setStep('position')}
              onSaveDraft={() => persist('draft')}
              onPublish={() => persist('published')}
            />
          )}
        </section>
      </main>
    </>
  );
}
