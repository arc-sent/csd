import {Reveal} from './Reveal.jsx';
import {Button, container, label, sectionPad} from './ui.jsx';

export function AuthorTeaser() {
  return (
    <section className={`bg-bg ${sectionPad}`} id="author">
      <div className={container}>
        <Reveal>
          <span className={`${label} text-ink`}>Об авторе методики</span>
          <p className="max-w-[860px] mt-5 font-display text-[21px] sm:text-[28px] leading-[1.3] tracking-[-.03em] text-ink">
            Применение методик курса на примерах успешной онлайн практики автора с титулованными соперниками.
          </p>
          <p className="max-w-[640px] mt-4 mb-8 text-sm text-muted leading-[1.7]">
            Далее приводится скриншоты, которые подтверждают титул соперника и победный результат автора,
            подтверждённые соответствующими диаграммами с готовым решением
          </p>
        </Reveal>

        <Reveal>
          <Button href="/avtor/">
            Читать об авторе <span>↗</span>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
