// Общая оболочка модалок (оплата, вход) — оверлей, панель, шапка с крестиком.
// Стили те же, что были в PaymentModal, просто теперь в одном месте.
export function ModalShell({eyebrow, title, ariaLabel, onClose, children}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-scrim/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-[22px] bg-surface border border-line p-6 sm:p-7 shadow-[0_30px_70px_rgba(18,19,17,.25)]"
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

// Общие классы полей формы — используются и в оплате, и во входе.
export const fieldLabelClass =
  'block text-[10px] uppercase tracking-[.08em] font-extrabold text-faint mb-2';
export const inputClass =
  'w-full min-h-[48px] px-4 rounded-xl border border-line bg-paper text-sm outline-none transition duration-200 focus:border-ink';
export const submitClass =
  'inline-flex w-full items-center justify-center min-h-[52px] px-[22px] rounded-[15px] text-sm font-extrabold bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none disabled:translate-y-0';
