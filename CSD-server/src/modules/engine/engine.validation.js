const { z } = require('zod');

const castlingSchema = z.object({
  wOO: z.boolean(),
  wOOO: z.boolean(),
  bOO: z.boolean(),
  bOOO: z.boolean()
});

const positionSchema = z
  .array(z.array(z.string()))
  .length(8, 'Позиция должна содержать 8 горизонталей')
  .refine(rows => rows.every(row => row.length === 8), {
    message: 'Каждая горизонталь должна содержать 8 клеток'
  });

const analyzeSchema = z.object({
  position: positionSchema,
  turn: z.enum(['w', 'b']).optional().default('w'),
  castling: castlingSchema,
  enPassant: z.string().regex(/^[a-h][36]$/).nullable().optional(),
  halfmoveClock: z.number().int().min(0).optional().default(0),
  fullmoveNumber: z.number().int().min(1).optional().default(1),
  depth: z.number().int().min(1).optional(),
  movetime: z.number().int().min(50).optional()
});

module.exports = { analyzeSchema };
