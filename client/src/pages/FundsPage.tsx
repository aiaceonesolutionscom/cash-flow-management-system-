import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  RefreshCw,
  Info,
  Pencil
} from 'lucide-react';
import { api } from '../services/api';
import { CompanyFund, FundsSummary, FundStatus, Company } from '../types';
import { AddFundModal } from '../components/funds/AddFundModal';
import { AttachmentViewerModal } from '../components/modals/AttachmentViewerModal';
import { CashInModal } from '../components/modals/CashInModal';

interface FundsPageProps {
  companies: Company[];
}

export const FundsPage: React.FC<FundsPageProps> = ({ companies }) => {
  const [funds, setFunds] = useState<CompanyFund[]>([]);
  const [summary, setSummary] = useState<FundsSummary>({
    totalFundsReceived: 0,
    totalAllocated: 0,
    remainingPoolBalance: 0,
    totalCount: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingFund, setEditingFund] = useState<CompanyFund | null>(null);
  const [viewerModalState, setViewerModalState] = useState<{
    isOpen: boolean;
    title: string;
    fileName?: string;
    fileUrl?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Quick Distribute via CashInModal
  const [distributeFundId, setDistributeFundId] = useState<string | null>(null);
  const [isCashInModalOpen, setIsCashInModalOpen] = useState<boolean>(false);

  // Expandable row IDs
  const [expandedFundIds, setExpandedFundIds] = useState<Record<string, boolean>>({});

  const loadFunds = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/funds', { params });
      if (res.data.success) {
        setFunds(res.data.funds || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load company funds:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFunds();
  };

  const toggleExpand = (id: string) => {
    setExpandedFundIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteFund = async (fund: CompanyFund) => {
    if (fund.allocatedAmount > 0) {
      alert(`Cannot delete this fund because PKR ${fund.allocatedAmount.toLocaleString()} has already been distributed to companies via Cash In. Please delete those Cash In entries first to reverse the funds.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${fund.title}" (PKR ${fund.totalAmount.toLocaleString()})?`)) {
      return;
    }

    try {
      const res = await api.delete(`/funds/${fund.id}`);
      if (res.data.success) {
        loadFunds();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete fund.');
    }
  };

  const openDistributeModal = (fundId: string) => {
    setDistributeFundId(fundId);
    setIsCashInModalOpen(true);
  };

  const getStatusBadge = (status: FundStatus) => {
    switch (status) {
      case 'FULLY_ALLOCATED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Fully Allocated</span>
          </span>
        );
      case 'PARTIALLY_ALLOCATED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Partially Allocated</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Coins className="w-3 h-3" />
            <span>Unallocated (Available)</span>
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Central Funds Pool</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Record external capital inflows & track remaining unallocated balances distributed across companies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={loadFunds}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
            title="Refresh Pool"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Inflow Fund</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards (Clean & Spacious Matching Screenshot 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Funds Received */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Funds Injected</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
              ₨ {summary.totalFundsReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Across {summary.totalCount} external capital injections
            </div>
          </div>
        </div>

        {/* Total Distributed to Companies */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Distributed to Companies</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight tabular-nums">
              ₨ {summary.totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalFundsReceived > 0
                      ? Math.min(100, (summary.totalAllocated / summary.totalFundsReceived) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 font-medium flex justify-between">
              <span>Allocated via Cash In</span>
              <span className="font-bold text-slate-600">
                {summary.totalFundsReceived > 0
                  ? ((summary.totalAllocated / summary.totalFundsReceived) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Remaining Unspent Pool */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-white to-blue-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Remaining Available Pool</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-800 tracking-tight tabular-nums">
              ₨ {summary.remainingPoolBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center space-x-1">
              <span>🟢 Unspent balance ready for company allocation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Funds' },
            { id: 'UNALLOCATED', label: 'Unallocated' },
            { id: 'PARTIALLY_ALLOCATED', label: 'Partially Allocated' },
            { id: 'FULLY_ALLOCATED', label: 'Fully Allocated' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search party, title..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </form>
      </div>

      {/* Funds List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading Central Funds Pool...</p>
        </div>
      ) : funds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Inflow Funds Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Click "Record Inflow Fund" above to add your first master fund received from an investor or director.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {funds.map((fund) => {
            const isExpanded = !!expandedFundIds[fund.id];
            const percentAllocated =
              fund.totalAmount > 0 ? (fund.allocatedAmount / fund.totalAmount) * 100 : 0;

            return (
              <div
                key={fund.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 hover:border-slate-300"
              >
                {/* Main Card Header */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Coins className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                          <h3 className="text-base font-bold text-slate-900">{fund.title}</h3>
                          {getStatusBadge(fund.status)}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                          <span>
                            From: <strong className="text-slate-800">{fund.receivedFrom}</strong>
                          </span>
                          {fund.receivingMethod && (
                            <>
                              <span>•</span>
                              <span>Method: <strong className="text-slate-700">{fund.receivingMethod}</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(fund.fundDate).toLocaleDateString('en-GB')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions on top right */}
                    <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                      {fund.attachmentUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setViewerModalState({
                              isOpen: true,
                              title: `Slip: ${fund.title}`,
                              fileName: fund.attachmentName || 'Receipt Slip',
                              fileUrl: fund.attachmentUrl || undefined
                            })
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all flex items-center space-x-1.5 cursor-pointer"
                          title="View Receipt Slip"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>View Slip</span>
                        </button>
                      )}

                      {fund.remainingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => openDistributeModal(fund.id)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all flex items-space-x-1.5 shadow-2xs cursor-pointer"
                          title="Allocate to a company via Cash In"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>+ Allocate via Cash In</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingFund(fund)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                        title="Edit Fund Details"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFund(fund)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Delete Fund"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics Strip (Spacious, Airy Design) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Fund Inflow</div>
                      <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums">
                        ₨ {fund.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Allocated to Companies</div>
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-600 tabular-nums">
                        ₨ {fund.allocatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="text-xs text-slate-400 font-semibold ml-1.5">
                          ({percentAllocated.toFixed(0)}%)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Remaining Available Pool</div>
                      <div className="text-lg sm:text-xl font-extrabold text-blue-800 tabular-nums">
                        ₨ {fund.remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Clean Notes Section */}
                  {fund.description && (
                    <div className="text-xs text-slate-600 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-start space-x-2">
                      <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">{fund.description}</span>
                    </div>
                  )}

                  {/* Allocations Breakdown Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleExpand(fund.id)}
                      className="text-xs font-bold text-slate-700 hover:text-blue-600 flex items-center space-x-1.5 cursor-pointer transition-colors"
                    >
                      <span>
                        Company Allocations ({fund.allocationsCount || 0} Cash In entries)
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="text-[11px] text-slate-400 font-medium">
                      Fund ID: <span className="font-mono text-slate-500">{fund.id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Allocations Details */}
                {isExpanded && (
                  <div className="bg-slate-50/90 border-t border-slate-200 p-5 space-y-3 animate-in fade-in duration-150">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Distribution Breakdown Across Companies:
                    </div>

                    {!fund.allocations || fund.allocations.length === 0 ? (
                      <div className="text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200 text-center">
                        No company allocations yet. This entire fund (₨ {fund.totalAmount.toLocaleString()}) is currently unspent and available in the pool.
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                        {fund.allocations.map((alloc) => (
                          <div
                            key={alloc.transactionId}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center justify-center border border-emerald-200">
                                {alloc.companyCode}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 text-xs">{alloc.companyName}</span>
                                <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                  <span>Account: <strong className="text-slate-600">{alloc.accountName} ({alloc.accountType})</strong></span>
                                  <span>•</span>
                                  <span>Date: {new Date(alloc.paymentDate).toLocaleDateString('en-GB')}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-extrabold text-emerald-600 text-sm tabular-nums">
                                ₨ {alloc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              {alloc.referenceNo && (
                                <div className="text-[10px] text-slate-400">Ref: {alloc.referenceNo}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Fund Modal */}
      <AddFundModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          loadFunds();
        }}
      />

      {/* Edit Fund Modal */}
      {editingFund && (
        <AddFundModal
          isOpen={!!editingFund}
          editFund={editingFund}
          onClose={() => setEditingFund(null)}
          onSuccess={() => {
            setEditingFund(null);
            loadFunds();
          }}
        />
      )}

      {/* Slip Viewer Modal */}
      <AttachmentViewerModal
        isOpen={viewerModalState.isOpen}
        onClose={() => setViewerModalState({ isOpen: false, title: '' })}
        title={viewerModalState.title}
        fileName={viewerModalState.fileName}
        fileUrl={viewerModalState.fileUrl}
      />

      {/* CashInModal Quick Distribute */}
      {isCashInModalOpen && (
        <CashInModal
          isOpen={isCashInModalOpen}
          onClose={() => {
            setIsCashInModalOpen(false);
            setDistributeFundId(null);
          }}
          onSuccess={() => {
            setIsCashInModalOpen(false);
            setDistributeFundId(null);
            loadFunds();
          }}
          companies={companies}
          initialFundId={distributeFundId || undefined}
        />
      )}
    </div>
  );
};
