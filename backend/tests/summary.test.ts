import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { config } from '../src/config/env';

describe('4. Summary Tests', () => {
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

  it('computes exact totals for a mix of loans and verifies repaid loan past due is NOT counted as overdue', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // User 1 - Loan 1: Overdue (₹2,500.00)
    await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Rohan Mehta',
        amount_paise: 250000,
        due_date: new Date(`${yesterday}T00:00:00Z`),
        repaid_at: null,
      },
    });

    // User 1 - Loan 2: Overdue (₹4,500.00)
    await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Sneha Iyer',
        amount_paise: 450000,
        due_date: new Date(`${yesterday}T00:00:00Z`),
        repaid_at: null,
      },
    });

    // User 1 - Loan 3: Repaid past due date (₹6,000.00)
    // CRITICAL: due_date is in the past, but repaid_at is set -> MUST NOT count as overdue!
    await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Priya Nair',
        amount_paise: 600000,
        due_date: new Date(`${yesterday}T00:00:00Z`),
        repaid_at: new Date(),
      },
    });

    // User 1 - Loan 4: Pending (₹5,500.00)
    await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Kabir Shah',
        amount_paise: 550000,
        due_date: new Date(`${tomorrow}T00:00:00Z`),
        repaid_at: null,
      },
    });

    // User 1 - Loan 5: Repaid future loan (₹1,500.00)
    await prisma.loan.create({
      data: {
        user_id: user1Id,
        friend_name: 'Arjun Rao',
        amount_paise: 150000,
        due_date: new Date(`${nextWeek}T00:00:00Z`),
        repaid_at: new Date(),
      },
    });

    // User 2 - Loan 6: Another user's loan (₹50,000.00) -> MUST NOT affect User 1's summary
    await prisma.loan.create({
      data: {
        user_id: user2Id,
        friend_name: 'Other User Loan',
        amount_paise: 5000000,
        due_date: new Date(`${yesterday}T00:00:00Z`),
        repaid_at: null,
      },
    });

    // Hand Calculations for User 1:
    // totalLent:   250000 + 450000 + 600000 + 550000 + 150000 = 2,000,000 paise (₹20,000.00)
    // totalRepaid: 600000 + 150000 = 750,000 paise (₹7,500.00)
    // overdue:     250000 + 450000 = 700,000 paise (₹7,000.00) [Priya Nair ₹6,000 is excluded]

    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLent: 2000000,
      totalRepaid: 750000,
      overdueAmount: 700000,
    });

    // Assert that values are JavaScript numbers (not BigInt strings or floats)
    expect(typeof res.body.totalLent).toBe('number');
    expect(typeof res.body.totalRepaid).toBe('number');
    expect(typeof res.body.overdueAmount).toBe('number');
  });

  it('returns 0s for user with no loans', async () => {
    const res = await request(app)
      .get('/api/summary')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLent: 0,
      totalRepaid: 0,
      overdueAmount: 0,
    });
  });
});
