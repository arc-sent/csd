import {renderToString} from 'react-dom/server';
import App from './App.jsx';

// Точка входа для пререндера (scripts/prerender.mjs): отдаёт HTML лендинга,
// который вставляется в dist/index.html вместо пустого #root.
export function render() {
  return renderToString(<App />);
}
