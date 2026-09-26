import {Header} from './Header.jsx';
import {Footer} from './Faq.jsx';
import {Reveal} from './Reveal.jsx';
import {SectionIntro, container} from './ui.jsx';
import {ExamplePanel} from './DynamicsPrinciples.jsx';
import {AuthorSummary} from './AuthorSummary.jsx';
import {AUTHOR_CASE} from '../data/authorCase.js';
import {useDocumentMeta} from '../lib/seo.js';

function CaseBlock({block, index}) {
  if (block.type === 'text') {
    return <p className="max-w-[760px] text-sm sm:text-[15px] text-ink leading-[1.7]">{block.text}</p>;
  }
  if (block.type === 'summary') return <AuthorSummary />;
  if (block.type === 'diagram') {
    return (
      <div className="max-w-[760px]">
        <ExamplePanel example={block} label={`Диаграмма ${index + 1}`} />
      </div>
    );
  }
  const portrait = block.h > block.w;
  return (
    <a
      href={block.src}
      target="_blank"
      rel="noopener"
      className={`block overflow-hidden rounded-2xl border border-line bg-surface ${
        portrait ? 'max-w-[420px]' : 'max-w-[760px]'
      }`}
    >
      <img src={block.src} width={block.w} height={block.h} loading="lazy" decoding="async" alt="" className="block h-auto w-full" />
    </a>
  );
}

export function AuthorPage() {
  useDocumentMeta({title: 'Об авторе методики — партии с титулованными соперниками'});

  return (
    <div className="flex min-h-dvh flex-col">
      <Header standalone />
      <main className="flex-1">
        <section className="bg-paper pt-6 sm:pt-9 pb-[74px] sm:pb-[104px]" id="author">
          <div className={container}>
            <Reveal>
              <div className="mb-3.5">
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink transition duration-200"
                >
                  ← На главную
                </a>
              </div>
              <SectionIntro
                split
                label="Об авторе методики"
                title="Методика курса в партиях автора."
                note="Применение методик курса на примерах успешной онлайн практики автора с титулованными соперниками. Далее приводится скриншоты, которые подтверждают титул соперника и победный результат автора, подтверждённые соответствующими диаграммами с готовым решением"
              />
            </Reveal>

            <div className="grid gap-5 sm:gap-6">
              {AUTHOR_CASE.map((block, i) => (
                <Reveal key={i} as="div">
                  <CaseBlock block={block} index={AUTHOR_CASE.slice(0, i).filter(b => b.type === 'diagram').length} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
