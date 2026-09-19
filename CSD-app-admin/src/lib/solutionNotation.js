import { squareName, parseSquareName, pieceEmoji } from './board.js';
import { chessRules } from './chessRules.js';

export function squareLabel(coords) {
  return coords ? squareName(coords[0], coords[1]) : '—';
}

export function sanFor(fen, move) {
  if (!move || !move.from || !move.to || !fen) return null;
  try {
    const chess = new window.Chess(fen);
    const result = chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
    return result ? result.san : null;
  } catch (err) {
    return null;
  }
}

export function advanceFen(fen, move) {
  if (!move || !move.from || !move.to || !fen) return fen;
  try {
    const chess = new window.Chess(fen);
    chess.move({
      from: squareName(move.from[0], move.from[1]),
      to: squareName(move.to[0], move.to[1]),
      promotion: move.promotion || 'q'
    });
    return chess.fen();
  } catch (err) {
    return fen;
  }
}

export function fenChainFor(draft) {
  const beforePlayerFen = [];
  const beforeReplyFen = [];
  let fen = chessRules.toFen(draft);
  draft.steps.forEach(step => {
    beforePlayerFen.push(fen);
    const afterPlayerFen = advanceFen(fen, step.player);
    beforeReplyFen.push(afterPlayerFen);
    fen = step.reply ? advanceFen(afterPlayerFen, step.reply) : afterPlayerFen;
  });
  return { beforePlayerFen, beforeReplyFen, finalFen: fen };
}

export function resultFor(fen) {
  if (!fen) return null;
  try {
    const chess = new window.Chess(fen);
    if (chess.isCheckmate()) return chess.turn() === 'w' ? '0-1' : '1-0';
    if (chess.isDraw()) return '1/2-1/2';
    return null;
  } catch (err) {
    return null;
  }
}

export function fenBeforeIndex(draft, index) {
  let fen = chessRules.toFen(draft);
  for (let i = 0; i < index; i++) {
    fen = advanceFen(fen, draft.steps[i].player);
    if (draft.steps[i].reply) fen = advanceFen(fen, draft.steps[i].reply);
  }
  return fen;
}

export function moveLabelParts(move, before, beforeFen) {
  const san = sanFor(beforeFen, move);
  const arrow = san || squareLabel(move && move.from) + ' → ' + squareLabel(move && move.to);
  if (!move || !move.from || !move.to || !before) return { piece: '', arrow };
  const piece = pieceEmoji(before[move.from[0]][move.from[1]]);
  return { piece, arrow };
}

export function moveToUciOrEmpty(move, beforePosition) {
  if (!move || !move.from || !move.to) return '';
  const prefix = beforePosition ? pieceEmoji(beforePosition[move.from[0]][move.from[1]]) : '';
  return prefix + squareName(move.from[0], move.from[1]) + squareName(move.to[0], move.to[1]) + (move.promotion || '');
}

export function parseUciToken(token) {
  const withoutPiece = token.trim().replace(/^(Кр|Ф|К|Л|С|[♔♚♕♛♖♜♗♝♘♞♙♟]️?)/i, '');
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/i.exec(withoutPiece);
  if (!m) return null;
  return {
    from: parseSquareName(m[1].toLowerCase()),
    to: parseSquareName(m[2].toLowerCase()),
    ...(m[3] ? { promotion: m[3].toLowerCase() } : {})
  };
}

export function tokensToSteps(tokens) {
  const steps = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const player = parseUciToken(tokens[i]);
    if (!player) return { error: 'Не могу разобрать «' + tokens[i] + '». Формат хода: e7e5.' };
    let reply = null;
    if (tokens[i + 1]) {
      reply = parseUciToken(tokens[i + 1]);
      if (!reply) return { error: 'Не могу разобрать «' + tokens[i + 1] + '». Формат хода: g1f3.' };
    }
    steps.push({ player, reply });
  }
  return { steps };
}

export function copyMove(move) {
  if (!move || !move.from || !move.to) return null;
  return { from: move.from.slice(), to: move.to.slice(), ...(move.promotion ? { promotion: move.promotion } : {}) };
}
