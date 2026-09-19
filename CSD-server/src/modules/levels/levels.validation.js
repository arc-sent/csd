const { z } = require('zod');

const squareCoord = z.tuple([z.number().int().min(0).max(7), z.number().int().min(0).max(7)]);
const moveSchema = z.object({
  from: squareCoord,
  to: squareCoord,
  promotion: z.enum(['q', 'r', 'b', 'n']).optional()
});
const stepSchema = z.object({ player: moveSchema, reply: moveSchema.nullable() });

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

const enPassantSchema = z
  .string()
  .regex(/^[a-h][36]$/, 'Клетка взятия на проходе должна быть на 3-й или 6-й горизонтали')
  .nullable()
  .optional();

const levelBodySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  category: z.string().optional().default(''),
  position: positionSchema,
  turn: z.enum(['w', 'b']).optional().default('w'),
  castling: castlingSchema,
  enPassant: enPassantSchema,
  halfmoveClock: z.number().int().min(0).optional().default(0),
  fullmoveNumber: z.number().int().min(1).optional().default(1),
  steps: z.array(stepSchema).optional().default([]),
  result: z.enum(['1-0', '0-1', '1/2-1/2', '±', '∓', '=']).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  assignmentId: z.string().nullable().optional()
});

const statusBodySchema = z.object({
  status: z.enum(['draft', 'published', 'archived'])
});

module.exports = { levelBodySchema, statusBodySchema };
