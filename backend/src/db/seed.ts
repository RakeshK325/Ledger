import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

/**
 * Seeds the database with a demo user (+919999999999) and 8 realistic loans.
 * Safe to run multiple times (idempotent).
 */
async function main() {
  const phone = '+919999999999';

  console.log(`[SEED] Upserting demo user with phone: ${phone}`);
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  // Clear existing loans for the demo user to make the seed safe to run repeatedly
  await prisma.loan.deleteMany({
    where: { user_id: user.id },
  });

  // Optional: create a pre-generated valid OTP 123456 for easy demo login
  const demoOtp = '123456';
  const code_hash = await bcrypt.hash(demoOtp, 10);
  const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Clear older unused OTPs for demo user
  await prisma.otpCode.deleteMany({
    where: { phone },
  });

  await prisma.otpCode.create({
    data: {
      phone,
      code_hash,
      expires_at,
    },
  });

  console.log(`[SEED] Demo OTP for ${phone} is: ${demoOtp}`);

  // Base timestamps relative to today
  const now = new Date();

  // Helper to offset days from today
  const daysOffset = (days: number): Date => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  // 8 realistic loans (mix of overdue, repaid, and pending)
  const loansData = [
    // 1. Rohan Mehta - OVERDUE (due 10 days ago)
    {
      user_id: user.id,
      friend_name: 'Rohan Mehta',
      amount_paise: 250000, // ₹2,500
      due_date: daysOffset(-10),
      repaid_at: null,
      created_at: daysOffset(-30),
    },
    // 2. Sneha Iyer - OVERDUE (due 20 days ago)
    {
      user_id: user.id,
      friend_name: 'Sneha Iyer',
      amount_paise: 450000, // ₹4,500
      due_date: daysOffset(-20),
      repaid_at: null,
      created_at: daysOffset(-40),
    },
    // 3. Priya Nair - REPAID (due 4 days ago, settled)
    {
      user_id: user.id,
      friend_name: 'Priya Nair',
      amount_paise: 600000, // ₹6,000
      due_date: daysOffset(-4),
      repaid_at: daysOffset(-4),
      created_at: daysOffset(-25),
    },
    // 4. Aarav Mehta - REPAID (due 18 days ago, settled)
    {
      user_id: user.id,
      friend_name: 'Aarav Mehta',
      amount_paise: 120000, // ₹1,200
      due_date: daysOffset(-18),
      repaid_at: daysOffset(-18),
      created_at: daysOffset(-35),
    },
    // 5. Pooja Nair - REPAID (due 12 days ago, settled)
    {
      user_id: user.id,
      friend_name: 'Pooja Nair',
      amount_paise: 310000, // ₹3,100
      due_date: daysOffset(-12),
      repaid_at: daysOffset(-12),
      created_at: daysOffset(-28),
    },
    // 6. Arjun Rao - PENDING (due in 8 days)
    {
      user_id: user.id,
      friend_name: 'Arjun Rao',
      amount_paise: 100000, // ₹1,000
      due_date: daysOffset(8),
      repaid_at: null,
      created_at: daysOffset(-5),
    },
    // 7. Kabir Shah - PENDING (due in 24 days)
    {
      user_id: user.id,
      friend_name: 'Kabir Shah',
      amount_paise: 300000, // ₹3,000
      due_date: daysOffset(24),
      repaid_at: null,
      created_at: daysOffset(-3),
    },
    // 8. Meera Das - PENDING (due in 6 days)
    {
      user_id: user.id,
      friend_name: 'Meera Das',
      amount_paise: 150000, // ₹1,500
      due_date: daysOffset(6),
      repaid_at: null,
      created_at: daysOffset(-2),
    },
  ];

  for (const loan of loansData) {
    await prisma.loan.create({
      data: loan,
    });
  }

  console.log(`[SEED] Created ${loansData.length} loans for ${phone}:`);
  console.log(`       - 2 Overdue (₹7,000 total)`);
  console.log(`       - 3 Repaid  (₹10,300 total)`);
  console.log(`       - 3 Pending (₹5,500 total)`);
  console.log(`[SEED] Total recorded: ₹22,800. Seed successfully completed.`);
}

main()
  .catch((e) => {
    console.error('[SEED] Error running seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
