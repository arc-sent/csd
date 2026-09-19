import {container, sectionPad, label} from './ui.jsx';
import {useDocumentMeta} from '../lib/seo.js';

export function NotFoundPage({
  title = 'Такой страницы не существует',
  message = 'Возможно, ссылка устарела, задание удалили, или адрес введён неверно.',
  actionLabel = 'На главную',
  onAction
}) {
  useDocumentMeta({title: 'Страница не найдена', noindex: true});
  return (
    <section className={`bg-bg ${sectionPad}`}>
      <div className={`${container} max-w-[560px] text-center`}>
        <span className={`${label} text-accent`}>Ошибка 404</span>
        <h1 className="font-display text-[32px] leading-[1.05] tracking-[-.04em] mt-3 mb-3">{title}</h1>
        <p className="text-sm text-muted leading-[1.7] mb-7">{message}</p>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center gap-3 min-h-[52px] px-[22px] rounded-[15px] text-sm font-extrabold bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5"
        >
          {actionLabel} <span>→</span>
        </button>
      </div>
    </section>
  );
}
