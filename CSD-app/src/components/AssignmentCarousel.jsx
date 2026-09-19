import {useEffect, useMemo, useRef, useState} from 'react';

const SPEED = 28;
const GAP = 14;

const PIECE_ROTATION = ['wN', 'bQ', 'wB', 'bR', 'bK', 'wR', 'bN', 'wK', 'bB', 'wP', 'wQ', 'bP'];

function AssignmentCard({assignment, index, onBuy}) {
  const piece = PIECE_ROTATION[index % PIECE_ROTATION.length];
  return (
    <article
      data-assignment-id={assignment.id}
      className="relative flex-none w-[190px] sm:w-[220px] lg:w-[250px] min-h-[270px] sm:min-h-[310px] border border-line rounded-[22px] p-5 sm:p-6 bg-paper flex flex-col cursor-pointer transition duration-200 hover:-translate-y-1 hover:bg-surface hover:shadow-[0_12px_30px_rgba(18,19,17,.08)] hover:border-line-strong"
    >
      <span className="absolute right-5 top-5 text-[10px] text-subtle">{String(index + 1).padStart(2, '0')}</span>
      <img
        src={`${import.meta.env.BASE_URL}pieces/${piece}.png`}
        alt=""
        draggable="false"
        loading="lazy"
        className="w-9 h-9 sm:w-11 sm:h-11 object-contain object-bottom mt-0.5 mb-4 sm:mt-1 sm:mb-[22px] select-none [-webkit-user-drag:none]"
      />
      <h3 className="font-display text-[17px] sm:text-[19px] leading-[1.15] tracking-[-.03em] mb-2.5 min-h-[38px] sm:min-h-11">
        {assignment.name}
      </h3>
      <p className="text-xs text-muted mb-[18px]">{assignment.tasksCount} задач</p>
      <div className="flex items-baseline gap-1.5 mt-auto mb-4">
        <b className="font-display text-[22px] sm:text-[26px] tracking-[-.04em]">{assignment.price.toLocaleString('ru-RU')} ₽</b>
        <small className="text-[10px] text-faint">/ задание</small>
      </div>
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onBuy(assignment);
        }}
        className="inline-flex w-full items-center justify-center min-h-[42px] px-4 rounded-xl text-xs font-extrabold border border-line-strong bg-fill transition duration-200 hover:border-ink hover:bg-fill-hover"
      >
        Купить
      </button>
    </article>
  );
}

