import path from 'path';
import { prisma } from '../../db/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { parseRupeesToPaise, CreateLoanInput } from '../../schemas/loan.schema';

export type LoanStatus = 'pending' | 'overdue' | 'repaid';

// Derived status calculation: repaid -> overdue -> pending
export function deriveLoanStatus(dueDate: Date, repaidAt: Date | null): LoanStatus {
  if (repaidAt !== null) {
    return 'repaid';
  }
  const todayStr = new Date().toISOString().split('T')[0];
  const dueStr = dueDate.toISOString().split('T')[0];

  if (dueStr < todayStr) {
    return 'overdue';
  }
  return 'pending';
}

// Formats Prisma Loan record for API responses
export function formatLoan(loan: {
  id: string;
  user_id: string;
  friend_name: string;
  amount_paise: number;
  due_date: Date;
  repaid_at: Date | null;
  receipt_path: string | null;
  created_at: Date;
}) {
  return {
    id: loan.id,
    user_id: loan.user_id,
    friend_name: loan.friend_name,
    amount_paise: loan.amount_paise,
    due_date: loan.due_date.toISOString().split('T')[0],
    repaid_at: loan.repaid_at ? loan.repaid_at.toISOString() : null,
    status: deriveLoanStatus(loan.due_date, loan.repaid_at),
    receipt_path: loan.receipt_path,
    receiptUrl: loan.receipt_path ? `/uploads/${path.basename(loan.receipt_path)}` : null,
    created_at: loan.created_at.toISOString(),
  };
}

export class LoansService {
  // Creates a new loan record scoped to the authenticated user
  public async createLoan(
    userId: string,
    data: CreateLoanInput,
    file?: Express.Multer.File
  ) {
    const amount_paise = parseRupeesToPaise(data.amount);
    const receipt_path = file ? file.filename : null;

    const loan = await prisma.loan.create({
      data: {
        user_id: userId,
        friend_name: data.friend_name,
        amount_paise,
        due_date: new Date(`${data.due_date}T00:00:00Z`),
        receipt_path,
      },
    });

    return formatLoan(loan);
  }

  // Lists all user loans ordered newest due date first, with optional status filter
  public async getLoans(userId: string, statusFilter?: LoanStatus) {
    const loans = await prisma.loan.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        due_date: 'desc',
      },
    });

    const formatted = loans.map(formatLoan);

    if (statusFilter) {
      return formatted.filter((loan) => loan.status === statusFilter);
    }

    return formatted;
  }

  // Idempotently marks a loan as repaid; returns 404 if not found or unauthorized
  public async repayLoan(userId: string, loanId: string) {
    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        user_id: userId,
      },
    });

    if (!loan) {
      throw new AppError(404, 'NOT_FOUND', 'Loan not found');
    }

    // Idempotent: if already repaid, return as-is
    if (loan.repaid_at !== null) {
      return formatLoan(loan);
    }

    const updated = await prisma.loan.update({
      where: { id: loan.id },
      data: {
        repaid_at: new Date(),
      },
    });

    return formatLoan(updated);
  }

  // Computes aggregate totals in ONE SQL query using SUM(...) FILTER (WHERE ...) with COALESCE
  public async getSummary(userId: string) {
    const results = await prisma.$queryRaw<
      Array<{ totalLent: bigint; totalRepaid: bigint; overdueAmount: bigint }>
    >`
      SELECT
        COALESCE(SUM(amount_paise), 0) AS "totalLent",
        COALESCE(SUM(amount_paise) FILTER (WHERE repaid_at IS NOT NULL), 0) AS "totalRepaid",
        COALESCE(SUM(amount_paise) FILTER (WHERE repaid_at IS NULL AND due_date < CURRENT_DATE), 0) AS "overdueAmount"
      FROM loans
      WHERE user_id = ${userId}
    `;

    const row = results[0];

    return {
      totalLent: Number(row.totalLent),
      totalRepaid: Number(row.totalRepaid),
      overdueAmount: Number(row.overdueAmount),
    };
  }
}

export const loansService = new LoansService();
