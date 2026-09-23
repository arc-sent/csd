import {ModalShell, submitClass} from './ModalShell.jsx';
import {PrivacyContent} from './PrivacyContent.jsx';

export function PrivacyModal({onClose}) {
  return (
    <ModalShell eyebrow="Документы" title="Политика конфиденциальности" onClose={onClose} wide>
      <div className="max-h-[52vh] overflow-y-auto pr-3 -mr-1 mb-5 rounded-xl border border-line bg-paper p-4">
        <PrivacyContent />
      </div>
      <button type="button" onClick={onClose} className={submitClass}>
        Закрыть
      </button>
    </ModalShell>
  );
}
