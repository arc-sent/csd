const request = require('supertest');
const { createApp } = require('../src/app');

describe('GET /api/health', () => {
  it('возвращает статус ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('неизвестный маршрут', () => {
  it('отвечает 404', async () => {
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
