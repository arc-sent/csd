import {useEffect} from 'react';

export const SITE_NAME = 'ChessSchoolDinamik';
export const DEFAULT_TITLE = 'Шахматные задачи онлайн — тренажёр тактики | ChessSchoolDinamik';
// То же значение, что в <meta name="robots"> в index.html.
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

// Абсолютный адрес сайта (без завершающего слэша) — тот же, что подставлен
// в canonical/og:url в index.html при сборке. В dev без переменной — origin.
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '');

function upsertMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Заголовок вкладки и индексация для клиентских «страниц». Роутинг живёт в
 * query-параметрах одного index.html (см. lib/route.js), поэтому <title> и
 * robots для кабинета/404 выставляются отсюда, а не отдельными HTML-файлами.
 * noindex — только для личных экранов: кабинет, подтверждение почты, 404.
 * Лендинг при размонтировании возвращает базовые значения из index.html.
 */
export function useDocumentMeta({title, noindex = false} = {}) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    upsertMeta('robots', noindex ? 'noindex, nofollow' : DEFAULT_ROBOTS);
    return () => {
      document.title = DEFAULT_TITLE;
      upsertMeta('robots', DEFAULT_ROBOTS);
    };
  }, [title, noindex]);
}

// JSON-LD в React: «</script» внутри строк экранируем, чтобы сериализованный
// JSON не мог закрыть тег раньше времени.
export function jsonLd(data) {
  return {__html: JSON.stringify(data).replace(/</g, '\\u003c')};
}
