require('dotenv').config();
const { checkTrainerSupport } = require('../src/shared/level-support');

// Пустая доска, на которую фикстуры доставляют нужные фигуры. Координаты — как
// в БД: [0] — 8-я горизонталь, [7] — 1-я; [*][0] — вертикаль a.
const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(''));
const castling = { wOO: false, wOOO: false, bOO: false, bOOO: false };

const level = extra => ({ turn: 'w', castling, ...extra });

describe('checkTrainerSupport: решение проигрывается по правилам', () => {
  it('пропускает обычную задачу за белых', () => {
    const position = emptyBoard();
    position[0][6] = '♚'; // g8
    position[4][3] = '♕'; // d4
    position[7][6] = '♔'; // g1
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [4, 3], to: [0, 3] }, reply: null }] })
    );
    expect(res).toEqual({ supported: true, reason: null });
  });

  it('пропускает задачу за чёрных', () => {
    const position = emptyBoard();
    position[0][6] = '♚'; // g8
    position[3][3] = '♛'; // d5 — ходит ученик
    position[7][6] = '♔'; // g1
    const res = checkTrainerSupport(
      level({ turn: 'b', position, steps: [{ player: { from: [3, 3], to: [7, 3] }, reply: null }] })
    );
    expect(res.supported).toBe(true);
  });

  it('пропускает рокировку — раньше она считалась неподдерживаемой', () => {
    const position = emptyBoard();
    position[0][4] = '♚'; // e8
    position[7][4] = '♔'; // e1
    position[7][7] = '♖'; // h1
    const res = checkTrainerSupport(
      level({
        position,
        castling: { wOO: true, wOOO: false, bOO: false, bOOO: false },
        steps: [{ player: { from: [7, 4], to: [7, 6] }, reply: null }] // 0-0
      })
    );
    expect(res.supported).toBe(true);
  });

  it('пропускает превращение пешки', () => {
    const position = emptyBoard();
    position[0][0] = '♚'; // a8
    position[1][7] = '♙'; // h7 — идёт на h8
    position[7][4] = '♔'; // e1
    const res = checkTrainerSupport(
      level({
        position,
        steps: [{ player: { from: [1, 7], to: [0, 7], promotion: 'q' }, reply: null }]
      })
    );
    expect(res.supported).toBe(true);
  });

  it('ловит рассогласование очереди хода и первого хода решения', () => {
    const position = emptyBoard();
    position[0][6] = '♚';
    position[3][3] = '♞'; // чёрный конь, а ход по данным — белых
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [3, 3], to: [1, 4] }, reply: null }] })
    );
    expect(res.supported).toBe(false);
    expect(res.reason).toContain('Очередь хода');
  });

  it('ловит невозможный ход в решении', () => {
    const position = emptyBoard();
    position[0][6] = '♚';
    position[4][3] = '♕'; // ферзь d4
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [4, 3], to: [2, 2] }, reply: null }] }) // d4-c6: так ферзь не ходит
    );
    expect(res.supported).toBe(false);
    expect(res.reason).toContain('невозможный ход');
  });

  it('ловит невозможный ход в ответе соперника', () => {
    const position = emptyBoard();
    position[0][6] = '♚';
    position[4][3] = '♕';
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({
        position,
        steps: [{ player: { from: [4, 3], to: [4, 7] }, reply: { from: [0, 6], to: [4, 0] } }] // король так не ходит
      })
    );
    expect(res.supported).toBe(false);
    expect(res.reason).toContain('невозможный ход');
  });

  it('ловит битую позицию и пустой алгоритм', () => {
    expect(checkTrainerSupport(level({ position: [], steps: [] })).reason).toContain('повреждена');

    const position = emptyBoard();
    position[0][6] = '♚';
    position[7][6] = '♔';
    expect(checkTrainerSupport(level({ position, steps: [] })).reason).toContain('не задан');
  });

  it('ловит нелегальную позицию (нет короля)', () => {
    const position = emptyBoard();
    position[4][3] = '♕';
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [4, 3], to: [0, 3] }, reply: null }] })
    );
    expect(res.supported).toBe(false);
  });
});
