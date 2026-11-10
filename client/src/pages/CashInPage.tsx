import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Trash2, ArrowDownRight, Paperclip, Loader2, RefreshCw } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transaction, Account } from '../types';
import { format } from 'date-fns';

interface CashInPageProps {
  onOpenCreate: () => void;
}

export const CashInPage: React.FC<CashInPageProps> = ({ onOpenCreate }) => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('0.00');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/accounts', {
          params: { companyId: selectedCompanyId }
        });
        if (res.data.success) {
          setAccounts(res.data.accounts);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAccounts();
  }, [selectedCompanyId]);

  const fetchCashIn = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        search: searchTerm || undefined,
        accountId: accountFilter !== 'all' ? accountFilter : undefined
      };
      const res = await api.get('/cash-in', { params });
      if (res.data.success) {
        setTransactions(res.data.transactions);
        setTotalAmount(res.data.meta.totalAmount);
        setTotalCount(res.data.meta.totalCount);
      }
    } catch (err) {
      console.error('Failed to load Cash In records', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashIn();
  }, [selectedCompanyId, accountFilter, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCashIn();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Cash In record? The account balance will be automatically reversed.')) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await api.delete(`/cash-in/${id}`);
      if (res.data.success) {
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

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
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
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
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Cash In Inflow</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums mt-1">{formatPKR(totalAmount)}</div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full">
            {totalCount} Total Entries
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Financial Account Impact</div>
            <div className="text-xs text-slate-600 mt-1">Each Cash In entry automatically increases the balance of its assigned account.</div>
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
            placeholder="Search by payer, receipt #, or description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="overflow-x-auto">
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
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {tx.account.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tx.referenceNo || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 tabular-nums">
                      +{formatPKR(tx.amount)}
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
                        onClick={() => handleDelete(tx.id)}
                        disabled={deletingId === tx.id}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Cash In"
                      >
                        {deletingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
