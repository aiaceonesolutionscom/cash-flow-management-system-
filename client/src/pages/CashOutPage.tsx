import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Trash2, ArrowUpRight, Paperclip, Loader2, RefreshCw } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transaction, Account, Category } from '../types';
import { format } from 'date-fns';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';

interface CashOutPageProps {
  onOpenCreate: () => void;
}

export const CashOutPage: React.FC<CashOutPageProps> = ({ onOpenCreate }) => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('0.00');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; party: string; amount: string; category: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          api.get('/accounts', { params: { companyId: selectedCompanyId } }),
          api.get('/categories', { params: { companyId: selectedCompanyId, type: 'EXPENSE' } })
        ]);
        if (accRes.data.success) setAccounts(accRes.data.accounts);
        if (catRes.data.success) setCategories(catRes.data.categories);
      } catch (e) {
        console.error(e);
      }
    };
    fetchDropdowns();
  }, [selectedCompanyId]);

  const fetchCashOut = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        search: searchTerm || undefined,
        accountId: accountFilter !== 'all' ? accountFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        page,
        limit
      };
      const res = await api.get('/cash-out', { params });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setTotalAmount(res.data.meta.totalAmount);
        setTotalCount(res.data.meta.totalCount);
        setTotalPages(res.data.meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load Cash Out records', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashOut();
  }, [selectedCompanyId, accountFilter, categoryFilter, page, limit, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCashOut();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/cash-out/${deleteTarget.id}`);
      if (res.data.success) {
        setDeleteTarget(null);
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cash Out & Expense Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track and control outgoing payments, operational overhead & expenses for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCashOut}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Cash Out
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Cash Out Outflow</div>
            <div className="text-2xl font-bold text-rose-600 tabular-nums mt-1">{formatPKR(totalAmount)}</div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-full">
            {totalCount} Total Entries
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Automatic Account Deduction</div>
            <div className="text-xs text-slate-600 mt-1">Every recorded Cash Out immediately decrements the selected account's available funds.</div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vendor, reference #, or description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            <span>Loading Cash Out records...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No Cash Out records found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Paid To / Vendor</th>
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
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {tx.category.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {tx.account.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.referenceNo || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 tabular-nums">
                      -{formatPKR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.attachments && tx.attachments.length > 0 ? (
                        <a
                          href={tx.attachments[0].filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          title="View receipt"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDeleteTarget({
                          id: tx.id,
                          party: tx.party || 'Vendor',
                          amount: String(tx.amount),
                          category: tx.category.name
                        })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Cash Out"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        title="Delete Cash Out & Expense Record"
        message={`Are you sure you want to delete this payment to "${deleteTarget?.party}" (${deleteTarget?.category}) for PKR ${formatPKR(deleteTarget?.amount || '0')}?\n\nThe amount will be restored back to the account balance.`}
        confirmText="Delete Record"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
