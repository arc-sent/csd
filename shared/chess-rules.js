(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = {
      create: function (lib) {
        return factory(function () { return lib; });
      }
    };
  } else {
    root.Admin = root.Admin || {};
    root.Admin.chessRules = factory(function () {
      return { Chess: root.Chess, validateFen: root.validateFen };
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getLib) {
  'use strict';

  var FILES = 'abcdefgh';

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

  function applyMove(position, move) {
    var next = clonePosition(position);
    var from = move.from, to = move.to;
    var piece = next[from[0]][from[1]];

    next[to[0]][to[1]] = piece;
    next[from[0]][from[1]] = '';
    if (!piece) return next;

    var isKing = piece === '♔' || piece === '♚';
    var isPawn = piece === '♙' || piece === '♟';

    if (isKing && from[0] === to[0] && Math.abs(to[1] - from[1]) === 2) {
      var rank = from[0];
      var kingside = to[1] > from[1];
      var rookFrom = kingside ? [rank, 7] : [rank, 0];
      var rookTo = kingside ? [rank, to[1] - 1] : [rank, to[1] + 1];
      next[rookTo[0]][rookTo[1]] = next[rookFrom[0]][rookFrom[1]];
      next[rookFrom[0]][rookFrom[1]] = '';
    }

    if (isPawn && from[1] !== to[1] && !position[to[0]][to[1]]) {
      next[from[0]][to[1]] = '';
    }

    if (isPawn && move.promotion && (to[0] === 0 || to[0] === 7)) {
      var letter = String(move.promotion).toLowerCase();
      next[to[0]][to[1]] = FEN_TO_PIECE[isWhitePiece(piece) ? letter.toUpperCase() : letter] || piece;
    }

    return next;
  }

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

  function enPassantTargets(position, turn) {
    var targetRow = turn === 'w' ? 2 : 5;
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

  function validatePosition(level) {
    var errors = [];
    var position = level && level.position;

    if (!validateStructure(position, errors)) {
      return { valid: false, errors: errors, castling: null, droppedCastling: [], fen: null };
    }

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

    var pawnRows = [0, 7];
    for (var i = 0; i < pawnRows.length; i++) {
      for (var c = 0; c < 8; c++) {
        var cell = at(position, pawnRows[i], c);
        if (cell === '♙' || cell === '♟') {
          errors.push('Пешка не может стоять на поле ' + squareName([pawnRows[i], c]) + '.');
        }
      }
    }

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

    if (whiteKings.length === 1 && blackKings.length === 1) {
      var dr = Math.abs(whiteKings[0][0] - blackKings[0][0]);
      var dc = Math.abs(whiteKings[0][1] - blackKings[0][1]);
      if (dr <= 1 && dc <= 1) errors.push('Короли не могут стоять на соседних полях.');
    }

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
