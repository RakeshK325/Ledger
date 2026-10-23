import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { config } from '../src/config/env';

describe('2. Loans Tests', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

  const validImagePath = path.join(__dirname, 'test-image.png');
  const dummyTxtPath = path.join(__dirname, 'test-doc.txt');
  const oversizedImagePath = path.join(__dirname, 'test-oversized.png');

  beforeAll(async () => {
    // Reset database tables
    await prisma.loan.deleteMany({});
    await prisma.otpCode.deleteMany({});
    await prisma.user.deleteMany({});

    // 1x1 valid PNG in base64
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    fs.writeFileSync(validImagePath, Buffer.from(pngBase64, 'base64'));

    // Non-image text file
    fs.writeFileSync(dummyTxtPath, 'this is a text document, not an image');

    // Oversized file > 5 MB (5.2 MB buffer)
    const bigBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0);
    fs.writeFileSync(oversizedImagePath, bigBuffer);
  });

  afterAll(async () => {
    // Cleanup generated test files
    if (fs.existsSync(validImagePath)) fs.unlinkSync(validImagePath);
    if (fs.existsSync(dummyTxtPath)) fs.unlinkSync(dummyTxtPath);
    if (fs.existsSync(oversizedImagePath)) fs.unlinkSync(oversizedImagePath);

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

    // User 2 (for multi-tenant scoping tests)
    const u2 = await prisma.user.create({ data: { phone: '+919999922222' } });
    user2Id = u2.id;
    user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret, { expiresIn: '7d' });
  });

  describe('Loan Creation Validations', () => {
    it('should create a valid loan with amount converted to paise and status pending', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Rohan Mehta')
        .field('amount', '2500.50')
        .field('due_date', '2028-12-31');

      expect(res.status).toBe(201);
      expect(res.body.loan).toBeDefined();
      expect(res.body.loan.friend_name).toBe('Rohan Mehta');
      expect(res.body.loan.amount_paise).toBe(250050); // ₹2500.50 = 250050 paise
      expect(res.body.loan.status).toBe('pending');
      expect(res.body.loan.receiptUrl).toBeNull();
      expect(res.body.loan.user_id).toBe(user1Id);
    });

    it('should reject empty friend_name', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', '   ')
        .field('amount', '500.00')
        .field('due_date', '2028-12-31');

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject zero amount ("0" and "0.00")', async () => {
      const res1 = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Test Friend')
        .field('amount', '0')
        .field('due_date', '2028-12-31');
      expect(res1.status).toBe(400);
      expect(res1.body.error).toHaveProperty('code', 'VALIDATION_ERROR');

      const res2 = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Test Friend')
        .field('amount', '0.00')
        .field('due_date', '2028-12-31');
      expect(res2.status).toBe(400);
      expect(res2.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject negative amount ("-50")', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Test Friend')
        .field('amount', '-50.00')
        .field('due_date', '2028-12-31');

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject past due date', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Test Friend')
        .field('amount', '1000')
        .field('due_date', '2020-01-01');

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Due date cannot be in the past');
    });

    it('should reject non-image file upload (.txt)', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Priya Nair')
        .field('amount', '500')
        .field('due_date', '2028-12-31')
        .attach('receipt', dummyTxtPath);

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'INVALID_FILE_TYPE');
      expect(res.body.error.message).toContain('Only JPG, PNG, and WebP images are allowed');
    });

    it('should reject a file over 5 MB', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`)
        .field('friend_name', 'Kabir Shah')
        .field('amount', '1500')
        .field('due_date', '2028-12-31')
        .attach('receipt', oversizedImagePath);

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'FILE_TOO_LARGE');
      expect(res.body.error.message).toContain('File size must not exceed 5 MB');
    });
  });

  describe('Loan List & Scoping', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // User 1 loans:
      // 1. Pending
      await prisma.loan.create({
        data: {
          user_id: user1Id,
          friend_name: 'Pending Friend',
          amount_paise: 100000,
          due_date: new Date(`${tomorrow}T00:00:00Z`),
        },
      });

      // 2. Overdue
      await prisma.loan.create({
        data: {
          user_id: user1Id,
          friend_name: 'Overdue Friend',
          amount_paise: 250000,
          due_date: new Date(`${yesterday}T00:00:00Z`),
        },
      });

      // 3. Repaid
      await prisma.loan.create({
        data: {
          user_id: user1Id,
          friend_name: 'Repaid Friend',
          amount_paise: 600000,
          due_date: new Date('2025-01-01T00:00:00Z'),
          repaid_at: new Date(),
        },
      });

      // User 2 loan
      await prisma.loan.create({
        data: {
          user_id: user2Id,
          friend_name: 'User2 Private Loan',
          amount_paise: 999900,
          due_date: new Date('2028-01-01T00:00:00Z'),
        },
      });
    });

    it('list shows the right status for pending, overdue, and repaid', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.loans.length).toBe(3);

      const statusMap = new Map(res.body.loans.map((l: any) => [l.friend_name, l.status]));
      expect(statusMap.get('Pending Friend')).toBe('pending');
      expect(statusMap.get('Overdue Friend')).toBe('overdue');
      expect(statusMap.get('Repaid Friend')).toBe('repaid');
    });

    it('another user cannot see my loan (404 / scoped)', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      const friendNames = res.body.loans.map((l: any) => l.friend_name);
      expect(friendNames).not.toContain('User2 Private Loan');
    });
  });
});
