const FILES = 'abcdefgh';
const WHITE_PIECES = '♙♖♘♗♕♔';
const isWhite = piece => Boolean(piece) && WHITE_PIECES.includes(piece);
const squareName = (r, c) => FILES[c] + (8 - r);

// Уровни: начальная позиция + алгоритм решения по координатам (пары ходов
// «ход ученика → ответ соперника»), как задаёт их админ-панель.
// Единственный уровень платформы: начальная позиция и алгоритм решения по
// координатам (пары ходов «ход ученика → обязательный ответ соперника», ТЗ 3.2).
// Мат в два хода: 1. d4–d8+ — у чёрных единственный ответ c8–d8, 2. d1–d8#.
// Королю g8 мешают собственные пешки f7, g7, h7.
const LEVEL = {
  position: [
    ['', '', '♜', '', '', '', '♚', ''],
    ['♟', '♟', '', '', '', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '♕', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '', '', '', '♙', '♙', '♙'],
    ['', '', '', '♖', '', '', '♔', '']
  ],
  steps: [
    {player: {from: [4, 3], to: [0, 3]}, reply: {from: [0, 2], to: [0, 3]}},
    {player: {from: [7, 3], to: [0, 3]}, reply: null}
  ],
  name: 'Уровень 01',
  solvedNote: 'Мат по восьмой горизонтали.',
  hint: '—',
  progress: [0, 100]
};

const clone = position => position.map(row => row.slice());

// Спрайты фигур: символ позиции -> файл картинки и подпись для screen reader.
const PIECE_ART = {
  '♙': ['wP', 'белая пешка'],
  '♖': ['wR', 'белая ладья'],
  '♘': ['wN', 'белый конь'],
  '♗': ['wB', 'белый слон'],
  '♕': ['wQ', 'белый ферзь'],
  '♔': ['wK', 'белый король'],
  '♟': ['bP', 'чёрная пешка'],
  '♜': ['bR', 'чёрная ладья'],
  '♞': ['bN', 'чёрный конь'],
  '♝': ['bB', 'чёрный слон'],
  '♛': ['bQ', 'чёрный ферзь'],
  '♚': ['bK', 'чёрный король']
};

function createPiece(piece) {
  const art = PIECE_ART[piece];
  if (!art) return null;
  const img = document.createElement('img');
  img.className = 'piece ' + (isWhite(piece) ? 'white' : 'black');
  img.src = 'assets/pieces/' + art[0] + '.png';
  img.alt = art[1];
  img.draggable = false;
  return img;
}

function renderBoard(el, position) {
  el.innerHTML = '';
  position.forEach((row, r) => row.forEach((piece, c) => {
    const square = document.createElement('div');
    square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
    square.dataset.r = r;
    square.dataset.c = c;
    const art = createPiece(piece);
    if (art) square.appendChild(art);
    el.appendChild(square);
  }));
}