export function AssignmentCarousel({notify, assignments, stageId, onBuy}) {
  const viewportRef = useRef(null);
  const groupRef = useRef(null);
  const [copies, setCopies] = useState(3);

  const reduceMotion = useMemo(
    () => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) || false,
    []
  );

  const groupWidthRef = useRef(0);
  const scrollPosRef = useRef(0);
  const pausedRef = useRef(reduceMotion);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const pauseTimerRef = useRef(null);
  const arrowTimerRef = useRef(null);

  const wrapScroll = () => {
    const groupWidth = groupWidthRef.current;
    if (!groupWidth) return;
    if (scrollPosRef.current >= groupWidth * 2) {
      scrollPosRef.current -= groupWidth;
    } else if (scrollPosRef.current <= 0) {
      scrollPosRef.current += groupWidth;
    }
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!viewport || !group) return;

    const measure = () => {
      const groupWidth = group.getBoundingClientRect().width;
      if (!groupWidth) return;
      if (groupWidthRef.current !== groupWidth) {
        groupWidthRef.current = groupWidth;
        scrollPosRef.current = groupWidth;
        viewport.scrollLeft = groupWidth;
      }
      setCopies(Math.max(3, Math.ceil(viewport.clientWidth / groupWidth) + 2));
    };

    measure();
    document.fonts?.ready.then(measure);

    if (!window.ResizeObserver) {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    return () => observer.disconnect();
  }, []);

  const isFirstStageRef = useRef(true);
  useEffect(() => {
    if (isFirstStageRef.current) {
      isFirstStageRef.current = false;
      return;
    }
    const viewport = viewportRef.current;
    const groupWidth = groupWidthRef.current;
    if (!viewport || !groupWidth) return;
    scrollPosRef.current = groupWidth;
    viewport.scrollLeft = groupWidth;
  }, [stageId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame;
    let lastTick = null;

    const step = timestamp => {
      if (lastTick == null) lastTick = timestamp;
      const dt = (timestamp - lastTick) / 1000;
      lastTick = timestamp;
      if (!pausedRef.current) {
        scrollPosRef.current += SPEED * dt;
        wrapScroll();
        viewport.scrollLeft = scrollPosRef.current;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(pauseTimerRef.current);
      clearTimeout(arrowTimerRef.current);
    },
    []
  );

  const pauseForNotification = () => {
    if (reduceMotion) return;
    pausedRef.current = true;
    clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, 8000);
  };

  const scrollByCards = direction => {
    const viewport = viewportRef.current;
    const card = viewport?.querySelector('[data-assignment-id]');
    if (!viewport || !card) return;
    const step = card.getBoundingClientRect().width + GAP;
    pausedRef.current = true;
    scrollPosRef.current += direction * step;
    wrapScroll();
    viewport.scrollTo({left: scrollPosRef.current, behavior: 'smooth'});
    clearTimeout(arrowTimerRef.current);
    arrowTimerRef.current = setTimeout(() => {
      if (!reduceMotion) pausedRef.current = false;
    }, 400);
  };

  useEffect(() => {
    const handleMove = event => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) < 5) return;
        drag.moved = true;
        viewportRef.current?.classList.add('dragging');
        pausedRef.current = true;
      }
      scrollPosRef.current = drag.startPos - dx;
      wrapScroll();
      if (viewportRef.current) viewportRef.current.scrollLeft = scrollPosRef.current;
    };
    const handleUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.moved) {
        suppressClickRef.current = true;
        if (!reduceMotion) pausedRef.current = false;
      }
      dragRef.current = null;
      viewportRef.current?.classList.remove('dragging');
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [reduceMotion]);

  const handlePointerDown = event => {
    if (event.pointerType !== 'mouse') return;
    dragRef.current = {startX: event.clientX, startPos: scrollPosRef.current, moved: false};
  };

  const handleTrackClick = event => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    const card = event.target.closest('[data-assignment-id]');
    if (!card) return;
    pauseForNotification();
    const assignment = assignments.find(a => String(a.id) === card.dataset.assignmentId);
    if (assignment) {
      notify?.(`«${assignment.name}» — ${assignment.tasksCount} задач за ${assignment.price.toLocaleString('ru-RU')} ₽.`);
    }
  };

  const arrowClass =
    'assignment-arrow absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] rounded-full border border-line bg-surface text-base sm:text-[19px] leading-none text-ink shadow-[0_8px_20px_rgba(18,19,17,.12)] transition duration-200 hover:border-ink hover:scale-105';

  return (
    <div className="relative mt-[22px] sm:mt-[34px]">
      <button type="button" onClick={() => scrollByCards(-1)} aria-label="Предыдущее задание" className={`${arrowClass} left-1.5`}>
        ‹
      </button>
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onClick={handleTrackClick}
        className="assignment-viewport overflow-x-auto overflow-y-hidden cursor-grab"
      >
        <div className="flex w-max">
          {Array.from({length: copies}, (_, index) => (
            <div key={index} ref={index === 0 ? groupRef : undefined} className="flex flex-none gap-3.5 pr-3.5">
              {assignments.map((assignment, assignmentIndex) => (
                <AssignmentCard key={assignment.id} assignment={assignment} index={assignmentIndex} onBuy={onBuy} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => scrollByCards(1)} aria-label="Следующее задание" className={`${arrowClass} right-1.5`}>
        ›
      </button>
    </div>
  );
}
