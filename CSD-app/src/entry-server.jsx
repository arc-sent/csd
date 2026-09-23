import {renderToString} from 'react-dom/server';
import App from './App.jsx';
import {setSsrPath} from './lib/pagePath.js';

// path — какую страницу рендерить: window здесь нет (это Node), поэтому App
// узнаёт путь через lib/pagePath.js, а не window.location. См. prerender.mjs,
// который вызывает render() дважды — для '/' и для '/metodika'.
export function render(path = '/') {
  setSsrPath(path);
  return renderToString(<App />);
}
