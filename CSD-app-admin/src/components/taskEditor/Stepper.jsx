import { Fragment } from 'react';

const STEP_LABEL = { position: 'Позиция', solution: 'Решение', review: 'Проверка' };
const STEPS = ['position', 'solution', 'review'];

// Порт renderStepper() из admins/js/admin.js — кликабельно только назад
// или на текущий шаг, не вперёд.
export default function Stepper({ current, onNavigate }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <div className="container workflow-stepper-wrap" style={{ display: 'flex' }}>
      <div className="stepper">
        {STEPS.map((step, i) => {
          const state = step === current ? 'current' : (currentIndex > i ? 'done' : 'upcoming');
          const clickable = i <= currentIndex;
          return (
            <Fragment key={step}>
              <button
                type="button"
                className={'stepper-dot ' + state}
                onClick={clickable ? () => onNavigate(step) : undefined}
              >
                <span className="stepper-num">{i + 1}</span>
                <span className="stepper-label">{STEP_LABEL[step]}</span>
              </button>
              {i < STEPS.length - 1 && <span className="stepper-line"></span>}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
