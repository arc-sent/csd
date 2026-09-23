import {useEffect} from 'react';

export const SITE_NAME = 'ChessSchoolDinamik';
export const DEFAULT_TITLE = 'Шахматные задачи онлайн — школа шахматной динамики | ChessSchoolDinamik';
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

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

export function jsonLd(data) {
  return {__html: JSON.stringify(data).replace(/</g, '\\u003c')};
}
