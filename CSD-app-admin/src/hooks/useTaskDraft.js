// Состояние редактируемой задачи (Level) — порт мутируемого `draft` из
// admin.js/position-editor.js/solution-builder.js на useReducer. Форма
// состояния 1:1 совпадает с телом запроса /levels (levelPayload в
// admins/js/board-common.js).
import { useReducer } from 'react';
import { emptyBoard } from '../lib/board.js';

export function blankLevel(assignmentId) {
  return {
    id: null,
    name: '',
    description: '',
    difficulty: 'medium',
    category: '',
    position: emptyBoard(),
    turn: 'w',
    castling: { wOO: true, wOOO: true, bOO: true, bOOO: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    steps: [],
    // Результат партии (1-0 / 0-1 / 1/2-1/2) — '' значит «не задан», ReviewView
    // предлагает автоматически по матовой позиции, админ может выбрать сам.
    result: '',
    status: 'draft',
    assignmentId: assignmentId || null
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return action.level;
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_POSITION':
      return { ...state, position: action.position };
    case 'SET_TURN':
      return { ...state, turn: action.turn };
    case 'SET_CASTLING':
      return { ...state, castling: action.castling };
    case 'SET_EN_PASSANT':
      return { ...state, enPassant: action.enPassant };
    case 'APPLY_FEN_RESULT':
      return {
        ...state,
        position: action.result.position,
        turn: action.result.turn,
        castling: action.result.castling,
        enPassant: action.result.enPassant,
        halfmoveClock: action.result.halfmoveClock,
        fullmoveNumber: action.result.fullmoveNumber
      };
    case 'ADD_STEP': {
      const steps = state.steps.slice();
      steps.splice(action.index, 0, action.step);
      return { ...state, steps };
    }
    case 'REMOVE_STEP': {
      const steps = state.steps.slice();
      steps.splice(action.index, 1);
      return { ...state, steps };
    }
    case 'REPLACE_STEPS':
      return { ...state, steps: action.steps };
    default:
      return state;
  }
}

export function useTaskDraft(initial) {
  return useReducer(reducer, initial);
}
