const rules = require('../src/shared/chess-rules');

const empty = () => Array.from({ length: 8 }, () => Array(8).fill(''));
const at = (position, square) => {
  const [r, c] = rules.parseSquare(square);
  return position[r][c];
};
const move = (from, to, promotion) => ({
  from: rules.parseSquare(from),
  to: rules.parseSquare(to),
  ...(promotion ? { promotion } : {})
});

describe('applyMove — обычные ходы', () => {
  it('просто переставляет фигуру, ничего больше не трогая', () => {
    const p = empty();
    p[6][4] = '♙'; // e2
    const next = rules.applyMove(p, move('e2', 'e4'));
    expect(at(next, 'e2')).toBe('');
    expect(at(next, 'e4')).toBe('♙');
  });

  it('снимает фигуру соперника на обычном взятии', () => {
    const p = empty();
    p[4][4] = '♙'; // e4
    p[3][3] = '♟'; // d5
    const next = rules.applyMove(p, move('e4', 'd5'));
    expect(at(next, 'e4')).toBe('');
    expect(at(next, 'd5')).toBe('♙');
  });

  it('не мутирует исходную позицию', () => {
    const p = empty();
    p[6][4] = '♙';
    const before = JSON.stringify(p);
    rules.applyMove(p, move('e2', 'e4'));
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('applyMove — рокировка', () => {
  it('короткая рокировка белых переносит и короля, и ладью', () => {
    const p = empty();
    p[7][4] = '♔'; // e1
    p[7][7] = '♖'; // h1
    const next = rules.applyMove(p, move('e1', 'g1'));
    expect(at(next, 'e1')).toBe('');
    expect(at(next, 'g1')).toBe('♔');
    expect(at(next, 'h1')).toBe('');
    expect(at(next, 'f1')).toBe('♖');
  });

  it('длинная рокировка белых переносит ладью с a1 на d1', () => {
    const p = empty();
    p[7][4] = '♔';
    p[7][0] = '♖'; // a1
    const next = rules.applyMove(p, move('e1', 'c1'));
    expect(at(next, 'c1')).toBe('♔');
    expect(at(next, 'a1')).toBe('');
    expect(at(next, 'd1')).toBe('♖');
  });

  it('короткая рокировка чёрных переносит ладью с h8 на f8', () => {
    const p = empty();
    p[0][4] = '♚'; // e8
    p[0][7] = '♜'; // h8
    const next = rules.applyMove(p, move('e8', 'g8'));
    expect(at(next, 'g8')).toBe('♚');
    expect(at(next, 'h8')).toBe('');
    expect(at(next, 'f8')).toBe('♜');
  });

  it('длинная рокировка чёрных переносит ладью с a8 на d8', () => {
    const p = empty();
    p[0][4] = '♚';
    p[0][0] = '♜';
    const next = rules.applyMove(p, move('e8', 'c8'));
    expect(at(next, 'c8')).toBe('♚');
    expect(at(next, 'a8')).toBe('');
    expect(at(next, 'd8')).toBe('♜');
  });

  it('обычный ход королём на 1 клетку не путается с рокировкой', () => {
    const p = empty();
    p[7][4] = '♔';
    const next = rules.applyMove(p, move('e1', 'f1'));
    expect(at(next, 'f1')).toBe('♔');
  });
});

describe('applyMove — взятие на проходе', () => {
  it('снимает пешку соперника при взятии на проходе (белые бьют)', () => {
    const p = empty();
    p[3][4] = '♙'; // e5
    p[3][3] = '♟'; // d5 — только что прошла d7-d5
    const next = rules.applyMove(p, move('e5', 'd6'));
    expect(at(next, 'd6')).toBe('♙');
    expect(at(next, 'e5')).toBe('');
    expect(at(next, 'd5')).toBe(''); // снятая пешка
  });

  it('снимает пешку соперника при взятии на проходе (чёрные бьют)', () => {
    const p = empty();
    p[4][4] = '♟'; // e4
    p[4][3] = '♙'; // d4 — только что прошла d2-d4
    const next = rules.applyMove(p, move('e4', 'd3'));
    expect(at(next, 'd3')).toBe('♟');
    expect(at(next, 'd4')).toBe('');
  });

  it('обычное диагональное взятие (клетка назначения занята) пешку рядом не трогает', () => {
    const p = empty();
    p[4][4] = '♙'; // e4
    p[3][3] = '♟'; // d5 — стоит на самой клетке взятия
    const next = rules.applyMove(p, move('e4', 'd5'));
    expect(at(next, 'd5')).toBe('♙');
    // соседняя клетка (d4) изначально пуста — и должна остаться пустой,
    // а не "случайно" очищена логикой en passant
    expect(at(next, 'd4')).toBe('');
  });
});

describe('applyMove — превращение пешки', () => {
  it('превращает белую пешку в ферзя на 8-й горизонтали', () => {
    const p = empty();
    p[1][0] = '♙'; // a7
    const next = rules.applyMove(p, move('a7', 'a8', 'q'));
    expect(at(next, 'a8')).toBe('♕');
  });

  it('превращает чёрную пешку в коня на 1-й горизонтали', () => {
    const p = empty();
    p[6][0] = '♟'; // a2
    const next = rules.applyMove(p, move('a2', 'a1', 'n'));
    expect(at(next, 'a1')).toBe('♞');
  });

  it('без указания фигуры превращения оставляет пешку как есть', () => {
    const p = empty();
    p[1][0] = '♙';
    const next = rules.applyMove(p, move('a7', 'a8'));
    expect(at(next, 'a8')).toBe('♙');
  });
});
