import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production-min-32-chars',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
