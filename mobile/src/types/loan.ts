export interface LoanItem {
  id: string;
  user_id: string;
  friend_name: string;
  amount_paise: number;
  due_date: string;
  repaid_at: string | null;
  status: 'pending' | 'overdue' | 'repaid';
  receipt_path: string | null;
  receiptUrl: string | null;
  created_at: string;
}

export interface SummaryData {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}
