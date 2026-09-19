const rules = require('../src/shared/chess-rules');

const empty = () => Array.from({ length: 8 }, () => Array(8).fill(''));

function withKings(extra = {}) {
  const p = empty();
  p[7][4] = '♔';
  p[0][4] = '♚';
  Object.entries(extra).forEach(([square, piece]) => {
    const [r, c] = rules.parseSquare(square);
    p[r][c] = piece;
  });
  return p;
}

const NO_CASTLING = { wOO: false, wOOO: false, bOO: false, bOOO: false };
const ALL_CASTLING = { wOO: true, wOOO: true, bOO: true, bOOO: true };

describe('координаты и нотация', () => {
  it('переводит [r,c] в имя поля', () => {
    expect(rules.squareName([0, 0])).toBe('a8');
    expect(rules.squareName([7, 7])).toBe('h1');
    expect(rules.squareName([6, 4])).toBe('e2');
  });

  it('парсит имя поля обратно в [r,c]', () => {
    expect(rules.parseSquare('a8')).toEqual([0, 0]);
    expect(rules.parseSquare('h1')).toEqual([7, 7]);
    expect(rules.parseSquare('e2')).toEqual([6, 4]);
  });

  it('конвертирует ход в UCI и обратно', () => {
    expect(rules.moveToUci({ from: [6, 4], to: [4, 4] })).toBe('e2e4');
    expect(rules.uciToMove('e2e4')).toEqual({ from: [6, 4], to: [4, 4] });
  });
});

describe('FEN', () => {
  it('собирает FEN стартовой позиции', () => {
    const start = rules.fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(rules.toFen(start)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('переживает round-trip для произвольной позиции', () => {
    const fen = '4k3/8/8/3p4/8/8/4P3/4K2R b K - 3 17';
    expect(rules.toFen(rules.fromFen(fen))).toBe(fen);
  });

  it('ставит очередь хода чёрных и прочерк при отсутствии рокировки', () => {
    const fen = rules.toFen({ position: withKings(), turn: 'b', castling: NO_CASTLING });
    expect(fen).toBe('4k3/8/8/8/8/8/8/4K3 b - - 0 1');
  });
});

describe('права на рокировку', () => {
  it('отбрасывает права, не подтверждённые расстановкой', () => {
    const position = withKings({ h1: '♖' });
    const { castling, dropped } = rules.sanitizeCastling(position, ALL_CASTLING);
    expect(castling).toEqual({ wOO: true, wOOO: false, bOO: false, bOOO: false });
    expect(dropped).toEqual(['Белые O-O-O', 'Чёрные O-O', 'Чёрные O-O-O']);
  });

  it('сохраняет все права в стартовой позиции', () => {
    const start = rules.fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const { castling, dropped } = rules.sanitizeCastling(start.position, ALL_CASTLING);
    expect(castling).toEqual(ALL_CASTLING);
    expect(dropped).toEqual([]);
  });

  it('не включает права, которые админ не запрашивал', () => {
    const start = rules.fromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const { castling } = rules.sanitizeCastling(start.position, { wOO: true });
    expect(castling.wOO).toBe(true);
    expect(castling.wOOO).toBe(false);
  });
});

describe('легальность позиции', () => {
  it('принимает корректную позицию', () => {
    const res = rules.validatePosition({
      position: withKings({ d4: '♕' }), turn: 'w', castling: NO_CASTLING
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('отклоняет позицию без чёрного короля', () => {
    const p = empty();
    p[7][4] = '♔';
    const res = rules.validatePosition({ position: p, turn: 'w', castling: NO_CASTLING });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('нет чёрного короля');
  });

  it('отклоняет двух белых королей', () => {
    const res = rules.validatePosition({
      position: withKings({ a1: '♔' }), turn: 'w', castling: NO_CASTLING
    });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('больше одного белого короля');
  });

  it('отклоняет пешку на крайней горизонтали', () => {
    const res = rules.validatePosition({
      position: withKings({ a8: '♙' }), turn: 'w', castling: NO_CASTLING
    });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('Пешка не может стоять на поле a8');
  });

  it('отклоняет соседних королей', () => {
    const p = empty();
    p[4][3] = '♚';
    p[4][4] = '♔';
    const res = rules.validatePosition({ position: p, turn: 'w', castling: NO_CASTLING });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('соседних полях');
  });

  it('отклоняет шах стороне, которая не ходит', () => {
    const res = rules.validatePosition({
      position: withKings({ e2: '♕' }), turn: 'w', castling: NO_CASTLING
    });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('Чёрный король под шахом');
  });

  it('разрешает шах той стороне, которая ходит', () => {
    const res = rules.validatePosition({
      position: withKings({ e2: '♕' }), turn: 'b', castling: NO_CASTLING
    });
    expect(res.valid).toBe(true);
  });

  it('отклоняет доску неверного размера', () => {
    const res = rules.validatePosition({ position: [[''], ['']], turn: 'w', castling: NO_CASTLING });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('8 горизонталей');
  });

  it('возвращает очищенную рокировку и FEN вместе с результатом', () => {
    const res = rules.validatePosition({
      position: withKings({ h1: '♖' }), turn: 'w', castling: ALL_CASTLING
    });
    expect(res.valid).toBe(true);
    expect(res.castling.wOO).toBe(true);
    expect(res.castling.bOO).toBe(false);
    expect(res.fen).toBe('4k3/8/8/8/8/8/8/4K2R w K - 0 1');
  });
});

describe('взятие на проходе', () => {
  it('находит клетку e6 для чёрной пешки на e5 при ходе белых', () => {
    const position = withKings({ e5: '♟' });
    expect(rules.enPassantTargets(position, 'w')).toEqual(['e6']);
  });

  it('находит клетку e3 для белой пешки на e4 при ходе чёрных', () => {
    const position = withKings({ e4: '♙' });
    expect(rules.enPassantTargets(position, 'b')).toEqual(['e3']);
  });

  it('не находит клетку, если рядом нет пешки соперника', () => {
    const position = withKings();
    expect(rules.enPassantTargets(position, 'w')).toEqual([]);
  });

  it('принимает легальную клетку взятия на проходе', () => {
    const res = rules.validatePosition({
      position: withKings({ e5: '♟' }), turn: 'w', castling: NO_CASTLING, enPassant: 'e6'
    });
    expect(res.valid).toBe(true);
    expect(res.fen).toContain(' e6 ');
  });

  it('отклоняет клетку взятия на проходе без пешки в нужном файле', () => {
    const res = rules.validatePosition({
      position: withKings({ e5: '♟' }), turn: 'w', castling: NO_CASTLING, enPassant: 'd6'
    });
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toContain('d6 невозможна');
  });

  it('отклоняет клетку взятия на проходе, если пешка не сделала двойной ход', () => {
    const res = rules.validatePosition({
      position: withKings({ e3: '♟' }), turn: 'w', castling: NO_CASTLING, enPassant: 'e6'
    });
    expect(res.valid).toBe(false);
  });

  it('не требует enPassant вообще — по умолчанию "-"', () => {
    const res = rules.validatePosition({ position: withKings(), turn: 'w', castling: NO_CASTLING });
    expect(res.valid).toBe(true);
    expect(res.fen.endsWith(' - 0 1')).toBe(true);
  });
});
