import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure tests always run against the test database (miniledger_test)
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/miniledger_test?schema=public';
