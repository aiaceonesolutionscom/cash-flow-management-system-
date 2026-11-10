import React, { useEffect, useState } from 'react';
import { Search, ReceiptText, Loader2, RefreshCw, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transaction, Account, Category } from '../types';
import { format } from 'date-fns';

export const TransactionsPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, activeCompanyName } = useFilters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalCashIn, setTotalCashIn] = useState<string>('0.00');
  const [totalCashOut, setTotalCashOut] = useState<string>('0.00');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [limit] = useState<number>(25);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          api.get('/accounts', { params: { companyId: selectedCompanyId } }),
          api.get('/categories', { params: { companyId: selectedCompanyId } })
        ]);
        if (accRes.data.success) setAccounts(accRes.data.accounts);
        if (catRes.data.success) setCategories(catRes.data.categories);
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
        accountId: accountFilter !== 'all' ? accountFilter : undefined,
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

  useEffect(() => {
    fetchTransactions();
  }, [selectedCompanyId, page, typeFilter, accountFilter, categoryFilter, refreshTrigger]);

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
            className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
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
          <div className="overflow-x-auto">
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
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {tx.account.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.referenceNo || '—'}</td>
                    <td className={`py-3 px-4 text-right font-bold tabular-nums ${
                      tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tx.attachments && tx.attachments.length > 0 ? (
                        <a
                          href={tx.attachments[0].filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing Page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
