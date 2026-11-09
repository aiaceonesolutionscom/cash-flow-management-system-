export type AccountType = 'CASH' | 'BANK' | 'WALLET';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type TransactionType = 'CASH_IN' | 'CASH_OUT';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'BALANCE_ADJUST';

export interface Company {
  id: string;
  name: string;
  code: string;
  currency: string;
  accounts?: Account[];
  metrics?: {
    totalCashIn: string;
    totalCashOut: string;
    netCashFlow: string;
    totalBalance: string;
  };
}

export interface Account {
  id: string;
  companyId: string;
  name: string;
  type: AccountType;
  openingBalance: string | number;
  currentBalance: string | number;
  company?: Company;
}

export interface Category {
  id: string;
  companyId?: string | null;
  name: string;
  type: CategoryType;
  isDefault: boolean;
  company?: { id: string; name: string };
  _count?: { transactions: number };
}

export interface Attachment {
  id: string;
  transactionId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  filePath: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string | number;
  party: string;
  paymentDate: string;
  referenceNo?: string | null;
  description?: string | null;
  company: { id: string; name: string; code: string };
  account: { id: string; name: string; type: AccountType };
  category: { id: string; name: string; type?: CategoryType };
  attachments?: Attachment[];
}

export interface Transfer {
  id: string;
  companyId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string | number;
  transferDate: string;
  referenceNo?: string | null;
  notes?: string | null;
  company: { id: string; name: string; code: string };
  fromAccount: { id: string; name: string; type: AccountType };
  toAccount: { id: string; name: string; type: AccountType };
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DashboardCards {
  totalCashIn: string;
  totalCashOut: string;
  totalExpenses: string;
  netCashFlow: string;
  totalAvailableBalance: string;
  cashAccountBalance: string;
  bankAccountBalance: string;
  walletAccountBalance: string;
}

export interface DashboardData {
  cards: DashboardCards;
  charts: {
    monthlyComparison: { month: string; cashIn: number; cashOut: number; net: number }[];
    categoryBreakdown: { name: string; value: number }[];
    companyComparison: { companyId: string; name: string; code: string; cashIn: number; cashOut: number; net: number; balance: number }[];
  };
  recentTransactions: Transaction[];
}
