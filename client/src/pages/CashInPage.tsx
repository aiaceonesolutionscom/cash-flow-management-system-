import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Trash2, ArrowDownRight, Paperclip, Loader2, RefreshCw, Calendar, Building2, Printer } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transaction, Category } from '../types';
import { format } from 'date-fns';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { UndoToast } from '../components/common/UndoToast';
import { PaymentVoucherModal } from '../components/common/PaymentVoucherModal';

interface CashInPageProps {
  onOpenCreate: () => void;
}

export const CashInPage: React.FC<CashInPageProps> = ({ onOpenCreate }) => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('0.00');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; party: string; amount: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [undoSnapshot, setUndoSnapshot] = useState<any | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<{
    attachmentId: string;
    originalName: string;
    mimeType: string;
    title: string;
    amount: string;
    party: string;
  } | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<Transaction | null>(null);

  // Fetch income categories for filter dropdown
  useEffect(() => {
    const fetchIncomeCategories = async () => {
      try {
        const res = await api.get('/categories', {
          params: { companyId: selectedCompanyId, type: 'INCOME' }
        });
        if (res.data.success) {
          const raw: Category[] = res.data.categories || [];
          const seen = new Set<string>();
          const unique = raw.filter((c) => {
            const k = c.name.trim().toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setCategories(unique);
        }
      } catch (err) {
        console.error('Failed to load income categories', err);
      }
    };
    fetchIncomeCategories();
  }, [selectedCompanyId]);

  const fetchCashIn = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        search: searchTerm || undefined,
        accountType: accountFilter !== 'all' ? accountFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        page,
        limit
      };
      const res = await api.get('/cash-in', { params });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setTotalAmount(res.data.meta.totalAmount);
        setTotalCount(res.data.meta.totalCount);
        setTotalPages(res.data.meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load Cash In records', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashIn();
  }, [selectedCompanyId, accountFilter, categoryFilter, page, limit, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCashIn();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetSnapshot = transactions.find((t) => t.id === deleteTarget.id);

    try {
      setIsDeleting(true);
      const res = await api.delete(`/cash-in/${deleteTarget.id}`);
      if (res.data.success) {
        if (targetSnapshot) {
          setUndoSnapshot({
            id: targetSnapshot.id,
            companyId: targetSnapshot.companyId,
            accountId: targetSnapshot.accountId,
            categoryId: targetSnapshot.categoryId,
            type: targetSnapshot.type,
            amount: targetSnapshot.amount,
            party: targetSnapshot.party,
            paymentDate: targetSnapshot.paymentDate,
            referenceNo: targetSnapshot.referenceNo,
            description: targetSnapshot.description
          });
        }
        setDeleteTarget(null);
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndo = async () => {
    if (!undoSnapshot) return;
    try {
      const res = await api.post('/transactions/restore', undoSnapshot);
      if (res.data.success) {
        setUndoSnapshot(null);
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore record');
    }
  };

  const fundCategory = categories.find((c) => c.name.toLowerCase().includes('fund'));
  const isFundFilterActive = Boolean(
    categoryFilter === 'company_funds' || (fundCategory && categoryFilter === fundCategory.id)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cash In Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Incoming revenue, client receipts & deposits for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCashIn}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Cash In
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Cash In Inflow</div>
            <div className="text-2xl font-bold text-indigo-600 tabular-nums mt-1">{formatPKR(totalAmount)}</div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 font-medium rounded-full">
            {totalCount} Total Entries
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Financial Account Impact</div>
            <div className="text-xs text-slate-600 mt-1">Each Cash In entry automatically increases the balance of its assigned account.</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Inflows
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryFilter(fundCategory ? fundCategory.id : 'company_funds');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              isFundFilterActive
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>🏢 Company Funds Injected</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by payer, receipt #, or description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </form>

          <div className="flex items-center space-x-2 w-full sm:w-auto flex-wrap">
            {/* Category Dropdown Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">All Categories</option>
              {fundCategory ? (
                <option value={fundCategory.id}>🏢 Company Funds</option>
              ) : (
                <option value="company_funds">🏢 Company Funds</option>
              )}
              {categories
                .filter((c) => !c.name.toLowerCase().includes('fund'))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            {/* Account Type Filter */}
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
            >
              <option value="all">All Accounts</option>
              <option value="CASH">💵 Cash</option>
              <option value="BANK">🏦 Bank</option>
              <option value="WALLET">📱 Wallet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading Cash In records...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No Cash In records found matching the current filters.
          </div>
        ) : (
          <>
            {/* Mobile Card View (Zero horizontal sliding, everything in front of eyes) */}
            <div className="md:hidden divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{format(new Date(tx.paymentDate), 'dd MMM yyyy')}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700 font-semibold">{tx.company.name}</span>
                    </div>
                    <div className="text-sm font-semibold text-indigo-600 tabular-nums">
                      +{formatPKR(tx.amount)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900">{tx.party}</div>
                    {tx.description && <div className="text-[11px] text-slate-500 mt-0.5">{tx.description}</div>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {tx.category.name}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.account.type === 'CASH'
                          ? 'bg-emerald-50 text-emerald-700'
                          : tx.account.type === 'BANK'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {tx.account.type === 'CASH' ? '💵 Cash' : tx.account.type === 'BANK' ? '🏦 Bank' : '📱 Wallet'}
                      </span>
                      {tx.referenceNo && (
                        <span className="text-[10px] font-mono text-slate-400">#{tx.referenceNo}</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {tx.attachments && tx.attachments.length > 0 && tx.attachments[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            const att = tx.attachments![0];
                            setActiveReceipt({
                              attachmentId: att.id,
                              originalName: att.originalName,
                              mimeType: att.mimeType,
                              title: 'Cash In Receipt',
                              amount: formatPKR(tx.amount),
                              party: tx.party
                            });
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveVoucher(tx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Print Receipt Voucher"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteTarget({ id: tx.id, party: tx.party || 'Record', amount: String(tx.amount) })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Cash In"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Full Table (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Received From</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {format(new Date(tx.paymentDate), 'yyyy-MM-dd')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{tx.company.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{tx.party}</div>
                        {tx.description && <div className="text-[10px] text-slate-400 font-normal">{tx.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{tx.category.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          tx.account.type === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700'
                            : tx.account.type === 'BANK'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {tx.account.type === 'CASH' ? '💵 Cash' : tx.account.type === 'BANK' ? '🏦 Bank' : '📱 Wallet'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.referenceNo || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-indigo-600 tabular-nums">
                        +{formatPKR(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tx.attachments && tx.attachments.length > 0 && tx.attachments[0] ? (
                          <button
                            type="button"
                            onClick={() => {
                              const att = tx.attachments![0];
                              setActiveReceipt({
                                attachmentId: att.id,
                                originalName: att.originalName,
                                mimeType: att.mimeType,
                                title: 'Cash In Receipt',
                                amount: formatPKR(tx.amount),
                                party: tx.party
                              });
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer"
                            title="View & Download Receipt"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setActiveVoucher(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Print Receipt Voucher"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: tx.id, party: tx.party || 'Record', amount: String(tx.amount) })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Cash In"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Bar */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          itemsPerPage={limit}
          onPageChange={(p) => setPage(p)}
          onItemsPerPageChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Cash In Record"
        message={`Are you sure you want to delete this Cash In record from "${deleteTarget?.party}" for PKR ${formatPKR(deleteTarget?.amount || '0')}?\n\nThe account balance will be automatically reversed and restored.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Receipt Preview Lightbox Modal */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        attachmentId={activeReceipt?.attachmentId}
        originalName={activeReceipt?.originalName}
        mimeType={activeReceipt?.mimeType}
        title={activeReceipt?.title}
        amount={activeReceipt?.amount}
        party={activeReceipt?.party}
      />

      {/* Printable Payment Voucher Modal */}
      <PaymentVoucherModal
        isOpen={!!activeVoucher}
        onClose={() => setActiveVoucher(null)}
        transaction={activeVoucher}
      />

      {/* Undo Toast Notification */}
      <UndoToast
        isOpen={!!undoSnapshot}
        message={`Cash In record for "${undoSnapshot?.party}" (PKR ${formatPKR(undoSnapshot?.amount || '0')}) deleted.`}
        onUndo={handleUndo}
        onClose={() => setUndoSnapshot(null)}
        durationMs={8000}
      />
    </div>
  );
};
