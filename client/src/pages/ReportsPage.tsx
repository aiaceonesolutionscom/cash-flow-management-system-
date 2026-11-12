import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Table as TableIcon,
  Loader2,
  Calendar,
  Search,
  Filter,
  X
} from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Category } from '../types';
import { format } from 'date-fns';

export const ReportsPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, activeCompanyName } = useFilters();
  const [reportType, setReportType] = useState<string>('cash_flow');
  const [reportPeriod, setReportPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const reportOptions = [
    { id: 'cash_flow', label: '1. Cash Flow Statement' },
    { id: 'company_requirements', label: '2. Company Requirements & Demands' },
    { id: 'company_funds', label: '3. Company Funds Statement' },
    { id: 'company_wise', label: '4. Company-Wise Analysis' },
    { id: 'category_wise', label: '5. Category Breakdown' },
    { id: 'account_wise', label: '6. Account Balances' },
    { id: 'monthly', label: '7. Monthly Trend Report' },
  ];

  // Fetch dropdown categories with deduplication
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories', { params: { companyId: selectedCompanyId } });
        if (res.data.success) {
          const raw: Category[] = res.data.categories || [];
          if (!selectedCompanyId || selectedCompanyId === 'all') {
            const seen = new Set<string>();
            const unique = raw.filter((c) => {
              const k = c.name.trim().toLowerCase();
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
            });
            setCategories(unique);
          } else {
            setCategories(raw);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCats();
  }, [selectedCompanyId]);

  // Adjust dates based on period preset
  useEffect(() => {
    const now = new Date();
    if (reportPeriod === 'today') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (reportPeriod === 'this_month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${lastDay}`);
    } else if (reportPeriod === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevMonth.getFullYear();
      const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, prevMonth.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${lastDay}`);
    } else if (reportPeriod === 'this_year') {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (reportPeriod === 'all_time') {
      setStartDate('');
      setEndDate('');
    }
  }, [reportPeriod]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        reportType,
        companyId: selectedCompanyId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accountType: accountType !== 'all' ? accountType : undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        type: txTypeFilter !== 'all' ? txTypeFilter : undefined,
        search: searchTerm.trim() || undefined
      };
      const res = await api.get('/reports', { params });
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load financial report', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedCompanyId, startDate, endDate, accountType, categoryFilter, txTypeFilter, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const resetAllFilters = () => {
    setReportPeriod('this_month');
    setAccountType('all');
    setCategoryFilter('all');
    setTxTypeFilter('all');
    setSearchTerm('');
  };

  const handleExport = (formatType: 'excel' | 'pdf' | 'csv') => {
    setIsExporting(formatType);
    const params = new URLSearchParams();
    params.append('reportType', reportType);
    if (selectedCompanyId && selectedCompanyId !== 'all') params.append('companyId', selectedCompanyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (accountType !== 'all') params.append('accountType', accountType);
    if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);
    if (txTypeFilter !== 'all') params.append('type', txTypeFilter);
    if (searchTerm.trim()) params.append('search', searchTerm.trim());

    const token = localStorage.getItem('cashflow_token');
    if (token) {
      params.append('token', token);
    }

    const exportUrl = `/api/reports/export/${formatType}?${params.toString()}`;
    window.open(exportUrl, '_blank');
    setTimeout(() => setIsExporting(null), 1500);
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
              <BarChart3 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reports & Statements</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit-ready financial statements & complete exports for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Download Full Excel Workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Download Formal PDF Statement (.pdf)"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span>PDF Statement</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Download Raw CSV Ledger (.csv)"
          >
            <TableIcon className="w-4 h-4 mr-1.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2 sm:p-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                reportType === opt.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comprehensive Filter Bar (Both Mobile and Desktop Friendly) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Report Filters</span>
          </div>

          {(reportPeriod !== 'this_month' || accountType !== 'all' || categoryFilter !== 'all' || txTypeFilter !== 'all' || searchTerm) && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period Preset */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Period Preset</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
            >
              <option value="all">All Payment Types</option>
              <option value="CASH">💵 Cash</option>
              <option value="BANK">🏦 Bank</option>
              <option value="WALLET">📱 Wallet</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transaction Type</label>
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
            >
              <option value="all">All Flow Types</option>
              <option value="CASH_IN">Cash In (+ Inflow)</option>
              <option value="CASH_OUT">Cash Out (- Outflow)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers & Search Bar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
          {/* Custom Date Range Pickers (Active when period is custom) */}
          <div className="lg:col-span-2 flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5">
            <Calendar className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
            <div className="flex-1 flex items-center space-x-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setReportPeriod('custom');
                }}
                className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                placeholder="Start Date"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setReportPeriod('custom');
                }}
                className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Search Party / Vendor / Ref */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor, party, note..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* KPI Statement Strip */}
      {reportData && reportType === 'company_requirements' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total Required</span>
            <div className="text-xl font-bold text-blue-600 tabular-nums mt-1">
              {formatPKR(reportData.grandTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">All companies requirement</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Demands</span>
            <div className="text-xl font-bold text-rose-600 tabular-nums mt-1">
              {formatPKR(reportData.pendingTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting fund disbursement</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fulfilled Demands</span>
            <div className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
              {formatPKR(reportData.fulfilledTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Funds successfully provided</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requirements</span>
            <div className="text-xl font-bold text-slate-900 tabular-nums mt-1">
              {reportData.totalCount || 0} Demands
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Itemized budget records</div>
          </div>
        </div>
      ) : reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {reportType === 'company_funds' ? 'Funds Injected' : 'Statement Cash In'}
            </span>
            <div className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
              +{formatPKR(reportData.summary?.totalCashIn)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {reportType === 'company_funds' ? 'Total capital injected' : 'Total incoming payments'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statement Cash Out</span>
            <div className="text-xl font-bold text-rose-600 tabular-nums mt-1">
              -{formatPKR(reportData.summary?.totalCashOut)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Total operational expenses</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</span>
            <div className={`text-xl font-bold tabular-nums mt-1 ${
              parseFloat(reportData.summary?.netCashFlow || '0') >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatPKR(reportData.summary?.netCashFlow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{reportData.summary?.transactionCount || 0} Filtered Transactions</div>
          </div>
        </div>
      )}

      {/* Main Report Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Compiling report records...</span>
          </div>
        ) : !reportData ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No report data available.
          </div>
        ) : (
          <div>
            {/* View Renderers based on Report Type */}
            {reportType === 'company_requirements' ? (
              <div className="p-4 space-y-4">
                {/* Company Breakdown Subtotals */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {reportData.companySummaries?.map((cs: any) => (
                    <div key={cs.companyName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="truncate">{cs.companyName}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
                          {cs.count} Notes
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Pending:</span>
                        <span className="font-bold text-rose-600">{formatPKR(cs.pending)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Total:</span>
                        <span className="font-bold text-slate-800">{formatPKR(cs.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table of Notes */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Requirement Title</th>
                        <th className="py-3 px-4">Line Items Breakdown</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.notes?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                            No company requirements recorded.
                          </td>
                        </tr>
                      ) : (
                        reportData.notes?.map((n: any) => (
                          <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {format(new Date(n.createdAt), 'dd MMM yyyy')}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                              {n.company.name}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {n.title}
                              {n.dueDate && (
                                <div className="text-[10px] text-slate-400">
                                  Needed by: {format(new Date(n.dueDate), 'dd MMM yyyy')}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {n.items?.map((it: any, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                    <span className="font-semibold">{it.itemName}:</span>
                                    <span className="ml-1 font-bold text-slate-900">{formatPKR(it.amount)}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                n.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                                n.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {n.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                n.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700' :
                                n.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' :
                                'bg-rose-50 text-rose-700'
                              }`}>
                                {n.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-blue-700 tabular-nums whitespace-nowrap">
                              {formatPKR(n.totalAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : reportType === 'company_wise' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4 text-right">Cash In (PKR)</th>
                      <th className="py-3 px-4 text-right">Cash Out (PKR)</th>
                      <th className="py-3 px-4 text-right">Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.companies?.map((c: any) => (
                      <tr key={c.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600 tabular-nums">+{formatPKR(c.cashIn)}</td>
                        <td className="py-3 px-4 text-right font-medium text-rose-600 tabular-nums">-{formatPKR(c.cashOut)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatPKR(c.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reportType === 'category_wise' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Category Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.categories?.map((cat: any) => (
                      <tr key={cat.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{cat.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {cat.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">
                          {formatPKR(cat.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reportType === 'account_wise' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Opening Balance</th>
                      <th className="py-3 px-4 text-right">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.accounts?.map((acc: any) => (
                      <tr key={`${acc.company}-${acc.name}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-800">{acc.company}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{acc.name}</td>
                        <td className="py-3 px-4 text-slate-500 uppercase font-semibold text-[11px]">{acc.type}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 tabular-nums">{formatPKR(acc.openingBalance)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatPKR(acc.currentBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : reportType === 'monthly' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Cash In</th>
                      <th className="py-3 px-4 text-right">Cash Out</th>
                      <th className="py-3 px-4 text-right">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.monthly?.map((m: any) => (
                      <tr key={m.month} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{m.month}</td>
                        <td className="py-3 px-4 text-right text-emerald-600 font-medium tabular-nums">+{formatPKR(m.cashIn)}</td>
                        <td className="py-3 px-4 text-right text-rose-600 font-medium tabular-nums">-{formatPKR(m.cashOut)}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">{formatPKR(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Default: Cash Flow / Transaction Statement
              <div>
                {/* Mobile Cards for Statement (Zero horizontal scroll needed!) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {reportData.transactions?.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No matching transactions found.</div>
                  ) : (
                    reportData.transactions?.map((tx: any) => (
                      <div key={tx.id} className="p-4 space-y-2 hover:bg-slate-50/70 transition-colors">
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
                          <div className="text-xs font-bold text-slate-900">{tx.party}</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.type === 'CASH_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-500">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {tx.category.name}
                          </span>
                          <span>•</span>
                          <span>{tx.account.name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Data Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Party / Vendor</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No transactions match the selected report filters.
                          </td>
                        </tr>
                      ) : (
                        reportData.transactions?.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{format(new Date(tx.paymentDate), 'yyyy-MM-dd')}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{tx.company.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                tx.type === 'CASH_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{tx.category.name}</td>
                            <td className="py-3 px-4 text-slate-900 font-semibold">{tx.party}</td>
                            <td className="py-3 px-4 text-slate-600">{tx.account.name}</td>
                            <td className={`py-3 px-4 text-right font-bold tabular-nums ${
                              tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
