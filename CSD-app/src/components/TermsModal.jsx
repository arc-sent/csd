import {useEffect, useRef, useState} from 'react';
import {ModalShell, submitClass} from './ModalShell.jsx';
import {TermsContent} from './TermsContent.jsx';

export function TermsModal({onAccept, onClose, onDecline, readOnly = false}) {
  const scrollRef = useRef(null);
  const [readAll, setReadAll] = useState(false);

  const checkEnd = () => {
    const node = scrollRef.current;
    if (!node) return;
    if (node.scrollHeight - node.scrollTop - node.clientHeight < 24) setReadAll(true);
  };

  useEffect(checkEnd, []);

  return (
    <ModalShell eyebrow={readOnly ? 'Документы' : 'Перед регистрацией'} title="Пользовательское соглашение" onClose={onClose} wide>
      <div
        ref={scrollRef}
        onScroll={checkEnd}
        tabIndex={0}
        className="max-h-[52vh] overflow-y-auto pr-3 -mr-1 mb-5 rounded-xl border border-line bg-paper p-4 outline-none focus:border-ink"
      >
        <TermsContent />
      </div>

      {readOnly ? (
        <button type="button" onClick={onClose} className={submitClass}>
          Закрыть
        </button>
      ) : (
        <>
          <button type="button" disabled={!readAll} onClick={onAccept} className={submitClass}>
            Условия пользовательского соглашения принимаю
          </button>
          <p className="text-[11px] text-faint text-center mt-3 min-h-[16px]">
            {readAll ? 'Регистрируясь, вы подтверждаете, что прочитали соглашение.' : 'Прокрутите текст до конца, чтобы продолжить.'}
          </p>
          <button
            type="button"
            onClick={onDecline}
            className="block w-full mt-1 text-[12px] font-bold text-muted hover:text-ink transition duration-200"
          >
            Не принимаю — вернуться ко входу
          </button>
        </>
      )}
    </ModalShell>
  );
}
