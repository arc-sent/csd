import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  applyMove,
  legalMoves,
  movableSquares,
  positionFromFen,
  sideToMove,
  squareName,
  toFen
} from '../lib/chess.js';

const REPLY_DELAY = 550;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Подпись «чей ход» больше не константа: ученик может играть и за чёрных.
const turnTitle = fen => (sideToMove(fen) === 'b' ? 'Ход чёрных' : 'Ход белых');

// Кадр истории хранит FEN (в нём очередь хода, права на рокировку и поле
// взятия на проходе) и выведенный из него массив для отрисовки доски.
const makeFrame = (fen, move, kind) => ({fen, position: positionFromFen(fen), move, kind});

const initialCore = level => {
  const fen = toFen(level);
  return {
    frames: [makeFrame(fen, null, 'start')],
    cursor: 0,
    stepIndex: 0,
    wrongPending: false,
    replyPending: false,
    solutionShown: false,
    preview: {text: level.hint, empty: true, move: null, before: null, beforeFen: null, prefix: ''},
    feedback: {state: 'idle', title: turnTitle(fen), note: 'Сделай первый ход алгоритма.'},
    progress: level.progress[0]
  };
};

/**
 * Экран решения задачи (ТЗ 4.3): ход тапами и перетаскиванием, проверка по
 * алгоритму уровня, ответ соперника, история ходов и показ решения.
 */
