require('dotenv').config();
const request = require('supertest');
const { createApp } = require('../src/app');
const prisma = require('../src/shared/prisma');

describe('Public module (витрина лендинга)', () => {
  let app;
  let publishedStageId;
  let draftStageId;
  let publishedAssignmentId;

  beforeAll(async () => {
    app = createApp();

    const publishedStage = await prisma.stage.create({
      data: { name: 'Публичный этап', status: 'published' }
    });
    publishedStageId = publishedStage.id;

    const draftStage = await prisma.stage.create({
      data: { name: 'Черновой этап', status: 'draft' }
    });
    draftStageId = draftStage.id;

    const publishedAssignment = await prisma.assignment.create({
      data: { stageId: publishedStageId, name: 'Опубликованное задание', price: 990, status: 'published' }
    });
    publishedAssignmentId = publishedAssignment.id;

    await prisma.assignment.create({
      data: { stageId: publishedStageId, name: 'Черновое задание', price: 500, status: 'draft' }
    });

    await prisma.level.create({
      data: {
        name: 'Опубликованная задача', assignmentId: publishedAssignmentId, status: 'published',
        position: [], castling: {}, steps: []
      }
    });
    await prisma.level.create({
      data: {
        name: 'Черновая задача', assignmentId: publishedAssignmentId, status: 'draft',
        position: [], castling: {}, steps: []
      }
    });
  });

  afterAll(async () => {
    await prisma.level.deleteMany({ where: { assignmentId: publishedAssignmentId } });
    await prisma.assignment.deleteMany({ where: { stageId: { in: [publishedStageId, draftStageId] } } });
    await prisma.stage.deleteMany({ where: { id: { in: [publishedStageId, draftStageId] } } });
    await prisma.$disconnect();
  });

  it('не требует авторизации', async () => {
    const res = await request(app).get('/api/public/stages');
    expect(res.status).toBe(200);
  });

  it('отдаёт только опубликованные этапы', async () => {
    const res = await request(app).get('/api/public/stages');
    const ids = res.body.map(s => s.id);
    expect(ids).toContain(publishedStageId);
    expect(ids).not.toContain(draftStageId);
  });

  it('отдаёт только опубликованные задания внутри этапа и считает только опубликованные задачи', async () => {
    const res = await request(app).get('/api/public/stages');
    const stage = res.body.find(s => s.id === publishedStageId);
    expect(stage.assignments).toHaveLength(1);
    expect(stage.assignments[0]).toEqual({
      id: publishedAssignmentId,
      name: 'Опубликованное задание',
      price: 990,
      tasksCount: 1
    });
  });

  it('не отдаёт лишние поля (description/status/даты) — только то, что нужно витрине', async () => {
    const res = await request(app).get('/api/public/stages');
    const stage = res.body.find(s => s.id === publishedStageId);
    expect(Object.keys(stage).sort()).toEqual(['assignments', 'id', 'name']);
    expect(Object.keys(stage.assignments[0]).sort()).toEqual(['id', 'name', 'price', 'tasksCount']);
  });
});
