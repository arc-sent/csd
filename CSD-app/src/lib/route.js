import {useCallback, useEffect, useState} from 'react';

// Маршрут в query-параметрах, а не в пути: сборка идёт с base:'./' под обычный
// статический хостинг, где /cabinet вернёт 404 при обновлении страницы, если
// не настраивать SPA-fallback. Хеш занят якорями лендинга (#plans, #faq).
const ROUTE_EVENT = 'chesslab:route';

export function readRoute(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    view: params.get('view') === 'cabinet' ? 'cabinet' : 'landing',
    assignmentId: params.get('assignment') || null,
    levelId: params.get('level') || null
  };
}

export function buildHref({view = 'landing', assignmentId = null, levelId = null} = {}) {
  if (view !== 'cabinet') return window.location.pathname;
  const params = new URLSearchParams({view: 'cabinet'});
  if (assignmentId) params.set('assignment', assignmentId);
  if (levelId) params.set('level', levelId);
  return `${window.location.pathname}?${params}`;
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
