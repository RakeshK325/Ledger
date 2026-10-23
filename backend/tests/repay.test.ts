import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { config } from '../src/config/env';

describe('3. Repay Tests', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

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

  beforeEach(async () => {
    await prisma.loan.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.user.deleteMany({});

    // User 1
    const u1 = await prisma.user.create({ data: { phone: '+919999911111' } });
    user1Id = u1.id;
    user1Token = jwt.sign({ userId: user1Id }, config.jwtSecret, { expiresIn: '7d' });

    // User 2
    const u2 = await prisma.user.create({ data: { phone: '+919999922222' } });
    user2Id = u2.id;
    user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret, { expiresIn: '7d' });
  });

  it('sets repaid_at and transitions loan status to repaid', async () => {
    const loan = await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Meera Das',
        amount_paise: 150000,
        due_date: new Date('2028-10-10T00:00:00Z'),
        repaid_at: null,
      },
    });

    const res = await request(app)
      .patch(`/api/loans/${loan.id}/repay`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.loan.status).toBe('repaid');
    expect(res.body.loan.repaid_at).not.toBeNull();

    // Verify persisted in database
    const dbLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(dbLoan?.repaid_at).not.toBeNull();
  });

  it('repaying twice is safe (idempotent, returns the same loan without error)', async () => {
    const loan = await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Meera Das',
        amount_paise: 150000,
        due_date: new Date('2028-10-10T00:00:00Z'),
      },
    });

    // 1st repayment
    const res1 = await request(app)
      .patch(`/api/loans/${loan.id}/repay`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(res1.status).toBe(200);
    const firstRepaidAt = res1.body.loan.repaid_at;
    expect(res1.body.loan.status).toBe('repaid');

    // 2nd repayment
    const res2 = await request(app)
      .patch(`/api/loans/${loan.id}/repay`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(res2.status).toBe(200);
    expect(res2.body.loan.status).toBe('repaid');
    expect(res2.body.loan.repaid_at).toBe(firstRepaidAt);
  });

  it("another user cannot repay my loan (returns 404 NOT_FOUND)", async () => {
    const user1Loan = await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'User 1 Private Loan',
        amount_paise: 500000,
        due_date: new Date('2028-10-10T00:00:00Z'),
      },
    });

    // User 2 attempts to repay User 1's loan
    const res = await request(app)
      .patch(`/api/loans/${user1Loan.id}/repay`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error.message).toContain('Loan not found');

    // Verify loan was NOT modified in database
    const dbLoan = await prisma.loan.findUnique({ where: { id: user1Loan.id } });
    expect(dbLoan?.repaid_at).toBeNull();
  });

  it('repaying a nonexistent loan returns 404 NOT_FOUND', async () => {
    const res = await request(app)
      .patch('/api/loans/00000000-0000-0000-0000-000000000000/repay')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