// Ходы фигур: базовые правила без рокировки, взятия на проходе и превращения.
const SLIDES = {
  '♖': [[1, 0], [-1, 0], [0, 1], [0, -1]],
  '♗': [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  '♕': [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
};
const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = SLIDES['♕'];
const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function legalMoves(position, r, c) {
  const piece = position[r][c];
  if (!piece || !isWhite(piece)) return [];
  const moves = [];
  const free = (rr, cc) => onBoard(rr, cc) && !position[rr][cc];
  const enemy = (rr, cc) => onBoard(rr, cc) && position[rr][cc] && !isWhite(position[rr][cc]);
  const add = (rr, cc) => {
    if (onBoard(rr, cc) && !(position[rr][cc] && isWhite(position[rr][cc]))) moves.push([rr, cc]);
  };

  if (piece === '♙') {
    if (free(r - 1, c)) {
      moves.push([r - 1, c]);
      if (r === 6 && free(r - 2, c)) moves.push([r - 2, c]);
    }
    [c - 1, c + 1].forEach(cc => { if (enemy(r - 1, cc)) moves.push([r - 1, cc]); });
  } else if (piece === '♘') {
    KNIGHT_STEPS.forEach(([dr, dc]) => add(r + dr, c + dc));
  } else if (piece === '♔') {
    KING_STEPS.forEach(([dr, dc]) => add(r + dr, c + dc));
  } else if (SLIDES[piece]) {
    SLIDES[piece].forEach(([dr, dc]) => {
      let rr = r + dr;
      let cc = c + dc;
      while (onBoard(rr, cc)) {
        if (position[rr][cc]) {
          if (!isWhite(position[rr][cc])) moves.push([rr, cc]);
          break;
        }
        moves.push([rr, cc]);
        rr += dr;
        cc += dc;
      }
    });
  }
  return moves;
}

const toast = document.querySelector('.toast');
let toastTimer;
function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}


// Экран решения задачи (ТЗ 4.3). Один и тот же тренажёр поднимается на каждом
// блоке с data-trainer, поэтому доска в hero и доска в демо ведут себя одинаково.
function createTrainer(root, level) {
  const board = root.querySelector('[data-board]');
  if (!board || !level) return;

  const preview = root.querySelector('[data-role="preview"]');
  const solutionField = root.querySelector('[data-role="solution"]');
  const feedback = root.querySelector('[data-role="feedback"]');
  const levelName = root.querySelector('[data-role="level-name"]');
  const progressValue = root.querySelector('[data-role="progress-value"]');
  const progressFill = root.querySelector('[data-role="progress-fill"]');
  const undoButton = root.querySelector('[data-demo="undo"]');
  const prevButton = root.querySelector('[data-demo="prev"]');
  const nextButton = root.querySelector('[data-demo="next"]');
  const resetButton = root.querySelector('[data-demo="reset"]');
  const solutionButton = root.querySelector('[data-demo="solution"]');

  const REPLY_DELAY = 550;
  const [progressBase, progressSolved] = level.progress || [0, 0];

  // frames — история позиций для кнопок «Назад» / «Вперёд».
  let frames = [];
  let cursor = 0;
  let stepIndex = 0;
  let wrongPending = false;
  let replyTimer = null;
  let selected = null;
  let drag = null;
  let solutionShown = false;

  const currentFrame = () => frames[cursor];
  const atLatest = () => cursor === frames.length - 1;
  const solved = () => stepIndex >= level.steps.length;
  const canPlay = () => atLatest() && !wrongPending && !solved() && !replyTimer;
  const moveText = move => squareName(move.from[0], move.from[1]) + '–' + squareName(move.to[0], move.to[1]);

  function applyMove(position, move) {
    const next = clone(position);
    next[move.to[0]][move.to[1]] = next[move.from[0]][move.from[1]];
    next[move.from[0]][move.from[1]] = '';
    return next;
  }

  function pushFrame(position, move, kind) {
    frames = frames.slice(0, cursor + 1);
    frames.push({position, move, kind});
    cursor = frames.length - 1;
  }

  function setFeedback(state, title, note) {
    if (!feedback) return;
    feedback.className = 'feedback ' + state;
    feedback.querySelector('span').textContent = state === 'success' ? '✓' : state === 'error' ? '!' : '○';
    feedback.querySelector('strong').textContent = title;
    feedback.querySelector('small').textContent = note;
  }

  function setPreview(text, isEmpty) {
    if (!preview) return;
    preview.className = isEmpty ? 'empty' : '';
    preview.textContent = text;
  }

  function solutionCell(tag, text) {
    const cell = document.createElement(tag);
    cell.textContent = text;
    solutionField.appendChild(cell);
  }

  function clearSolutionField() {
    if (!solutionField) return;
    solutionField.textContent = '';
    solutionField.classList.remove('filled');
    solutionCell('span', '—');
    solutionField.parentElement.classList.remove('filled');
  }

  // Полный алгоритм уровня: два столбца с подписями, чей это ход.
  function fillSolutionField() {
    if (!solutionField) return;
    solutionField.textContent = '';
    solutionField.classList.add('filled');
    solutionCell('em', 'ваш ход');
    solutionCell('em', 'ответ соперника');
    level.steps.forEach((step, index) => {
      solutionCell('b', (index + 1) + '. ' + moveText(step.player));
      solutionCell('i', step.reply ? moveText(step.reply) : '—');
    });
    solutionField.parentElement.classList.add('filled');
  }

  function setProgress(percent) {
    if (progressValue) progressValue.textContent = percent + '%';
    if (progressFill) progressFill.style.width = percent + '%';
  }

  function render() {
    const frame = currentFrame();
    renderBoard(board, frame.position);
    board.classList.toggle('locked', !canPlay());
    board.querySelectorAll('.square').forEach(square => {
      const r = Number(square.dataset.r);
      const c = Number(square.dataset.c);
      if (canPlay() && isWhite(frame.position[r][c])) square.classList.add('movable');
      if (frame.move && ((frame.move.from[0] === r && frame.move.from[1] === c) || (frame.move.to[0] === r && frame.move.to[1] === c))) {
        square.classList.add('last-move');
      }
    });
    if (selected && canPlay()) {
      board.querySelector(`[data-r="${selected[0]}"][data-c="${selected[1]}"]`)?.classList.add('selected');
      legalMoves(frame.position, selected[0], selected[1]).forEach(([r, c]) => {
        const square = board.querySelector(`[data-r="${r}"][data-c="${c}"]`);
        if (!square) return;
        square.classList.add('target');
        if (frame.position[r][c]) square.classList.add('capture');
      });
    }
    // Фигуру, которой нужно ходить, показываем только после нажатия «Решение».
    if (solutionShown && !solved() && atLatest() && !wrongPending) {
      const [hr, hc] = level.steps[stepIndex].player.from;
      board.querySelector(`[data-r="${hr}"][data-c="${hc}"]`)?.classList.add('hint-from');
    }

    if (prevButton) prevButton.disabled = cursor === 0;
    if (nextButton) nextButton.disabled = atLatest();
    if (resetButton) resetButton.disabled = frames.length < 2;
    if (solutionButton) solutionButton.disabled = solved();
    if (undoButton) {
      undoButton.disabled = frames.length < 2;
      undoButton.classList.toggle('attention', wrongPending);
    }
  }

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function squareRect(coords) {
    return board.querySelector(`[data-r="${coords[0]}"][data-c="${coords[1]}"]`)?.getBoundingClientRect();
  }

  // Перерисовка с проездом фигуры от старого поля к новому.
  function renderMove(move, animate, fromRect) {
    const allowed = (animate || fromRect) && !reducedMotion?.matches;
    const from = allowed ? (fromRect || squareRect(move.from)) : null;
    render();
    if (!from) return;
    const to = squareRect(move.to);
    const piece = board.querySelector(`[data-r="${move.to[0]}"][data-c="${move.to[1]}"] .piece`);
    if (!piece || !to || !piece.animate) return;
    piece.classList.add('moving');
    piece.animate(
      [{transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`}, {transform: 'translate(0, 0)'}],
      {duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)'}
    ).onfinish = () => piece.classList.remove('moving');
  }

  // Показывает координаты хода, которым получена текущая позиция.
  function showFramePreview() {
    const frame = currentFrame();
    if (!frame.move) {
      setPreview('Начальная позиция', true);
      return;
    }
    setPreview(frame.kind === 'reply' ? 'Соперник: ' + moveText(frame.move) : moveText(frame.move), false);
  }

  function playReply(reply) {
    replyTimer = setTimeout(() => {
      replyTimer = null;
      pushFrame(applyMove(currentFrame().position, reply), reply, 'reply');
      setPreview('Соперник: ' + moveText(reply), false);
      setFeedback('idle', 'Ход белых', 'Соперник ответил. Ищи следующий ход.');
      renderMove(reply, true);
    }, REPLY_DELAY);
  }

  function attemptMove(from, to, animate, fromRect) {
    if (!canPlay()) return;
    const position = currentFrame().position;
    const legal = legalMoves(position, from[0], from[1]).some(([r, c]) => r === to[0] && c === to[1]);
    if (!legal) return;

    selected = null;
    const move = {from, to};
    const expected = level.steps[stepIndex].player;
    const correct = expected.from[0] === from[0] && expected.from[1] === from[1]
      && expected.to[0] === to[0] && expected.to[1] === to[1];

    pushFrame(applyMove(position, move), move, correct ? 'player' : 'wrong');
    setPreview(moveText(move), false);

    if (!correct) {
      wrongPending = true;
      setFeedback('error', 'Ход неверный', 'Отмени его кнопкой «Возврат хода».');
      renderMove(move, animate, fromRect);
      return;
    }

    const reply = level.steps[stepIndex].reply;
    stepIndex += 1;
    if (solved()) {
      setFeedback('success', 'Уровень пройден', level.solvedNote);
      setProgress(progressSolved);
      renderMove(move, animate, fromRect);
      return;
    }
    setFeedback('success', 'Ход верный', 'Смотри ответ соперника.');
    playReply(reply);
    renderMove(move, animate, fromRect);
  }

  function undoMove() {
    if (frames.length < 2) return;
    clearTimeout(replyTimer);
    replyTimer = null;
    cursor = frames.length - 1;

    if (wrongPending) {
      frames.pop();
      wrongPending = false;
      setFeedback('idle', 'Ход белых', 'Позиция вернулась к моменту до ошибки.');
    } else {
      if (currentFrame().kind === 'reply') frames.pop();
      if (frames.length > 1) frames.pop();
      stepIndex = Math.max(0, stepIndex - 1);
      setFeedback('idle', 'Ход белых', 'Последний ход отменён.');
      setProgress(progressBase);
    }
    cursor = frames.length - 1;
    selected = null;
    showFramePreview();
    render();
    notify('Ход отменён.');
  }

  function resetLevel(silent) {
    clearTimeout(replyTimer);
    replyTimer = null;
    frames = [{position: clone(level.position), move: null, kind: 'start'}];
    cursor = 0;
    stepIndex = 0;
    wrongPending = false;
    selected = null;
    solutionShown = false;
    setPreview(level.hint, true);
    clearSolutionField();
    setFeedback('idle', 'Ход белых', 'Сделай первый ход алгоритма.');
    setProgress(progressBase);
    render();
    if (!silent) notify('Позиция сброшена к начальной.');
  }

  // Ход тапами «откуда → куда» и перетаскиванием — оба сценария из ТЗ.
  function squareFromPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    const square = element && element.closest('.square');
    return square && board.contains(square) ? square : null;
  }

  board.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const square = event.target.closest('.square');
    if (!square || !canPlay()) return;
    const r = Number(square.dataset.r);
    const c = Number(square.dataset.c);
    const piece = currentFrame().position[r][c];

    if (!isWhite(piece)) {
      if (selected) attemptMove(selected, [r, c], true);
      return;
    }

    // Фигура выделяется сразу по нажатию — ходы видны с первого клика.
    const wasSelected = selected && selected[0] === r && selected[1] === c;
    selected = [r, c];
    setPreview(squareName(r, c) + '–…', false);
    render();

    drag = {
      from: [r, c],
      square: board.querySelector(`[data-r="${r}"][data-c="${c}"]`),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ghost: null,
      wasSelected
    };
    event.preventDefault();
  });

  window.addEventListener('pointermove', event => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
      drag.moved = true;
      const source = drag.square.querySelector('.piece');
      if (source) {
        drag.ghost = source.cloneNode(true);
        drag.ghost.className = 'drag-ghost';
        const size = drag.square.getBoundingClientRect().width;
        drag.ghost.style.width = size + 'px';
        drag.ghost.style.height = size + 'px';
        document.body.appendChild(drag.ghost);
        drag.square.classList.add('dragging');
      }
    }
    if (drag.ghost) {
      drag.ghost.style.left = event.clientX + 'px';
      drag.ghost.style.top = event.clientY + 'px';
    }
  });

  window.addEventListener('pointerup', event => {
    if (!drag) return;
    const current = drag;
    drag = null;
    // Позиция «призрака» до удаления — от неё фигура доедет до поля.
    const ghostRect = current.ghost ? current.ghost.getBoundingClientRect() : null;
    current.ghost?.remove();
    current.square.classList.remove('dragging');

    if (current.moved) {
      const target = squareFromPoint(event.clientX, event.clientY);
      selected = null;
      if (target) attemptMove(current.from, [Number(target.dataset.r), Number(target.dataset.c)], false, ghostRect);
      else render();
      return;
    }

    // Повторное нажатие по уже выбранной фигуре снимает выделение.
    if (current.wasSelected) {
      selected = null;
      showFramePreview();
      render();
    }
  });

  prevButton?.addEventListener('click', () => {
    if (cursor === 0) return;
    cursor -= 1;
    selected = null;
    showFramePreview();
    render();
  });

  nextButton?.addEventListener('click', () => {
    if (atLatest()) return;
    cursor += 1;
    selected = null;
    showFramePreview();
    render();
  });

  undoButton?.addEventListener('click', undoMove);
  resetButton?.addEventListener('click', () => resetLevel(false));

  // По ТЗ «Решение» только выводит координаты хода, не выполняя его на доске.
  solutionButton?.addEventListener('click', () => {
    solutionShown = true;
    fillSolutionField();
    render();
    notify('Решение показано полностью.');
  });

  if (levelName) levelName.textContent = level.name;
  resetLevel(true);
}

document.querySelectorAll('[data-trainer]').forEach(root => createTrainer(root, LEVEL));

// Карточка в hero — статичная витрина того же уровня, без обработчиков.
document.querySelectorAll('[data-showcase]').forEach(root => {
  const board = root.querySelector('[data-board]');
  if (board) renderBoard(board, LEVEL.position);
  const levelName = root.querySelector('[data-role="level-name"]');
  if (levelName) levelName.textContent = LEVEL.name;
});

// Бегущая строка: клонируем группу слов, пока лента не перекроет экран с запасом,
// и сдвигаем ровно на ширину одной группы — стык получается незаметным.
const marqueeTrack = document.querySelector('.marquee-track');
if (marqueeTrack) {
  const marqueeViewport = marqueeTrack.parentElement;
  const marqueeGroup = marqueeTrack.querySelector('.marquee-group');
  const MARQUEE_SPEED = 70; // пикселей в секунду

  function buildMarquee() {
    const groupWidth = marqueeGroup.getBoundingClientRect().width;
    if (!groupWidth) return;
    const copies = Math.max(2, Math.ceil(marqueeViewport.clientWidth / groupWidth) + 1);
    const shift = groupWidth + 'px';
    const current = marqueeTrack.querySelectorAll('.marquee-group').length;
    if (current === copies && marqueeTrack.style.getPropertyValue('--marquee-shift') === shift) return;

    marqueeTrack.querySelectorAll('.marquee-group').forEach((group, index) => {
      if (index > 0) group.remove();
    });
    for (let i = 1; i < copies; i++) {
      marqueeTrack.appendChild(marqueeGroup.cloneNode(true));
    }
    marqueeTrack.style.setProperty('--marquee-shift', shift);
    marqueeTrack.style.setProperty('--marquee-duration', (groupWidth / MARQUEE_SPEED) + 's');
  }

  buildMarquee();

  // Следим и за лентой, и за самой группой: ширина группы меняется, когда
  // подгружается шрифт, а ширина ленты — при ресайзе окна.
  let marqueeResizeTimer;
  const rebuildMarquee = () => {
    clearTimeout(marqueeResizeTimer);
    marqueeResizeTimer = setTimeout(buildMarquee, 200);
  };
  if (window.ResizeObserver) {
    const marqueeObserver = new ResizeObserver(rebuildMarquee);
    marqueeObserver.observe(marqueeViewport);
    marqueeObserver.observe(marqueeGroup);
  } else {
    document.fonts?.ready.then(buildMarquee);
    window.addEventListener('resize', rebuildMarquee);
  }
}

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
menuToggle?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileMenu.setAttribute('aria-hidden', String(!open));
});
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Открыть меню');
  mobileMenu.setAttribute('aria-hidden', 'true');
}));

const revealTargets = document.querySelectorAll('.reveal');
if (!('IntersectionObserver' in window)) {
  revealTargets.forEach(el => el.classList.add('is-visible'));
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, {threshold: 0.12});
if ('IntersectionObserver' in window) revealTargets.forEach(el => observer.observe(el));

// Что уже в зоне видимости — показываем сразу, не дожидаясь наблюдателя:
// иначе при его сбое первый экран остался бы пустым.
function revealVisibleNow() {
  revealTargets.forEach(el => {
    if (el.classList.contains('is-visible')) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('is-visible');
  });
}
revealVisibleNow();
window.addEventListener('load', revealVisibleNow);

// Лёгкое движение декоративного слоя в hero.
const visual = document.querySelector('.hero-visual');
window.addEventListener('pointermove', e => {
  if (!visual || window.innerWidth < 900) return;
  const x = (e.clientX / window.innerWidth - .5) * 10;
  const y = (e.clientY / window.innerHeight - .5) * 10;
  visual.style.transform = `translate(${x}px, ${y}px)`;
});
