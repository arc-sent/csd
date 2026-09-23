import {useState} from 'react';
import {Header} from './components/Header.jsx';
import {Hero} from './components/Hero.jsx';
import {Audience, Benefits, HowItWorks, Plans, Reviews} from './components/Sections.jsx';
import {DynamicsTeaser} from './components/DynamicsTeaser.jsx';
import {MetodikaPage} from './components/MetodikaPage.jsx';
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
import {currentPath, isMetodikaPath} from './lib/pagePath.js';

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
  const [authMode, setAuthMode] = useState(null);

  const isCabinet = route.view === 'cabinet';

  useDocumentMeta(isCabinet ? {title: 'Личный кабинет', noindex: true} : {});

  return (
    <div className="flex min-h-dvh flex-col">
      <Header isCabinet={isCabinet} navigate={navigate} onOpenAuth={() => setAuthMode('login')} />
      <main className="flex-1">
        {isCabinet ? (
          <>
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
            <DynamicsTeaser />
            <Demo notify={notify} />
            <Benefits />
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
  // /metodika — отдельная страница вне обычного лендинг/кабинет переключения
  // (см. lib/pagePath.js): у неё свой адрес, свой пререндер и она не завязана
  // на ?view= в query-строке, которым живёт остальной роутинг сайта.
  const isMetodika = isMetodikaPath(currentPath());

  return (
    <AuthProvider>
      <ToastProvider>{isMetodika ? <MetodikaPage /> : <Shell />}</ToastProvider>
    </AuthProvider>
  );
}
