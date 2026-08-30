import {useCallback, useRef, useState} from 'react';
import {Header} from './components/Header.jsx';
import {Hero} from './components/Hero.jsx';
import {Audience, Benefits, HowItWorks, Plans, Reviews} from './components/Sections.jsx';
import {Demo} from './components/Demo.jsx';
import {Faq, FinalCta, Footer} from './components/Faq.jsx';

export default function App() {
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const notify = useCallback(message => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2200);
  }, []);

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Audience />
        <HowItWorks />
        <Demo notify={notify} />
        <Benefits />
        <Plans />
        <Reviews />
        <Faq />
        <FinalCta />
      </main>
      <Footer />

      <div
        className={`fixed right-5 bottom-5 z-[100] rounded-xl bg-ink text-white px-4 py-3 text-[11px] transition duration-250 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2.5 pointer-events-none'
        }`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </>
  );
}
