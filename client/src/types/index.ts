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
  companyFundId?: string | null;
  companyFund?: {
    id: string;
    title: string;
    receivedFrom: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
  } | null;
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
  totalFundsInjected?: number;
  totalRequirementsPending?: number;
  activeRequirementsCount?: number;
}

export type DemandPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DemandStatus = 'PENDING' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED';

export interface CompanyNoteItem {
  id?: string;
  noteId?: string;
  itemName: string;
  amount: number | string;
  createdAt?: string;
}

export interface CompanyNote {
  id: string;
  companyId: string;
  title: string;
  totalAmount: number | string;
  dueDate?: string | null;
  priority: DemandPriority;
  status: DemandStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; code: string };
  items: CompanyNoteItem[];
}

export interface CompanyNotesSummary {
  grandTotalPending: number;
  companyBreakdowns: {
    companyId: string;
    companyName: string;
    companyCode: string;
    pendingTotal: number;
  }[];
  counts: Record<string, { count: number; total: number }>;
}

export interface DashboardData {
  cards: DashboardCards;
  charts: {
    monthlyComparison: { month: string; cashIn: number; cashOut: number; net: number }[];
    categoryBreakdown: { name: string; value: number }[];
    companyComparison: { companyId: string; name: string; code: string; cashIn: number; cashOut: number; net: number; balance: number }[];
  };
  recentTransactions: Transaction[];
  activeNotes?: CompanyNote[];
}

export type FundStatus = 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';

export interface FundAllocation {
  transactionId: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  amount: number;
  paymentDate: string;
  referenceNo?: string | null;
  description?: string | null;
}

export interface CompanyFund {
  id: string;
  title: string;
  totalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  receivedFrom: string;
  receivingMethod?: string | null;
  fundDate: string;
  description?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  status: FundStatus;
  createdAt: string;
  updatedAt: string;
  allocationsCount?: number;
  allocations?: FundAllocation[];
}

export interface FundsSummary {
  totalFundsReceived: number;
  totalAllocated: number;
  remainingPoolBalance: number;
  totalCount: number;
}
