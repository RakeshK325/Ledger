import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

describe('5. Unauthenticated & Authorization Guard Tests', () => {
  beforeAll(async () => {
    // Reset database tables
    await prisma.loan.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.loan.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  it('rejects POST /api/loans without Authorization header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).post('/api/loans').send({
      friend_name: 'Test',
      amount: '100',
      due_date: '2028-12-31',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('rejects GET /api/loans without Authorization header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/loans');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('rejects PATCH /api/loans/:id/repay without Authorization header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).patch('/api/loans/some-id/repay');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('rejects GET /api/summary without Authorization header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/summary');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('rejects GET /api/auth/me without Authorization header with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });

  it('rejects requests with malformed Bearer tokens with 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .get('/api/loans')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    expect(res.body.error.message).toContain('Invalid or expired token');
  });

  it('rejects requests with token signed by an untrusted secret with 401 UNAUTHORIZED', async () => {
    const forgedToken = jwt.sign({ userId: 'fake-user-id' }, 'wrong-secret-key');

    const res = await request(app)
      .get('/api/loans')
      .set('Authorization', `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});
