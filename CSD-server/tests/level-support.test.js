require('dotenv').config();
const { checkTrainerSupport } = require('../src/shared/level-support');

const emptyBoard = () => Array.from({ length: 8 }, () => Array(8).fill(''));
const castling = { wOO: false, wOOO: false, bOO: false, bOOO: false };

const level = extra => ({ turn: 'w', castling, ...extra });

describe('checkTrainerSupport: решение проигрывается по правилам', () => {
  it('пропускает обычную задачу за белых', () => {
    const position = emptyBoard();
    position[0][6] = '♚';
    position[4][3] = '♕';
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [4, 3], to: [0, 3] }, reply: null }] })
    );
    expect(res).toEqual({ supported: true, reason: null });
  });

  it('пропускает задачу за чёрных', () => {
    const position = emptyBoard();
    position[0][6] = '♚';
    position[3][3] = '♛';
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ turn: 'b', position, steps: [{ player: { from: [3, 3], to: [7, 3] }, reply: null }] })
    );
    expect(res.supported).toBe(true);
  });

  it('пропускает рокировку — раньше она считалась неподдерживаемой', () => {
    const position = emptyBoard();
    position[0][4] = '♚';
    position[7][4] = '♔';
    position[7][7] = '♖';
    const res = checkTrainerSupport(
      level({
        position,
        castling: { wOO: true, wOOO: false, bOO: false, bOOO: false },
        steps: [{ player: { from: [7, 4], to: [7, 6] }, reply: null }]
      })
    );
    expect(res.supported).toBe(true);
  });

  it('пропускает превращение пешки', () => {
    const position = emptyBoard();
    position[0][0] = '♚';
    position[1][7] = '♙';
    position[7][4] = '♔';
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
    position[3][3] = '♞';
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
    position[4][3] = '♕';
    position[7][6] = '♔';
    const res = checkTrainerSupport(
      level({ position, steps: [{ player: { from: [4, 3], to: [2, 2] }, reply: null }] })
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
        steps: [{ player: { from: [4, 3], to: [4, 7] }, reply: { from: [0, 6], to: [4, 0] } }]
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
