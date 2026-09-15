import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import {readRoute} from './lib/route.js';

// Скрытие блоков до появления работает только при живом скрипте.
document.documentElement.classList.add('js');

const root = document.getElementById('root');
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// В dist/index.html лендинг уже отрендерен статически (scripts/prerender.mjs)
// — его гидрируем. Кабинет (?view=cabinet) пререндера не имеет: разметка
// не совпала бы, поэтому там пререндеренный лендинг просто выбрасывается и
// приложение монтируется с нуля, как раньше.
if (root.hasChildNodes() && readRoute().view === 'landing') {
  hydrateRoot(root, app);
} else {
  root.replaceChildren();
  createRoot(root).render(app);
}
