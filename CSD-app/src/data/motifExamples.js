// Транскрипция 10 позиций из практики авторов курса под мотивы 2.1-2.10.
// FEN/ходы проверены через chess.js (см. scratchpad build_motifs.js) — каждый
// beforeFen нужен MoveText для отрисовки настоящей нотации хода (иконка фигуры + SAN).
export const MOTIF_EXAMPLES = [
  {
    motif: '2.1',
    title: 'Жертва',
    turn: 'w',
    position: [
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '♛', '♚', '♜', '♟'],
      ['', '', '', '', '', '', '', ''],
      ['♟', '', '', '', '', '♙', '♙', ''],
      ['', '', '', '', '', '', '♔', ''],
      ['', '♟', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['♕', '', '', '', '', '♖', '', ''],
    ],
    steps: [
      {player: {from: [7, 0], to: [1, 6], beforeFen: '8/4qkrp/8/p4PP1/6K1/1p6/8/Q4R2 w - - 0 1'}, reply: {from: [1, 5], to: [1, 6], beforeFen: '8/4qkQp/8/p4PP1/6K1/1p6/8/5R2 b - - 0 1'}},
      {player: {from: [3, 5], to: [2, 5], beforeFen: '8/4q1kp/8/p4PP1/6K1/1p6/8/5R2 w - - 0 2'}, reply: {from: [1, 4], to: [2, 5], beforeFen: '8/4q1kp/5P2/p5P1/6K1/1p6/8/5R2 b - - 0 2'}},
      {player: {from: [7, 5], to: [2, 5], beforeFen: '8/6kp/5q2/p5P1/6K1/1p6/8/5R2 w - - 0 3'}, reply: {from: [3, 0], to: [4, 0], beforeFen: '8/6kp/5R2/p5P1/6K1/1p6/8/8 b - - 0 3'}},
      {player: {from: [2, 5], to: [2, 1], beforeFen: '8/6kp/5R2/6P1/p5K1/1p6/8/8 w - - 0 4'}, reply: null},
    ],
    note: 'Жертва ферзя с вилкой пешкой f6. Ладья переходит в эндшпиль и останавливает пешки a и b.'
  },
  {
    motif: '2.2',
    title: 'Отвлечение',
    turn: 'w',
    position: [
      ['', '', '', '', '♝', '♜', '', '♚'],
      ['♟', '', '', '♞', '♛', '♟', '', ''],
      ['', '♟', '', '', '♟', '♟', '♟', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '♙', '', '', '', ''],
      ['', '♗', '♙', '', '♖', '♙', '♘', ''],
      ['♙', '', '', '', '', '', '♙', ''],
      ['', '', '', '', '♕', '', '♔', ''],
    ],
    steps: [
      {player: {from: [5, 6], to: [3, 5], beforeFen: '4br1k/p2nqp2/1p2ppp1/8/3P4/1BP1RPN1/P5P1/4Q1K1 w - - 0 1'}, reply: {from: [2, 6], to: [3, 5], beforeFen: '4br1k/p2nqp2/1p2ppp1/5N2/3P4/1BP1RP2/P5P1/4Q1K1 b - - 1 1'}},
      {player: {from: [5, 5], to: [4, 5], beforeFen: '4br1k/p2nqp2/1p2pp2/5p2/3P4/1BP1RP2/P5P1/4Q1K1 w - - 0 2'}, reply: {from: [1, 3], to: [3, 4], beforeFen: '4br1k/p2nqp2/1p2pp2/5p2/3P1P2/1BP1R3/P5P1/4Q1K1 b - - 0 2'}},
      {player: {from: [4, 5], to: [3, 4], beforeFen: '4br1k/p3qp2/1p2pp2/4np2/3P1P2/1BP1R3/P5P1/4Q1K1 w - - 1 3'}, reply: {from: [0, 5], to: [0, 6], beforeFen: '4br1k/p3qp2/1p2pp2/4Pp2/3P4/1BP1R3/P5P1/4Q1K1 b - - 0 3'}},
      {player: {from: [7, 4], to: [4, 7], beforeFen: '4b1rk/p3qp2/1p2pp2/4Pp2/3P4/1BP1R3/P5P1/4Q1K1 w - - 1 4'}, reply: {from: [0, 7], to: [1, 6], beforeFen: '4b1rk/p3qp2/1p2pp2/4Pp2/3P3Q/1BP1R3/P5P1/6K1 b - - 2 4'}},
      {player: {from: [5, 4], to: [5, 6], beforeFen: '4b1r1/p3qpk1/1p2pp2/4Pp2/3P3Q/1BP1R3/P5P1/6K1 w - - 3 5'}, reply: {from: [1, 6], to: [0, 5], beforeFen: '4b1r1/p3qpk1/1p2pp2/4Pp2/3P3Q/1BP3R1/P5P1/6K1 b - - 4 5'}},
      {player: {from: [4, 7], to: [2, 7], beforeFen: '4bkr1/p3qp2/1p2pp2/4Pp2/3P3Q/1BP3R1/P5P1/6K1 w - - 5 6'}, reply: {from: [0, 6], to: [1, 6], beforeFen: '4bkr1/p3qp2/1p2pp1Q/4Pp2/3P4/1BP3R1/P5P1/6K1 b - - 6 6'}},
      {player: {from: [2, 7], to: [1, 6], beforeFen: '4bk2/p3qpr1/1p2pp1Q/4Pp2/3P4/1BP3R1/P5P1/6K1 w - - 7 7'}, reply: null},
    ],
    note: 'Жертва коня вскрывает линию g, дальше атака ферзём и ладьёй.'
  },
  {
    motif: '2.3',
    title: 'Завлечение',
    turn: 'b',
    position: [
      ['', '', '', '', '', '♜', '♚', ''],
      ['♟', '', '', '', '', '', '♟', '♟'],
      ['', '♟', '', '♟', '', '', '', '♜'],
      ['', '', '♟', '', '♞', '', '', ''],
      ['', '', '♙', '', '♖', '♟', '', '♛'],
      ['', '♙', '', '', '', '♙', '', '♙'],
      ['', '♗', '♕', '', '', '', '♙', ''],
      ['', '', '', '', '♖', '', '♔', ''],
    ],
    steps: [
      {player: {from: [3, 4], to: [5, 5], beforeFen: '5rk1/p5pp/1p1p3r/2p1n3/2P1Rp1q/1P3P1P/1BQ3P1/4R1K1 b - - 0 1'}, reply: {from: [6, 6], to: [5, 5], beforeFen: '5rk1/p5pp/1p1p3r/2p5/2P1Rp1q/1P3n1P/1BQ3P1/4R1K1 w - - 0 2'}},
      {player: {from: [2, 7], to: [2, 6], beforeFen: '5rk1/p5pp/1p1p3r/2p5/2P1Rp1q/1P3P1P/1BQ5/4R1K1 b - - 0 2'}, reply: {from: [7, 6], to: [7, 5], beforeFen: '5rk1/p5pp/1p1p2r1/2p5/2P1Rp1q/1P3P1P/1BQ5/4R1K1 w - - 1 3'}},
      {player: {from: [4, 7], to: [5, 7], beforeFen: '5rk1/p5pp/1p1p2r1/2p5/2P1Rp1q/1P3P1P/1BQ5/4RK2 b - - 2 3'}, reply: {from: [7, 5], to: [6, 4], beforeFen: '5rk1/p5pp/1p1p2r1/2p5/2P1Rp2/1P3P1q/1BQ5/4RK2 w - - 0 4'}},
      {player: {from: [2, 6], to: [6, 6], beforeFen: '5rk1/p5pp/1p1p2r1/2p5/2P1Rp2/1P3P1q/1BQ1K3/4R3 b - - 1 4'}, reply: {from: [6, 4], to: [7, 3], beforeFen: '5rk1/p5pp/1p1p4/2p5/2P1Rp2/1P3P1q/1BQ1K1r1/4R3 w - - 2 5'}},
      {player: {from: [6, 6], to: [6, 2], beforeFen: '5rk1/p5pp/1p1p4/2p5/2P1Rp2/1P3P1q/1BQ3r1/3KR3 b - - 3 5'}, reply: {from: [7, 3], to: [6, 2], beforeFen: '5rk1/p5pp/1p1p4/2p5/2P1Rp2/1P3P1q/1Br5/3KR3 w - - 0 6'}},
      {player: {from: [5, 7], to: [5, 5], beforeFen: '5rk1/p5pp/1p1p4/2p5/2P1Rp2/1P3P1q/1BK5/4R3 b - - 0 6'}, reply: null},
    ],
    note: 'Жертва коня обнажает короля, серия шахов, ладья забирает ферзя c2.'
  },
  {
    motif: '2.4',
    title: 'Устранение защиты',
    turn: 'b',
    position: [
      ['', '', '', '', '', '', '', ''],
      ['♟', '', '', '', '', '', '♚', ''],
      ['', '♟', '', '♟', '', '♛', '', '♟'],
      ['', '♙', '', '♙', '', '♙', '♟', ''],
      ['', '', '♙', '', '', '♟', '♔', ''],
      ['', '', '', '', '', '♕', '', '♙'],
      ['', '', '', '', '', '♙', '♙', ''],
      ['', '', '', '', '', '', '', ''],
    ],
    steps: [
      {player: {from: [2, 7], to: [3, 7], beforeFen: '8/p5k1/1p1p1q1p/1P1P1Pp1/2P2pK1/5Q1P/5PP1/8 b - - 0 1'}, reply: {from: [4, 6], to: [3, 7], beforeFen: '8/p5k1/1p1p1q2/1P1P1Ppp/2P2pK1/5Q1P/5PP1/8 w - - 0 2'}},
      {player: {from: [2, 5], to: [2, 7], beforeFen: '8/p5k1/1p1p1q2/1P1P1PpK/2P2p2/5Q1P/5PP1/8 b - - 0 2'}, reply: {from: [3, 7], to: [4, 6], beforeFen: '8/p5k1/1p1p3q/1P1P1PpK/2P2p2/5Q1P/5PP1/8 w - - 1 3'}},
      {player: {from: [2, 7], to: [4, 7], beforeFen: '8/p5k1/1p1p3q/1P1P1Pp1/2P2pK1/5Q1P/5PP1/8 b - - 2 3'}, reply: null},
    ],
    note: 'Пешкой h выманивают короля и ставят мат.'
  },
  {
    motif: '2.5',
    title: 'Освобождение поля',
    turn: 'b',
    position: [
      ['', '', '♚', '', '', '', '♜', ''],
      ['', '♟', '♟', '', '', '', '', '♟'],
      ['♟', '', '', '', '♞', '', '', ''],
      ['♙', '', '♘', '', '', '', '', ''],
      ['', '♙', '♙', '', '♟', '♙', '', ''],
      ['', '', '', '♙', '', '♙', '', '♛'],
      ['', '', '', '', '', '♕', '', '♙'],
      ['', '', '', '♖', '', '', '', '♔'],
    ],
    steps: [
      {player: {from: [4, 4], to: [5, 4], beforeFen: '2k3r1/1pp4p/p3n3/P1N5/1PP1pP2/3P1P1q/5Q1P/3R3K b - - 0 1'}, reply: {from: [6, 5], to: [7, 5], beforeFen: '2k3r1/1pp4p/p3n3/P1N5/1PP2P2/3PpP1q/5Q1P/3R3K w - - 0 2'}},
      {player: {from: [5, 4], to: [6, 4], beforeFen: '2k3r1/1pp4p/p3n3/P1N5/1PP2P2/3PpP1q/7P/3R1Q1K b - - 1 2'}, reply: {from: [7, 5], to: [6, 4], beforeFen: '2k3r1/1pp4p/p3n3/P1N5/1PP2P2/3P1P1q/4p2P/3R1Q1K w - - 0 3'}},
      {player: {from: [2, 4], to: [4, 5], beforeFen: '2k3r1/1pp4p/p3n3/P1N5/1PP2P2/3P1P1q/4Q2P/3R3K b - - 0 3'}, reply: {from: [6, 4], to: [6, 5], beforeFen: '2k3r1/1pp4p/p7/P1N5/1PP2n2/3P1P1q/4Q2P/3R3K w - - 0 4'}},
      {player: {from: [0, 6], to: [6, 6], beforeFen: '2k3r1/1pp4p/p7/P1N5/1PP2n2/3P1P1q/5Q1P/3R3K b - - 1 4'}, reply: null},
    ],
    note: 'Пешка отвлекает ферзя. Конь с темпом бьёт f4, и ладья встаёт на g2 с угрозой Qxh2#.'
  },
  {
    motif: '2.6',
    title: 'Связка',
    turn: 'w',
    position: [
      ['', '', '', '♜', '', '♜', '♚', ''],
      ['♟', '♟', '', '', '♝', '♟', '♟', ''],
      ['♛', '', '♞', '', '♟', '♞', '', '♟'],
      ['', '', '', '♟', '♘', '', '', ''],
      ['', '', '', '♙', '', '♙', '♙', ''],
      ['', '', '♘', '♕', '♗', '', '', '♙'],
      ['♙', '♙', '♙', '', '', '', '', ''],
      ['', '♖', '', '', '', '♖', '♔', ''],
    ],
    steps: [
      {player: {from: [5, 3], to: [2, 0], beforeFen: '3r1rk1/pp2bpp1/q1n1pn1p/3pN3/3P1PP1/2NQB2P/PPP5/1R3RK1 w - - 0 1'}, reply: {from: [1, 1], to: [2, 0], beforeFen: '3r1rk1/pp2bpp1/Q1n1pn1p/3pN3/3P1PP1/2N1B2P/PPP5/1R3RK1 b - - 0 1'}},
      {player: {from: [3, 4], to: [2, 2], beforeFen: '3r1rk1/p3bpp1/p1n1pn1p/3pN3/3P1PP1/2N1B2P/PPP5/1R3RK1 w - - 0 2'}, reply: null},
    ],
    note: 'После размена ферзей конь бьёт c6 и нападает на ладью d8 и слона e7, белые выигрывают фигуру.'
  },
  {
    motif: '2.7',
    title: 'Вилка',
    turn: 'w',
    position: [
      ['', '', '', '♜', '', '♜', '', '♚'],
      ['♟', '♝', '♝', '', '', '', '♟', '♟'],
      ['', '', '♟', '', '', '', '', ''],
      ['', '', '♙', '', '', '♟', '', ''],
      ['', '', '♗', '', '', '♟', '', ''],
      ['', '♙', '♛', '♙', '', '', '', '♖'],
      ['♙', '', '', '', '', '', '♙', '♙'],
      ['♖', '', '', '♕', '', '', '♔', ''],
    ],
    steps: [
      {player: {from: [5, 7], to: [1, 7], beforeFen: '3r1r1k/pbb3pp/2p5/2P2p2/2B2p2/1PqP3R/P5PP/R2Q2K1 w - - 0 1'}, reply: {from: [0, 7], to: [1, 7], beforeFen: '3r1r1k/pbb3pR/2p5/2P2p2/2B2p2/1PqP4/P5PP/R2Q2K1 b - - 0 1'}},
      {player: {from: [7, 3], to: [3, 7], beforeFen: '3r1r2/pbb3pk/2p5/2P2p2/2B2p2/1PqP4/P5PP/R2Q2K1 w - - 0 2'}, reply: null},
    ],
    note: 'Жертва ладьи на h7, мат ферзём. Поле g8 держит слон c4.'
  },
  {
    motif: '2.8',
    title: 'Незащищённая фигура',
    turn: 'b',
    position: [
      ['', '', '', '', '', '♜', '♚', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '♖', '', '', '', '', '', '♟'],
      ['', '', '♟', '', '♞', '', '', ''],
      ['', '', '', '', '♟', '', '♜', ''],
      ['', '', '♙', '', '', '', '', ''],
      ['', '', '', '', '♙', '', '♗', ''],
      ['', '', '', '♖', '', '', '♔', ''],
    ],
    steps: [
      {player: {from: [3, 4], to: [4, 2], beforeFen: '5rk1/8/1R5p/2p1n3/4p1r1/2P5/4P1B1/3R2K1 b - - 0 1'}, reply: {from: [2, 1], to: [2, 7], beforeFen: '5rk1/8/1R5p/2p5/2n1p1r1/2P5/4P1B1/3R2K1 w - - 1 2'}},
      {player: {from: [4, 2], to: [5, 4], beforeFen: '5rk1/8/7R/2p5/2n1p1r1/2P5/4P1B1/3R2K1 b - - 0 2'}, reply: null},
    ],
    note: 'Конь идёт через c4 на e3 и нападает на ладью d1 и слона g2. Слон связан ладьёй g4.'
  },
  {
    motif: '2.9',
    title: 'Рентген',
    turn: 'w',
    position: [
      ['', '', '', '', '', '', '', '♚'],
      ['', '', '', '♞', '', '♟', '♜', '♟'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '♙', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '♙'],
      ['', '♗', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '♖', '♔'],
    ],
    steps: [
      {player: {from: [3, 4], to: [2, 4], beforeFen: '7k/3n1prp/8/4P3/8/7P/1B6/6RK w - - 0 1'}, reply: null},
    ],
    note: 'Пешка уходит и открывает диагональ слону b2. Ладья g7 связана, на неё нападают слон и ладья g1, а пешка ещё и атакует d7 и f7.'
  },
  {
    motif: '2.10',
    title: 'Вскрытое нападение',
    turn: 'w',
    position: [
      ['', '', '', '♜', '', '♜', '♚', ''],
      ['', '', '', '', '', '♟', '♟', '♝'],
      ['♟', '', '', '', '', '', '', '♟'],
      ['', '♟', '', '', '', '', '', '♙'],
      ['', '', '♟', '', '', '', '♕', ''],
      ['', '', '♙', '♛', '', '♙', '♗', ''],
      ['♙', '♙', '', '', '', '♙', '', ''],
      ['', '', '♔', '', '', '', '♖', '♖'],
    ],
    steps: [
      {player: {from: [4, 6], to: [1, 6], beforeFen: '3r1rk1/5ppb/p6p/1p5P/2p3Q1/2Pq1PB1/PP3P2/2K3RR w - - 0 1'}, reply: {from: [0, 6], to: [1, 6], beforeFen: '3r1rk1/5pQb/p6p/1p5P/2p5/2Pq1PB1/PP3P2/2K3RR b - - 0 1'}},
      {player: {from: [5, 6], to: [3, 4], beforeFen: '3r1r2/5pkb/p6p/1p5P/2p5/2Pq1PB1/PP3P2/2K3RR w - - 0 2'}, reply: null},
    ],
    note: 'Жертва ферзя, дальше двойной шах: ладьёй g1 по открытой линии и слоном e5. Это мат.'
  },
];