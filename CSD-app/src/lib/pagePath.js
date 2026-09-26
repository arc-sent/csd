// В браузере страница знает свой путь сама (window.location). При SSR
// (entry-server.jsx) window не существует, поэтому prerender.mjs сообщает
// путь заранее через setSsrPath — до вызова render().
let ssrPath = '/';

export function setSsrPath(path) {
  ssrPath = path;
}

export function currentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : ssrPath;
}

// '/metodika' и '/metodika/' — одна и та же страница.
export const isMetodikaPath = path => path.replace(/\/+$/, '') === '/metodika';

export const isAvtorPath = path => path.replace(/\/+$/, '') === '/avtor';
