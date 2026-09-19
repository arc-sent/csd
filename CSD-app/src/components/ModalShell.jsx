import {useState} from 'react';

export function ModalShell({eyebrow, title, ariaLabel, onClose, children, wide = false}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-scrim/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-[640px]' : 'max-w-[420px]'} rounded-[22px] bg-surface border border-line p-6 sm:p-7 shadow-[0_30px_70px_rgba(18,19,17,.25)]`}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <span className="text-[11px] tracking-[.14em] uppercase font-extrabold text-accent">{eyebrow}</span>
            <h3 className="font-display text-[20px] leading-[1.15] tracking-[-.03em] mt-1.5">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="shrink-0 grid place-items-center w-8 h-8 rounded-full border border-line transition duration-200 hover:border-ink hover:bg-paper"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldLabelClass =
  'block text-[10px] uppercase tracking-[.08em] font-extrabold text-faint mb-2';
export const inputClass =
  'w-full min-h-[48px] px-4 rounded-xl border border-line bg-paper text-sm outline-none transition duration-200 focus:border-ink';
export const submitClass =
  'inline-flex w-full items-center justify-center min-h-[52px] px-[22px] rounded-[15px] text-sm font-extrabold bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none disabled:translate-y-0';

export function PasswordInput({id, className = '', ...props}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} pr-11`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-lg text-faint hover:text-ink transition duration-200"
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
