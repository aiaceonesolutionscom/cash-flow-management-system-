import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Search, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Transfer } from '../types';
import { format } from 'date-fns';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';

interface TransfersPageProps {
  onOpenCreate: () => void;
}

export const TransfersPage: React.FC<TransfersPageProps> = ({ onOpenCreate }) => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>('0.00');
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; amount: string; from: string; to: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        companyId: selectedCompanyId,
        search: searchTerm || undefined,
        page,
        limit
      };
      const res = await api.get('/transfers', { params });
      if (res.data.success) {
        setTransfers(res.data.transfers);
        setTotalAmount(res.data.meta.totalAmount);
        setTotalCount(res.data.meta.totalCount);
        setTotalPages(res.data.meta.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load transfers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [selectedCompanyId, page, limit, refreshTrigger]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTransfers();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/transfers/${deleteTarget.id}`);
      if (res.data.success) {
        setDeleteTarget(null);
        triggerRefresh();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reverse transfer');
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
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Internal Money Transfers</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transfers between Cash, Bank, and Digital Wallet accounts for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTransfers}
            className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1.5" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Volume Transferred</div>
            <div className="text-2xl font-bold text-blue-600 tabular-nums mt-1">{formatPKR(totalAmount)}</div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full">
            {totalCount} Total Transfers
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Balance Invariance Guarantee</div>
            <div className="text-xs text-slate-600 mt-1">Transfers never change net company cash flow or total available funds. They simply reallocate liquidity.</div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference # or transfer notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading transfer history...</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No money transfer records found for the selected company.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">From (Source)</th>
                  <th className="py-3 px-4 text-center"></th>
                  <th className="py-3 px-4">To (Destination)</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {format(new Date(tr.transferDate), 'yyyy-MM-dd')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{tr.company.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium">
                        {tr.fromAccount.name} ({tr.fromAccount.type})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">→</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                        {tr.toAccount.name} ({tr.toAccount.type})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{tr.referenceNo || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{tr.notes || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600 tabular-nums">
                      {formatPKR(tr.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDeleteTarget({
                          id: tr.id,
                          amount: String(tr.amount),
                          from: tr.fromAccount.name,
                          to: tr.toAccount.name
                        })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Reverse & Delete Transfer"
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
        title="Reverse & Delete Transfer"
        message={`Are you sure you want to reverse this transfer of PKR ${formatPKR(deleteTarget?.amount || '0')} from "${deleteTarget?.from}" to "${deleteTarget?.to}"?\n\nThe amount will be transferred back to the source account and reversed in the ledger.`}
        confirmText="Reverse Transfer"
        cancelText="Cancel"
        variant="warning"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
