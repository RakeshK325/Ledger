import { z } from 'zod';

// Utility function to convert rupee string to integer paise without floating-point inaccuracies
export function parseRupeesToPaise(amountStr: string): number {
  const parts = amountStr.trim().split('.');
  const rupees = parseInt(parts[0], 10);
  const paisePart = parts[1] || '0';
  const paise = parseInt(paisePart.padEnd(2, '0').slice(0, 2), 10);
  return rupees * 100 + paise;
}

export const createLoanSchema = z.object({
  friend_name: z
    .string({ required_error: 'Friend name is required' })
    .trim()
    .min(1, 'Friend name must be at least 1 character')
    .max(80, 'Friend name cannot exceed 80 characters'),
  amount: z
    .string({ required_error: 'Amount is required' })
    .trim()
    .regex(/^(?:[1-9]\d*|0)(?:\.\d{1,2})?$/, 'Amount must be a positive number with at most 2 decimal places')
    .refine((val) => {
      const paise = parseRupeesToPaise(val);
      // Must be > 0 and <= 1 crore rupees (10,000,000 rupees = 1,000,000,000 paise)
      return paise > 0 && paise <= 1_000_000_000;
    }, {
      message: 'Amount must be greater than 0 and at most 1 crore (₹10,000,000)',
    }),
  due_date: z
    .string({ required_error: 'Due date is required' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .refine((val) => {
      // Must not be in the past compared to today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      return val >= todayStr;
    }, {
      message: 'Due date cannot be in the past',
    }),
});

export const loanQuerySchema = z.object({
  status: z.enum(['pending', 'overdue', 'repaid']).optional(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type LoanQueryInput = z.infer<typeof loanQuerySchema>;
