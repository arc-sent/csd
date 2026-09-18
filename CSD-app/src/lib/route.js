import {useCallback, useEffect, useState} from 'react';

// Маршрут в query-параметрах, а не в пути: сборка идёт с base:'./' под обычный
// статический хостинг, где /cabinet вернёт 404 при обновлении страницы, если
// не настраивать SPA-fallback. Хеш занят якорями лендинга (#plans, #reviews).
const ROUTE_EVENT = 'chesslab:route';

// При пререндере (scripts/prerender.mjs) window нет — рендерится лендинг.
const isBrowser = typeof window !== 'undefined';

export function readRoute(search = isBrowser ? window.location.search : '') {
  const params = new URLSearchParams(search);
  return {
    view: params.get('view') === 'cabinet' ? 'cabinet' : 'landing',
    assignmentId: params.get('assignment') || null,
    levelId: params.get('level') || null
  };
}

export function buildHref({view = 'landing', assignmentId = null, levelId = null} = {}) {
  const pathname = isBrowser ? window.location.pathname : '/';
  if (view !== 'cabinet') return pathname;
  const params = new URLSearchParams({view: 'cabinet'});
  if (assignmentId) params.set('assignment', assignmentId);
  if (levelId) params.set('level', levelId);
  return `${pathname}?${params}`;
}

export function navigate(next) {
  window.history.pushState({}, '', buildHref(next));
  // pushState не порождает события сам — без этого подписчики не узнают о
  // переходе (классическая ловушка ручного роутинга).
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function useRoute() {
  const [route, setRoute] = useState(() => readRoute());

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('popstate', sync);
    window.addEventListener(ROUTE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(ROUTE_EVENT, sync);
    };
  }, []);

  const go = useCallback(next => navigate(next), []);
  return [route, go];
}