export function useTrainer(level, notify, onMistake) {
  const [core, setCore] = useState(() => initialCore(level));
  const [selected, setSelected] = useState(null);
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const replyTimer = useRef(null);
  const pendingAnimation = useRef(null);

  const frame = core.frames[core.cursor];
  const atLatest = core.cursor === core.frames.length - 1;
  const solved = core.stepIndex >= level.steps.length;
  const canPlay = atLatest && !core.wrongPending && !solved && !core.replyPending;

  const targets = useMemo(() => {
    if (!selected || !canPlay) return [];
    return legalMoves(frame.fen, selected[0], selected[1]);
  }, [selected, canPlay, frame.fen]);

  const movable = useMemo(() => (canPlay ? movableSquares(frame.fen) : []), [canPlay, frame.fen]);

  const hintFrom =
    core.solutionShown && !solved && atLatest && !core.wrongPending
      ? level.steps[core.stepIndex].player.from
      : null;

  // ── Анимация хода: фигуру рисуем на новом поле и «отматываем» к старому.
  const squareEl = coords =>
    boardRef.current?.querySelector(`[data-r="${coords[0]}"][data-c="${coords[1]}"]`);

  useLayoutEffect(() => {
    const pending = pendingAnimation.current;
    if (!pending) return;
    pendingAnimation.current = null;
    if (prefersReducedMotion()) return;

    const target = squareEl(pending.move.to);
    const piece = target?.querySelector('.piece');
    const to = target?.getBoundingClientRect();
    if (!piece || !to || !piece.animate) return;

    piece.classList.add('moving');
    piece.animate(
      [
        {transform: `translate(${pending.from.left - to.left}px, ${pending.from.top - to.top}px)`},
        {transform: 'translate(0, 0)'}
      ],
      {duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)'}
    ).onfinish = () => piece.classList.remove('moving');
  });

  const scheduleReply = useCallback(
    reply => {
      replyTimer.current = window.setTimeout(() => {
        replyTimer.current = null;
        setCore(prev => {
          const current = prev.frames[prev.frames.length - 1];
          const nextFen = applyMove(current.fen, reply);
          // Нелегальный ответ в сценарии сюда не доходит: сервер помечает такие
          // задачи недоступными (level-support.js проигрывает всё решение).
          if (!nextFen) return {...prev, replyPending: false};
          const fromRect = squareEl(reply.from)?.getBoundingClientRect();
          if (fromRect) pendingAnimation.current = {move: reply, from: fromRect};
          return {
            ...prev,
            replyPending: false,
            frames: [...prev.frames, makeFrame(nextFen, reply, 'reply')],
            cursor: prev.frames.length,
            preview: {move: reply, before: current.position, beforeFen: current.fen, prefix: 'Соперник: ', empty: false},
            feedback: {state: 'idle', title: turnTitle(nextFen), note: 'Соперник ответил. Ищи следующий ход.'}
          };
        });
      }, REPLY_DELAY);
    },
    // squareEl читает ref, пересоздавать колбэк не нужно
    []
  );

  const attemptMove = useCallback(
    (from, to, fromRect) => {
      if (!canPlay) return;
      const position = frame.position;
      const legal = legalMoves(frame.fen, from[0], from[1]).some(([r, c]) => r === to[0] && c === to[1]);
      if (!legal) return;

      const expected = level.steps[core.stepIndex].player;
      const correct =
        expected.from[0] === from[0] &&
        expected.from[1] === from[1] &&
        expected.to[0] === to[0] &&
        expected.to[1] === to[1];

      // Фигуру превращения берём из сценария: у верного хода она задана
      // автором, у произвольного — ферзь (см. applyMove в lib/chess.js).
      const move = correct && expected.promotion ? {from, to, promotion: expected.promotion} : {from, to};
      const nextFen = applyMove(frame.fen, move);
      if (!nextFen) return;

      pendingAnimation.current = {move, from: fromRect || squareEl(from)?.getBoundingClientRect()};
      if (!pendingAnimation.current.from) pendingAnimation.current = null;
      setSelected(null);

      setCore(prev => {
        const frames = prev.frames.slice(0, prev.cursor + 1);
        frames.push(makeFrame(nextFen, move, correct ? 'player' : 'wrong'));
        const next = {
          ...prev,
          frames,
          cursor: frames.length - 1,
          preview: {move, before: position, beforeFen: frame.fen, prefix: '', empty: false}
        };

        if (!correct) {
          return {
            ...next,
            wrongPending: true,
            feedback: {
              state: 'error',
              title: 'Ход неверный',
              note: 'Отмени его кнопкой «Возврат хода».'
            }
          };
        }


        const stepIndex = prev.stepIndex + 1;
        if (stepIndex >= level.steps.length) {
          // level.result — либо настоящий результат партии (1-0/0-1/1/2-1/2,
          // мат/ничья), либо авторская оценка позиции без мата (±/∓/=,
          // «этого достаточно, чтобы засчитать решение»). Админ проставляет
          // его в ReviewView.jsx; не у всех задач он задан, поэтому в
          // заголовок попадает, только если есть.
          const title = level.result ? `Уровень пройден · ${level.result}` : 'Уровень пройден';
          return {
            ...next,
            stepIndex,
            progress: level.progress[1],
            feedback: {state: 'success', title, note: level.solvedNote}
          };
        }
        return {
          ...next,
          stepIndex,
          replyPending: Boolean(level.steps[prev.stepIndex].reply),
          feedback: {state: 'success', title: 'Ход верный', note: 'Смотри ответ соперника.'}
        };
      });

      if (correct) {
        const reply = level.steps[core.stepIndex].reply;
        if (reply) scheduleReply(reply);
      } else {
        // Ошибки уходят на сервер: из них считается честная точность в кабинете.
        onMistake?.();
      }
    },
    [canPlay, frame.fen, frame.position, core.stepIndex, level, scheduleReply, onMistake]
  );

  // ── Ход тапами «откуда → куда» и перетаскиванием — оба сценария из ТЗ.
  const onPointerDown = event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const square = event.target.closest('.square');
    if (!square || !canPlay) return;
    const r = Number(square.dataset.r);
    const c = Number(square.dataset.c);

    // «Своя ли это фигура» больше не проверяется по цвету: chess.js возвращает
    // ходы только для стороны, чей ход, — поэтому пустой список означает и
    // чужую фигуру, и пустую клетку, и связанную фигуру. Такой клик считается
    // выбором клетки назначения для уже поднятой фигуры.
    if (legalMoves(frame.fen, r, c).length === 0) {
      if (selected) attemptMove(selected, [r, c]);
      return;
    }

    // Фигура выделяется сразу по нажатию — ходы видны с первого клика.
    const wasSelected = selected && selected[0] === r && selected[1] === c;
    setSelected([r, c]);
    dragRef.current = {
      from: [r, c],
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: null,
      wasSelected
    };
    // Захват указателя не критичен: если браузер откажет, ход всё равно пройдёт
    try {
      boardRef.current?.setPointerCapture(event.pointerId);
    } catch {}
    event.preventDefault();
  };

  const onPointerMove = event => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
      drag.moved = true;
      const square = squareEl(drag.from);
      const source = square?.querySelector('.piece');
      if (source) {
        const ghost = source.cloneNode(true);
        ghost.className = 'drag-ghost';
        const size = square.getBoundingClientRect().width;
        ghost.style.width = size + 'px';
        ghost.style.height = size + 'px';
        document.body.appendChild(ghost);
        square.classList.add('dragging');
        drag.ghost = ghost;
      }
    }
    if (drag.ghost) {
      drag.ghost.style.left = event.clientX + 'px';
      drag.ghost.style.top = event.clientY + 'px';
    }
  };

  const onPointerUp = event => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    try {
      boardRef.current?.releasePointerCapture?.(event.pointerId);
    } catch {}

    // Позиция «призрака» до удаления — от неё фигура доедет до поля.
    const ghostRect = drag.ghost ? drag.ghost.getBoundingClientRect() : null;
    drag.ghost?.remove();
    squareEl(drag.from)?.classList.remove('dragging');

    if (drag.moved) {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const square = element && element.closest('.square');
      setSelected(null);
      if (square && boardRef.current?.contains(square)) {
        attemptMove(drag.from, [Number(square.dataset.r), Number(square.dataset.c)], ghostRect);
      }
      return;
    }

    // Повторное нажатие по уже выбранной фигуре снимает выделение.
    if (drag.wasSelected) setSelected(null);
  };

  const showFramePreview = (current, before, beforeFen) => {
    if (!current.move) return {text: 'Начальная позиция', empty: true};
    return {
      move: current.move,
      before,
      beforeFen,
      prefix: current.kind === 'reply' ? 'Соперник: ' : '',
      empty: false
    };
  };

  const goTo = delta => {
    setSelected(null);
    setCore(prev => {
      const cursor = prev.cursor + delta;
      if (cursor < 0 || cursor > prev.frames.length - 1) return prev;
      return {
        ...prev,
        cursor,
        preview: showFramePreview(prev.frames[cursor], prev.frames[cursor - 1]?.position, prev.frames[cursor - 1]?.fen)
      };
    });
  };

  const undoMove = () => {
    window.clearTimeout(replyTimer.current);
    replyTimer.current = null;
    setSelected(null);
    setCore(prev => {
      if (prev.frames.length < 2) return prev;
      const frames = prev.frames.slice();
      let stepIndex = prev.stepIndex;
      let feedback;

      if (prev.wrongPending) {
        frames.pop();
        feedback = {state: 'idle', note: 'Позиция вернулась к моменту до ошибки.'};
      } else {
        if (frames[frames.length - 1].kind === 'reply') frames.pop();
        if (frames.length > 1) frames.pop();
        stepIndex = Math.max(0, stepIndex - 1);
        feedback = {state: 'idle', note: 'Последний ход отменён.'};
      }
      // Заголовок — по позиции, к которой вернулись: после отмены ответа
      // соперника ходить снова ученику, а после отмены своего хода — нет.
      feedback.title = turnTitle(frames[frames.length - 1].fen);

      return {
        ...prev,
        frames,
        cursor: frames.length - 1,
        stepIndex,
        wrongPending: false,
        replyPending: false,
        progress: level.progress[0],
        feedback,
        preview: showFramePreview(frames[frames.length - 1], frames[frames.length - 2]?.position, frames[frames.length - 2]?.fen)
      };
    });
    notify?.('Ход отменён.');
  };

  const resetLevel = () => {
    window.clearTimeout(replyTimer.current);
    replyTimer.current = null;
    setSelected(null);
    setCore(initialCore(level));
    notify?.('Позиция сброшена к начальной.');
  };

  // По ТЗ «Решение» только выводит координаты хода, не выполняя его на доске.
  const showSolution = () => {
    setCore(prev => ({...prev, solutionShown: true}));
    notify?.('Решение показано полностью.');
  };

  // Позиция ДО каждого хода (для эмодзи фигуры в подписи) — реплеим решение
  // с начальной позиции уровня один раз за весь список шагов.
  const solutionLines = useMemo(() => {
    let fen = toFen(level);
    return level.steps.map((step, index) => {
      const beforePlayer = positionFromFen(fen);
      const playerBeforeFen = fen;
      const afterPlayerFen = applyMove(fen, step.player);
      // Битое решение сюда не попадает (сервер такие задачи не отдаёт как
      // играбельные), но подстраховка дешевле, чем падение на пустом FEN.
      if (!afterPlayerFen) {
        return {index: index + 1, playerMove: step.player, playerBefore: beforePlayer, playerBeforeFen};
      }
      const beforeReply = positionFromFen(afterPlayerFen);
      fen = step.reply ? applyMove(afterPlayerFen, step.reply) || afterPlayerFen : afterPlayerFen;
      return {
        index: index + 1,
        playerMove: step.player,
        playerBefore: beforePlayer,
        playerBeforeFen,
        replyMove: step.reply,
        replyBefore: step.reply ? beforeReply : null,
        replyBeforeFen: step.reply ? afterPlayerFen : null
      };
    });
  }, [level]);

  return {
    boardRef,
    // Сторона ученика — та, чей ход в начальной позиции. По ней разворачивается
    // доска и подписывается «ход белых/чёрных» в шапке панели.
    side: sideToMove(core.frames[0].fen),
    position: frame.position,
    lastMove: frame.move,
    selected: canPlay ? selected : null,
    targets,
    movable,
    hintFrom,
    locked: !canPlay,
    preview: core.preview,
    feedback: core.feedback,
    progress: core.progress,
    solutionShown: core.solutionShown,
    wrongPending: core.wrongPending,
    solved,
    canPrev: core.cursor > 0,
    canNext: !atLatest,
    canUndo: core.frames.length > 1,
    canReset: core.frames.length > 1,
    solutionLines,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
    onUndo: undoMove,
    onReset: resetLevel,
    onSolution: showSolution,
    squareName
  };
}
