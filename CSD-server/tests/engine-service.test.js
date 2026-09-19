const { pvToSteps } = require('../src/modules/engine/engine.service');
const rules = require('../src/shared/chess-rules');

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const sq = name => rules.parseSquare(name);

describe('разбор главного варианта в шаги решения', () => {
  it('чередует ходы: чётные — ученик, нечётные — ответ системы', () => {
    const { steps } = pvToSteps(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    expect(steps).toHaveLength(2);
    expect(steps[0].player).toEqual({ from: sq('e2'), to: sq('e4') });
    expect(steps[0].reply).toEqual({ from: sq('e7'), to: sq('e5') });
    expect(steps[1].player).toEqual({ from: sq('g1'), to: sq('f3') });
    expect(steps[1].reply).toEqual({ from: sq('b8'), to: sq('c6') });
  });

  it('оставляет reply = null, если вариант обрывается на ходе ученика', () => {
    const { steps } = pvToSteps(START_FEN, ['e2e4', 'e7e5', 'g1f3']);
    expect(steps).toHaveLength(2);
    expect(steps[1].player).toEqual({ from: sq('g1'), to: sq('f3') });
    expect(steps[1].reply).toBeNull();
  });

  it('корректно обрабатывает вариант из одного хода (мат в один)', () => {
    const { steps } = pvToSteps(START_FEN, ['e2e4']);
    expect(steps).toHaveLength(1);
    expect(steps[0].reply).toBeNull();
  });

  it('возвращает пустой список для пустого варианта', () => {
    const { steps } = pvToSteps(START_FEN, []);
    expect(steps).toEqual([]);
  });

  it('обрывает разбор на первом ходе, который не воспроизводится в позиции', () => {
    const { steps } = pvToSteps(START_FEN, ['e2e4', 'a1a8', 'g1f3']);
    expect(steps).toHaveLength(1);
    expect(steps[0].player).toEqual({ from: sq('e2'), to: sq('e4') });
    expect(steps[0].reply).toBeNull();
  });

  it('передаёт фигуру превращения в шаг — applyMove сам разберётся с ней', () => {
    const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    const { steps, warnings } = pvToSteps(fen, ['a7a8q']);
    expect(steps).toHaveLength(1);
    expect(steps[0].player.promotion).toBe('q');
    expect(warnings).toEqual([]);
  });

  it('рокировка больше не требует предупреждения — applyMove переносит и ладью', () => {
    const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';
    const { steps, warnings } = pvToSteps(fen, ['e1g1']);
    expect(steps).toHaveLength(1);
    expect(steps[0].player).toEqual({ from: sq('e1'), to: sq('g1') });
    expect(warnings).toEqual([]);
  });

  it('взятие на проходе больше не требует предупреждения — applyMove снимет пешку', () => {
    const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
    const { steps, warnings } = pvToSteps(fen, ['e5d6']);
    expect(steps[0].player).toEqual({ from: sq('e5'), to: sq('d6') });
    expect(warnings).toEqual([]);
  });

  it('не выдаёт предупреждений для обычных ходов', () => {
    const { warnings } = pvToSteps(START_FEN, ['e2e4', 'e7e5']);
    expect(warnings).toEqual([]);
  });
});

describe('сквозная проверка: FEN → pvToSteps → applyMove даёт правильную доску', () => {
  it('рокировка: ладья реально оказывается на f1, а не только король на g1', () => {
    const fen = '4k3/8/8/8/8/8/8/4K2R w K - 0 1';
    const { steps } = pvToSteps(fen, ['e1g1']);
    const position = rules.applyMove(rules.fromFen(fen).position, steps[0].player);
    expect(position[7][6]).toBe('♔');
    expect(position[7][5]).toBe('♖');
    expect(position[7][7]).toBe('');
  });

  it('взятие на проходе: снятая пешка реально пропадает с доски', () => {
    const fen = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';
    const { steps } = pvToSteps(fen, ['e5d6']);
    const position = rules.applyMove(rules.fromFen(fen).position, steps[0].player);
    expect(position[2][3]).toBe('♙');
    expect(position[3][3]).toBe('');
  });

  it('превращение: пешка реально становится ферзём на доске', () => {
    const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    const { steps } = pvToSteps(fen, ['a7a8q']);
    const position = rules.applyMove(rules.fromFen(fen).position, steps[0].player);
    expect(position[0][0]).toBe('♕');
  });
});
