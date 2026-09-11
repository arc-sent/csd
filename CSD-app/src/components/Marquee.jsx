import {useEffect, useRef, useState} from 'react';

const WORDS = ['ТАКТИКА', 'РАСЧЁТ', 'ВНИМАНИЕ', 'СИСТЕМА', 'ПРОГРЕСС'];
const SPEED = 70; // пикселей в секунду

/**
 * Бесконечная лента: группа слов копируется, пока не перекроет экран с запасом,
 * и сдвигается ровно на ширину одной группы — стык получается незаметным.
 */
export function Marquee() {
  const viewportRef = useRef(null);
  const groupRef = useRef(null);
  const [copies, setCopies] = useState(2);
  const [shift, setShift] = useState(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;

    const measure = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (!groupWidth) return;
      setCopies(Math.max(2, Math.ceil(viewport.clientWidth / groupWidth) + 1));
      setShift(groupWidth);
    };

    measure();
    // Пересчёт после загрузки шрифта обязателен: первый замер идёт по
    // резервной гарнитуре, она шире, и сдвиг не совпал бы с шириной группы.
    document.fonts?.ready.then(measure);

    // Следим и за лентой, и за группой: ширина группы меняется,
    // когда подгружается шрифт, а ширина ленты — при ресайзе окна.
    if (!window.ResizeObserver) {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, []);

  const style = shift
    ? {'--marquee-shift': `${shift}px`, '--marquee-duration': `${shift / SPEED}s`}
    : undefined;

  return (
    <div
      ref={viewportRef}
      className="relative z-10 mt-[55px] sm:mt-[84px] border-y border-line overflow-hidden"
      aria-hidden="true"
    >
      <div className="marquee-track py-4 font-display text-sm font-extrabold tracking-[.22em] text-faint" style={style}>
        {Array.from({length: copies}, (_, index) => (
          <div
            key={index}
            ref={index === 0 ? groupRef : undefined}
            className="flex flex-none gap-[70px] pr-[70px] whitespace-nowrap"
          >
            {WORDS.map(word => (
              <span key={word}>{word}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
