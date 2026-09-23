import {Header} from './Header.jsx';
import {DynamicsPrinciples} from './DynamicsPrinciples.jsx';
import {Footer} from './Faq.jsx';
import {useDocumentMeta} from '../lib/seo.js';

const backLink = (
  <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink transition duration-200">
    ← На главную
  </a>
);

// Отдельная страница /metodika — вынесена из лендинга, когда раздел
// «Методика курса» разросся картинками и текстом (см. DynamicsTeaser.jsx на
// лендинге и обсуждение в чате). Свой адрес, а не якорь на главной, — чтобы
// материал можно было проиндексировать отдельно и он не утяжелял лендинг.
// Без CTA «Купить доступ» внизу и без большого отступа сверху — методика тут
// самостоятельный материал для чтения, а не ещё один шаг к покупке.
export function MetodikaPage() {
  useDocumentMeta({title: 'Методика курса — принципы шахматной динамики'});

  return (
    <div className="flex min-h-dvh flex-col">
      <Header standalone />
      <main className="flex-1">
        <DynamicsPrinciples backLink={backLink} />
      </main>
      <Footer />
    </div>
  );
}
