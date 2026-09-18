import {useState} from 'react';
import {Header} from './components/Header.jsx';
import {Hero} from './components/Hero.jsx';
import {Audience, Benefits, HowItWorks, Plans, Reviews} from './components/Sections.jsx';
import {Demo} from './components/Demo.jsx';
import {FinalCta, Footer} from './components/Faq.jsx';
import {AuthModal} from './components/AuthModal.jsx';
import {EmailVerificationGate} from './components/EmailVerificationGate.jsx';
import {LoadingState} from './components/Spinner.jsx';
import {CabinetPage} from './components/cabinet/CabinetPage.jsx';
import {AuthProvider, useAuthContext} from './context/AuthContext.jsx';
import {ToastProvider, useToast} from './hooks/useToast.jsx';
import {container, sectionPad, Button} from './components/ui.jsx';
import {useRoute} from './lib/route.js';
import {useDocumentMeta} from './lib/seo.js';

function CabinetGate({onOpenAuth}) {
  return (
    <section className={`bg-bg ${sectionPad}`}>
      <div className={`${container} max-w-[560px] text-center`}>
        <h1 className="font-display text-[32px] leading-[1.05] tracking-[-.04em] mb-3">
          Войдите, чтобы открыть кабинет
        </h1>
        <p className="text-sm text-muted leading-[1.7] mb-7">
          В личном кабинете лежат купленные задания и сохраняется прогресс решения.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="inline-flex items-center justify-center gap-3 min-h-[52px] px-[22px] rounded-[15px] text-sm font-extrabold bg-accent text-on-accent shadow-[0_12px_24px_rgba(255,107,45,.22)] transition duration-200 hover:-translate-y-0.5"
        >
          Войти <span>→</span>
        </button>
      </div>
    </section>
  );
}

function Shell() {
  const notify = useToast();
  const {status} = useAuthContext();
  const [route, navigate] = useRoute();
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'

  const isCabinet = route.view === 'cabinet';

  // Кабинет — личные экраны: свой <title> и noindex. Лендинг оставляет
  // базовые title/description из index.html.
  useDocumentMeta(isCabinet ? {title: 'Личный кабинет', noindex: true} : {});

  // Колонка на всю высоту экрана + растягивающийся main: иначе на коротких
  // экранах (список задач, экран решения, пустой кабинет, проверка входа)
  // подвал вставал сразу под контентом — посреди страницы. dvh, а не vh:
  // на мобильных vh не учитывает адресную строку и низ подрезается.
  return (
    <div className="flex min-h-dvh flex-col">
      <Header isCabinet={isCabinet} navigate={navigate} onOpenAuth={() => setAuthMode('login')} />
      <main className="flex-1">
        {isCabinet ? (
          <>
            {/* 'checking' — токен ещё проверяется; без этой ветки залогиненный
                увидел бы вспышку экрана входа при каждой перезагрузке. */}
            {status === 'checking' && (
              <section className={`bg-bg ${sectionPad}`}>
                <div className={container}>
                  <LoadingState text="Проверяем вход…" />
                </div>
              </section>
            )}
            {status === 'unauthenticated' && <CabinetGate onOpenAuth={() => setAuthMode('login')} />}
            {status === 'unverified' && <EmailVerificationGate />}
            {status === 'authenticated' && <CabinetPage route={route} navigate={navigate} />}
          </>
        ) : (
          <>
            <Hero />
            <Audience />
            <HowItWorks />
            <Demo notify={notify} />
            <Benefits />
            {/* Plans сам открывает окно входа, когда покупку начинает
                неавторизованный: так не теряется задание, на которое кликнули. */}
            <Plans notify={notify} />
            <Reviews />
            <FinalCta />
          </>
        )}
      </main>
      <Footer isCabinet={isCabinet} />

      {authMode && (
        <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSuccess={() => setAuthMode(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AuthProvider>
  );
}
