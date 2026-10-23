import { z } from 'zod';

// Normalize phone by stripping all non-digits (and leading +)
// Validates an Indian 10-digit number with optional +91 or 91 country code
export const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .transform((val) => val.trim().replace(/[\s-]/g, ''))
  .refine((val) => {
    // Accepts optional +91, 91, or bare 10-digit starting with 6, 7, 8, or 9
    return /^(?:\+91|91)?[6-9]\d{9}$/.test(val);
  }, {
    message: 'Please provide a valid 10-digit Indian mobile number',
  })
  .transform((val) => {
    // Standardize to E.164 format: +91XXXXXXXXXX
    const digits = val.replace(/\D/g, '');
    const tenDigits = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    return `+91${tenDigits}`;
  });

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .regex(/^\d{6}$/, 'Code must be a 6-digit number'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
