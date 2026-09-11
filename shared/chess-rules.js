// Общие шахматные правила ChessSchoolDinamik: конвертация позиции в FEN и проверка
// легальности. Один и тот же файл подключается и на бэке (require), и в
// админке (<script>), чтобы правила не расходились между клиентом и сервером.
//
// ВАЖНО: это только ПРАВИЛА (что вообще легально), а не сила игры.
// Поиск лучшего хода — задача движка (Stockfish, отдельный модуль).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node: сам файл лежит вне server/, поэтому chess.js не резолвится отсюда —
    // библиотеку внедряет вызывающая сторона через create(lib).
    module.exports = {
      create: function (lib) {
        return factory(function () { return lib; });
      }
    };
  } else {
    // Браузер: chess.js кладётся в window модульным скриптом в index.html.
    // Библиотека берётся лениво (в момент вызова), потому что модульные
    // скрипты выполняются позже классических.
    root.Admin = root.Admin || {};
    root.Admin.chessRules = factory(function () {
      return { Chess: root.Chess, validateFen: root.validateFen };
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getLib) {
  'use strict';

  var FILES = 'abcdefgh';

  // Юникод-фигуры (формат позиции проекта) <-> буквы FEN.
  var PIECE_TO_FEN = {
    '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N', '♙': 'P',
    '♚': 'k', '♛': 'q', '♜': 'r', '♝': 'b', '♞': 'n', '♟': 'p'
  };
  var FEN_TO_PIECE = {};
  Object.keys(PIECE_TO_FEN).forEach(function (piece) {
    FEN_TO_PIECE[PIECE_TO_FEN[piece]] = piece;
  });

  var WHITE_PIECES = '♔♕♖♗♘♙';
  var isWhitePiece = function (piece) { return WHITE_PIECES.indexOf(piece) !== -1; };

  function squareName(coords) {
    return FILES[coords[1]] + (8 - coords[0]);
  }

  function parseSquare(name) {
    return [8 - Number(name[1]), FILES.indexOf(name[0])];
  }

  function moveToUci(move) {
    return squareName(move.from) + squareName(move.to);
  }

  function uciToMove(uci) {
    return { from: parseSquare(uci.slice(0, 2)), to: parseSquare(uci.slice(2, 4)) };
  }

  function clonePosition(position) {
    return position.map(function (row) { return row.slice(); });
  }

  // --- Применение хода на доске ----------------------------------------------

  // Единственное место, которое умеет полноценно двигать фигуру: обычный ход
  // «откуда→куда» плюс три особых случая, которые в шахматах двигают на доске
  // больше одной клетки за раз. Используется и админкой (предпросмотр решения,
  // движок), и тренажёром на сайте — чтобы ученик и админ видели одну и ту же
  // позицию после хода.
  function applyMove(position, move) {
    var next = clonePosition(position);
    var from = move.from, to = move.to;
    var piece = next[from[0]][from[1]];

    next[to[0]][to[1]] = piece;
    next[from[0]][from[1]] = '';
    if (!piece) return next;

    var isKing = piece === '♔' || piece === '♚';
    var isPawn = piece === '♙' || piece === '♟';

    // Рокировка: король сходил на 2 клетки по горизонтали — переносим и
    // соответствующую ладью (h-ладья при ходе в сторону h, a-ладья — в сторону a).
    if (isKing && from[0] === to[0] && Math.abs(to[1] - from[1]) === 2) {
      var rank = from[0];
      var kingside = to[1] > from[1];
      var rookFrom = kingside ? [rank, 7] : [rank, 0];
      var rookTo = kingside ? [rank, to[1] - 1] : [rank, to[1] + 1];
      next[rookTo[0]][rookTo[1]] = next[rookFrom[0]][rookFrom[1]];
      next[rookFrom[0]][rookFrom[1]] = '';
    }

    // Взятие на проходе: пешка сходила по диагонали на клетку, которая была
    // пуста — значит, она не берёт фигуру на самой клетке хода, а «на проходе»
    // снимает пешку соперника, стоящую рядом на исходной горизонтали.
    if (isPawn && from[1] !== to[1] && !position[to[0]][to[1]]) {
      next[from[0]][to[1]] = '';
    }

    // Превращение пешки: без явно указанной фигуры превращения оставляем как
    // есть (это тот единственный случай, где мы не можем догадаться сами).
    if (isPawn && move.promotion && (to[0] === 0 || to[0] === 7)) {
      var letter = String(move.promotion).toLowerCase();
      next[to[0]][to[1]] = FEN_TO_PIECE[isWhitePiece(piece) ? letter.toUpperCase() : letter] || piece;
    }

    return next;
  }

  // --- Поиск фигур на доске -------------------------------------------------

  function findPieces(position, piece) {
    var found = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (position[r] && position[r][c] === piece) found.push([r, c]);
      }
    }
    return found;
  }

  function at(position, r, c) {
    return (position[r] && position[r][c]) || '';
  }

  // --- Рокировка ------------------------------------------------------------

  // Право на рокировку возможно, только если король и нужная ладья стоят на
  // своих начальных полях. Невозможные права молча отбрасываются (так же
  // ведёт себя SmallFish при импорте FEN с противоречивой рокировкой).
  function sanitizeCastling(position, castling) {
    var input = castling || {};
    var whiteKingHome = at(position, 7, 4) === '♔';
    var blackKingHome = at(position, 0, 4) === '♚';

    var allowed = {
      wOO: whiteKingHome && at(position, 7, 7) === '♖',
      wOOO: whiteKingHome && at(position, 7, 0) === '♖',
      bOO: blackKingHome && at(position, 0, 7) === '♜',
      bOOO: blackKingHome && at(position, 0, 0) === '♜'
    };

    var labels = { wOO: 'Белые O-O', wOOO: 'Белые O-O-O', bOO: 'Чёрные O-O', bOOO: 'Чёрные O-O-O' };
    var result = {};
    var dropped = [];
    Object.keys(allowed).forEach(function (key) {
      var wanted = Boolean(input[key]);
      result[key] = wanted && allowed[key];
      if (wanted && !allowed[key]) dropped.push(labels[key]);
    });
    return { castling: result, dropped: dropped };
  }

  function castlingToFen(castling) {
    var fen = (castling.wOO ? 'K' : '') + (castling.wOOO ? 'Q' : '') +
      (castling.bOO ? 'k' : '') + (castling.bOOO ? 'q' : '');
    return fen || '-';
  }

  // --- Взятие на проходе ------------------------------------------------

  // chess.js проверяет в FEN только то, что клетка стоит на 3-й/6-й
  // горизонтали, но не то, действительно ли рядом есть пешка соперника,
  // которая могла туда прыгнуть, и свободна ли сама клетка. Проверяем сами.
  //
  // turn — чей ход СЕЙЧАС (значит, соперник только что сходил пешкой на два
  // поля). Для хода белых клетка на 6-й горизонтали и чёрная пешка южнее;
  // для хода чёрных — 3-я горизонталь и белая пешка севернее.
  function enPassantTargets(position, turn) {
    var targetRow = turn === 'w' ? 2 : 5; // индекс строки: 2 = ранг 6, 5 = ранг 3
    var pawnRow = turn === 'w' ? 3 : 4;
    var pawn = turn === 'w' ? '♟' : '♙';
    var squares = [];
    for (var c = 0; c < 8; c++) {
      if (at(position, targetRow, c) === '' && at(position, pawnRow, c) === pawn) {
        squares.push(squareName([targetRow, c]));
      }
    }
    return squares;
  }

  function validateEnPassant(position, turn, enPassant) {
    if (!enPassant) return null;
    var valid = enPassantTargets(position, turn);
    if (valid.indexOf(enPassant) === -1) {
      return 'Клетка взятия на проходе ' + enPassant + ' невозможна при такой расстановке и очереди хода.';
    }
    return null;
  }

  // --- FEN ------------------------------------------------------------------

  function placementToFen(position) {
    var rows = [];
    for (var r = 0; r < 8; r++) {
      var row = '';
      var empty = 0;
      for (var c = 0; c < 8; c++) {
        var letter = PIECE_TO_FEN[at(position, r, c)];
        if (letter) {
          if (empty) { row += empty; empty = 0; }
          row += letter;
        } else {
          empty++;
        }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    return rows.join('/');
  }

  // Полный 6-польный FEN. enPassant/счётчики опциональны — поле взятия на
  // проходе появляется в редакторе отдельным модулем, до тех пор '-'.
  function toFen(level) {
    var castling = sanitizeCastling(level.position, level.castling).castling;
    return [
      placementToFen(level.position),
      level.turn === 'b' ? 'b' : 'w',
      castlingToFen(castling),
      level.enPassant || '-',
      String(level.halfmoveClock == null ? 0 : level.halfmoveClock),
      String(level.fullmoveNumber == null ? 1 : level.fullmoveNumber)
    ].join(' ');
  }

  function fromFen(fen) {
    var parts = String(fen).trim().split(/\s+/);
    var position = [];
    parts[0].split('/').forEach(function (rowFen) {
      var row = [];
      rowFen.split('').forEach(function (ch) {
        if (/\d/.test(ch)) {
          for (var i = 0; i < Number(ch); i++) row.push('');
        } else {
          row.push(FEN_TO_PIECE[ch] || '');
        }
      });
      position.push(row);
    });
    var rights = parts[2] || '-';
    return {
      position: position,
      turn: parts[1] === 'b' ? 'b' : 'w',
      castling: {
        wOO: rights.indexOf('K') !== -1,
        wOOO: rights.indexOf('Q') !== -1,
        bOO: rights.indexOf('k') !== -1,
        bOOO: rights.indexOf('q') !== -1
      },
      enPassant: parts[3] && parts[3] !== '-' ? parts[3] : null,
      halfmoveClock: Number(parts[4] || 0),
      fullmoveNumber: Number(parts[5] || 1)
    };
  }

  // --- Проверка легальности -------------------------------------------------

  function validateStructure(position, errors) {
    if (!Array.isArray(position) || position.length !== 8) {
      errors.push('Позиция должна состоять из 8 горизонталей.');
      return false;
    }
    for (var r = 0; r < 8; r++) {
      if (!Array.isArray(position[r]) || position[r].length !== 8) {
        errors.push('Каждая горизонталь должна содержать 8 клеток.');
        return false;
      }
      for (var c = 0; c < 8; c++) {
        var cell = position[r][c];
        if (cell && !PIECE_TO_FEN[cell]) {
          errors.push('Неизвестная фигура на поле ' + squareName([r, c]) + '.');
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Полная проверка легальности начальной позиции уровня.
   * Возвращает { valid, errors, castling, droppedCastling, fen }.
   * castling — уже очищенные права (невозможные отброшены).
   */
  function validatePosition(level) {
    var errors = [];
    var position = level && level.position;

    if (!validateStructure(position, errors)) {
      return { valid: false, errors: errors, castling: null, droppedCastling: [], fen: null };
    }

    // 1. Короли: ровно по одному у каждой стороны.
    var whiteKings = findPieces(position, '♔');
    var blackKings = findPieces(position, '♚');
    if (whiteKings.length !== 1) {
      errors.push(whiteKings.length === 0
        ? 'На доске нет белого короля.'
        : 'На доске больше одного белого короля.');
    }
    if (blackKings.length !== 1) {
      errors.push(blackKings.length === 0
        ? 'На доске нет чёрного короля.'
        : 'На доске больше одного чёрного короля.');
    }

    // 2. Пешки не могут стоять на 1-й и 8-й горизонталях.
    var pawnRows = [0, 7];
    for (var i = 0; i < pawnRows.length; i++) {
      for (var c = 0; c < 8; c++) {
        var cell = at(position, pawnRows[i], c);
        if (cell === '♙' || cell === '♟') {
          errors.push('Пешка не может стоять на поле ' + squareName([pawnRows[i], c]) + '.');
        }
      }
    }

    // 3. Не больше 16 фигур у стороны.
    var whiteCount = 0;
    var blackCount = 0;
    for (var r = 0; r < 8; r++) {
      for (var cc = 0; cc < 8; cc++) {
        var p = at(position, r, cc);
        if (!p) continue;
        if (isWhitePiece(p)) whiteCount++; else blackCount++;
      }
    }
    if (whiteCount > 16) errors.push('У белых больше 16 фигур.');
    if (blackCount > 16) errors.push('У чёрных больше 16 фигур.');

    // 4. Короли не могут стоять вплотную.
    if (whiteKings.length === 1 && blackKings.length === 1) {
      var dr = Math.abs(whiteKings[0][0] - blackKings[0][0]);
      var dc = Math.abs(whiteKings[0][1] - blackKings[0][1]);
      if (dr <= 1 && dc <= 1) errors.push('Короли не могут стоять на соседних полях.');
    }

    // 5. Клетка взятия на проходе (если указана) должна быть подкреплена
    // реальной пешкой соперника рядом — иначе такая позиция недостижима.
    var enPassantError = validateEnPassant(position, level.turn === 'b' ? 'b' : 'w', level.enPassant);
    if (enPassantError) errors.push(enPassantError);

    var sanitized = sanitizeCastling(position, level.castling);
    var fen = toFen({
      position: position,
      turn: level.turn,
      castling: sanitized.castling,
      enPassant: level.enPassant,
      halfmoveClock: level.halfmoveClock,
      fullmoveNumber: level.fullmoveNumber
    });

    if (errors.length) {
      return {
        valid: false, errors: errors,
        castling: sanitized.castling, droppedCastling: sanitized.dropped, fen: fen
      };
    }

    // 6. Проверки, которые умеет только сам движок правил.
    var lib = getLib();
    if (!lib || !lib.Chess) {
      errors.push('Библиотека шахматных правил не загружена.');
      return { valid: false, errors: errors, castling: sanitized.castling, droppedCastling: sanitized.dropped, fen: fen };
    }

    var chess;
    try {
      chess = new lib.Chess(fen);
    } catch (e) {
      errors.push('Позиция не является корректной шахматной позицией.');
      return { valid: false, errors: errors, castling: sanitized.castling, droppedCastling: sanitized.dropped, fen: fen };
    }

    // Сторона, которая НЕ ходит, не может стоять под шахом — такая позиция
    // недостижима в реальной партии. chess.js это сам не проверяет.
    var idleColor = chess.turn() === 'w' ? 'b' : 'w';
    var idleKing = chess.findPiece({ type: 'k', color: idleColor });
    if (idleKing.length && chess.isAttacked(idleKing[0], chess.turn())) {
      errors.push(idleColor === 'b'
        ? 'Чёрный король под шахом, хотя ход белых — такая позиция невозможна.'
        : 'Белый король под шахом, хотя ход чёрных — такая позиция невозможна.');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      castling: sanitized.castling,
      droppedCastling: sanitized.dropped,
      fen: fen
    };
  }

  return {
    PIECE_TO_FEN: PIECE_TO_FEN,
    FEN_TO_PIECE: FEN_TO_PIECE,
    squareName: squareName,
    parseSquare: parseSquare,
    moveToUci: moveToUci,
    uciToMove: uciToMove,
    clonePosition: clonePosition,
    applyMove: applyMove,
    sanitizeCastling: sanitizeCastling,
    enPassantTargets: enPassantTargets,
    toFen: toFen,
    fromFen: fromFen,
    validatePosition: validatePosition
  };
});
