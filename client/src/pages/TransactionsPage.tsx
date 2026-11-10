import React, { useEffect, useState } from 'react';
import { Search, ReceiptText, Loader2, RefreshCw, Paperclip, Trash2, Calendar } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transaction, Category } from '../types';
import { format } from 'date-fns';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { UndoToast } from '../components/common/UndoToast';

export const TransactionsPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalCashIn, setTotalCashIn] = useState<string>('0.00');
  const [totalCashOut, setTotalCashOut] = useState<string>('0.00');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: string; party: string; amount: string } | null>(null);
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

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const catRes = await api.get('/categories', { params: { companyId: selectedCompanyId } });
        if (catRes.data.success) {
          const rawCats: Category[] = catRes.data.categories || [];
          if (!selectedCompanyId || selectedCompanyId === 'all') {
            const seen = new Set<string>();
            const uniqueCats = rawCats.filter((c) => {
              const key = `${c.name.trim().toLowerCase()}_${c.type}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setCategories(uniqueCats);
          } else {
            setCategories(rawCats);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDropdowns();
  }, [selectedCompanyId]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        page,
        limit,
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        accountType: accountFilter !== 'all' ? accountFilter : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined
      };
      const res = await api.get('/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setTotalCount(res.data.meta.totalCount);
        setTotalPages(res.data.meta.totalPages);
        setTotalCashIn(res.data.meta.totalCashIn);
        setTotalCashOut(res.data.meta.totalCashOut);
      }
    } catch (err) {
      console.error('Failed to load transaction ledger', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetSnapshot = transactions.find((t) => t.id === deleteTarget.id);

    try {
      setIsDeleting(true);
      const endpoint = deleteTarget.type === 'CASH_IN' ? `/cash-in/${deleteTarget.id}` : `/cash-out/${deleteTarget.id}`;
      const res = await api.delete(endpoint);
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

  useEffect(() => {
    fetchTransactions();
  }, [selectedCompanyId, page, limit, typeFilter, accountFilter, categoryFilter, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Centralized Financial Ledger</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete master transaction ledger for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs self-start sm:self-auto flex items-center space-x-1.5"
          title="Refresh Ledger"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Filtered Cash In</div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums mt-1">+{formatPKR(totalCashIn)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Filtered Cash Out</div>
          <div className="text-xl font-bold text-rose-600 tabular-nums mt-1">-{formatPKR(totalCashOut)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Ledger Records</div>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">{totalCount} Entries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search party, vendor, reference or note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Types</option>
            <option value="CASH_IN">Cash In (+)</option>
            <option value="CASH_OUT">Cash Out (-)</option>
          </select>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => { setAccountFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">All Payment Types</option>
            <option value="CASH">💵 Cash</option>
            <option value="BANK">🏦 Bank</option>
            <option value="WALLET">📱 Wallet</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading master transaction ledger...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No transactions match the selected criteria.
          </div>
        ) : (
          <>
            {/* Mobile Card View (Zero horizontal scroll needed - 100% visible on mobile) */}
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
                    <div className={`text-sm font-bold tabular-nums ${
                      tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{tx.party}</div>
                      {tx.description && <div className="text-[11px] text-slate-500 mt-0.5">{tx.description}</div>}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      tx.type === 'CASH_IN'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                    </span>
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
                              title: 'Transaction Receipt',
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
                        onClick={() => setDeleteTarget({
                          id: tx.id,
                          type: tx.type,
                          party: tx.party || 'Transaction',
                          amount: String(tx.amount)
                        })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Transaction"
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
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Party / Vendor</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {format(new Date(tx.paymentDate), 'yyyy-MM-dd')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {tx.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{tx.company.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.type === 'CASH_IN'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{tx.category.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{tx.party}</div>
                        {tx.description && <div className="text-[10px] text-slate-400 font-normal">{tx.description}</div>}
                      </td>
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
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${
                        tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
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
                                title: 'Transaction Receipt',
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
                        <button
                          onClick={() => setDeleteTarget({
                            id: tx.id,
                            type: tx.type,
                            party: tx.party || 'Transaction',
                            amount: String(tx.amount)
                          })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Unified Pagination Bar */}
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
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Transaction"
        message={`Are you sure you want to delete this ${deleteTarget?.type === 'CASH_IN' ? 'Cash In' : 'Cash Out'} record for "${deleteTarget?.party}" amounting to PKR ${formatPKR(deleteTarget?.amount || '0')}?\n\nThe account balance will be reversed and restored accordingly.`}
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

      {/* Floating Undo Toast */}
      <UndoToast
        isOpen={!!undoSnapshot}
        message={`Deleted transaction for "${undoSnapshot?.party}" (PKR ${formatPKR(undoSnapshot?.amount || '0')})`}
        onUndo={handleUndo}
        onClose={() => setUndoSnapshot(null)}
        durationMs={8000}
      />
    </div>
  );
};
