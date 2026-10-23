import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { config } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';

export class AuthService {
  // Requests a new 6-digit OTP code for an Indian phone number
  public async requestOtp(phone: string): Promise<{ ok: boolean }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Limit to 3 requests per phone per 10 minutes
    const recentRequestsCount = await prisma.otpCode.count({
      where: {
        phone,
        created_at: { gte: tenMinutesAgo },
      },
    });

    if (recentRequestsCount >= 3) {
      throw new AppError(
        429,
        'TOO_MANY_REQUESTS',
        'Too many OTP requests. Please wait a few minutes before trying again'
      );
    }

    // Invalidate any older unconsumed codes for this phone
    await prisma.otpCode.updateMany({
      where: {
        phone,
        consumed_at: null,
      },
      data: {
        consumed_at: new Date(),
      },
    });

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const code_hash = await bcrypt.hash(code, 10);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);

    // Mock SMS delivery via server log
    console.log(`[MOCK OTP] ${phone} -> ${code}`);

    await prisma.otpCode.create({
      data: {
        phone,
        code_hash,
        expires_at,
      },
    });

    return { ok: true };
  }

  // Verifies the latest unconsumed OTP and issues a 7-day JWT
  public async verifyOtp(
    phone: string,
    code: string
  ): Promise<{ token: string; user: { id: string; phone: string; created_at: Date } }> {
    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        consumed_at: null,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!otp) {
      throw new AppError(400, 'INVALID_OTP', 'No active OTP found for this phone number');
    }

    // Reject if 3 or more failed attempts already occurred
    if (otp.attempts >= 3) {
      throw new AppError(400, 'TOO_MANY_ATTEMPTS', 'Maximum verification attempts exceeded');
    }

    // Reject if expired (5 minutes validity)
    if (otp.expires_at < new Date()) {
      throw new AppError(400, 'OTP_EXPIRED', 'Verification code has expired');
    }

    const isMatch = await bcrypt.compare(code, otp.code_hash);

    if (!isMatch) {
      // Increment attempt counter on wrong code
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });

      throw new AppError(400, 'INVALID_OTP', 'Invalid verification code');
    }

    // Mark code as consumed
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumed_at: new Date() },
    });

    // Create user if they do not exist yet
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    // Sign JWT with user id valid for 7 days
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        created_at: user.created_at,
      },
    };
  }

  // Fetch current authenticated user
  public async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    return user;
  }
}

export const authService = new AuthService();
