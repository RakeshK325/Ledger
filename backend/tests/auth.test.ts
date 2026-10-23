import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

describe('1. Auth Tests', () => {
  const testPhone = '+919876543210';
  const rawPhone = '9876543210';

  // Reset the tables before this test file runs
  beforeAll(async () => {
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
  });

  describe('request-otp validation & behavior', () => {
    it('should validate request-otp and accept a valid 10-digit Indian phone (with optional +91)', async () => {
      // 1. Without +91
      const res1 = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: rawPhone });
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual({ ok: true });

      // Clean up to avoid rate limit
      await prisma.otpCode.deleteMany({});

      // 2. With +91
      const res2 = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: testPhone });
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ ok: true });
    });

    it('should reject invalid or missing phone numbers with validation error', async () => {
      // Missing phone
      const resEmpty = await request(app).post('/api/auth/request-otp').send({});
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toHaveProperty('code', 'VALIDATION_ERROR');

      // Invalid short phone
      const resShort = await request(app).post('/api/auth/request-otp').send({ phone: '12345' });
      expect(resShort.status).toBe(400);
      expect(resShort.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(resShort.body.error.message).toContain('valid 10-digit Indian mobile number');

      // Invalid letters in phone
      const resAlpha = await request(app).post('/api/auth/request-otp').send({ phone: 'abcdefghij' });
      expect(resAlpha.status).toBe(400);
      expect(resAlpha.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should rate-limit requests to 3 per phone per 10 minutes', async () => {
      // 3 allowed requests
      await request(app).post('/api/auth/request-otp').send({ phone: rawPhone });
      await request(app).post('/api/auth/request-otp').send({ phone: rawPhone });
      await request(app).post('/api/auth/request-otp').send({ phone: rawPhone });

      // 4th request must be rejected
      const res4 = await request(app).post('/api/auth/request-otp').send({ phone: rawPhone });
      expect(res4.status).toBe(429);
      expect(res4.body.error).toHaveProperty('code', 'TOO_MANY_REQUESTS');
    });
  });

  describe('verify-otp success & error conditions', () => {
    it('should verify OTP successfully, mark it consumed, and return token and user', async () => {
      const code = '482913';
      const codeHash = await bcrypt.hash(code, 10);
      await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: rawPhone, code });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone).toBe(testPhone);

      // Verify OTP is marked consumed in database
      const consumedOtp = await prisma.otpCode.findFirst({
        where: { phone: testPhone },
      });
      expect(consumedOtp?.consumed_at).not.toBeNull();

      // Verify user created
      const user = await prisma.user.findUnique({ where: { phone: testPhone } });
      expect(user).not.toBeNull();
      expect(user?.id).toBe(res.body.user.id);
    });

    it('should reject wrong code, increment attempts, and return 400 INVALID_OTP', async () => {
      const correctCode = '112233';
      const codeHash = await bcrypt.hash(correctCode, 10);
      const otp = await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 0,
        },
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, code: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'INVALID_OTP');
      expect(res.body.error.message).toContain('Invalid verification code');

      // Verify attempts incremented in database
      const updatedOtp = await prisma.otpCode.findUnique({ where: { id: otp.id } });
      expect(updatedOtp?.attempts).toBe(1);
    });

    it('should reject expired code (by manipulating expires_at into the past)', async () => {
      const code = '123456';
      const codeHash = await bcrypt.hash(code, 10);
      // Manipulate expires_at to 10 seconds in the past
      await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: codeHash,
          expires_at: new Date(Date.now() - 10 * 1000),
          attempts: 0,
        },
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, code });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'OTP_EXPIRED');
    });

    it('should lockout after 3 attempts (reject verification when attempts >= 3)', async () => {
      const code = '123456';
      const codeHash = await bcrypt.hash(code, 10);
      // Create code with 3 attempts already exhausted
      await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: codeHash,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 3,
        },
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: testPhone, code });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('code', 'TOO_MANY_ATTEMPTS');
      expect(res.body.error.message).toContain('Maximum verification attempts exceeded');
    });

    it('should reuse the same user on second login (no duplicate user created)', async () => {
      const code1 = '111111';
      const hash1 = await bcrypt.hash(code1, 10);
      await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: hash1,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // First login: creates user
      const login1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: rawPhone, code: code1 });
      expect(login1.status).toBe(200);
      const user1Id = login1.body.user.id;

      // Second login with new OTP for same phone
      const code2 = '222222';
      const hash2 = await bcrypt.hash(code2, 10);
      await prisma.otpCode.create({
        data: {
          phone: testPhone,
          code_hash: hash2,
          expires_at: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const login2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: rawPhone, code: code2 });
      expect(login2.status).toBe(200);
      const user2Id = login2.body.user.id;

      // Assert user ID is identical
      expect(user2Id).toBe(user1Id);

      // Assert exactly 1 user exists in DB
      const userCount = await prisma.user.count({ where: { phone: testPhone } });
      expect(userCount).toBe(1);
    });
  });
});
