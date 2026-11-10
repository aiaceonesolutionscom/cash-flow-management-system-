import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Table as TableIcon,
  Loader2,
  Calendar
} from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { format } from 'date-fns';

export const ReportsPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, activeCompanyName } = useFilters();
  const [reportType, setReportType] = useState<string>('cash_flow');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const reportOptions = [
    { id: 'cash_flow', label: '1. Cash Flow Statement' },
    { id: 'income', label: '2. Income / Inflows Report' },
    { id: 'expense', label: '3. Operating Expense Report' },
    { id: 'company_wise', label: '4. Company-Wise Comparison' },
    { id: 'category_wise', label: '5. Category Breakdown' },
    { id: 'monthly', label: '6. Monthly Financial Report' },
    { id: 'yearly', label: '7. Yearly Trend Report' },
    { id: 'transactions', label: '8. Detailed Transaction Ledger' },
  ];

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        reportType,
        companyId: selectedCompanyId,
        startDate: startDate || undefined,
        endDate: endDate || undefined
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
  }, [reportType, selectedCompanyId, startDate, endDate, refreshTrigger]);

  const handleExport = (formatType: 'excel' | 'pdf' | 'csv') => {
    setIsExporting(formatType);
    const params = new URLSearchParams();
    if (selectedCompanyId && selectedCompanyId !== 'all') params.append('companyId', selectedCompanyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const exportUrl = `/api/reports/export/${formatType}?${params.toString()}`;
    window.open(exportUrl, '_blank');
    setTimeout(() => setIsExporting(null), 1500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reports & Statements</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit-ready financial statements, performance analytics & formal exports for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Export Excel (.xlsx)
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Export PDF (.pdf)
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="inline-flex items-center px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <TableIcon className="w-4 h-4 mr-1.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                reportType === opt.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Inputs Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Report Period:</span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="text-xs text-rose-600 hover:underline"
          >
            Clear Date Range
          </button>
        )}
      </div>

      {/* Report Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Statement Cash In</span>
            <div className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
              +{formatPKR(reportData.summary?.totalCashIn)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Statement Cash Out</span>
            <div className="text-xl font-bold text-rose-600 tabular-nums mt-1">
              -{formatPKR(reportData.summary?.totalCashOut)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Cash Flow</span>
            <div className={`text-xl font-bold tabular-nums mt-1 ${
              parseFloat(reportData.summary?.netCashFlow || '0') >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatPKR(reportData.summary?.netCashFlow)}
            </div>
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
          <div className="p-6 space-y-6">
            {/* View Renderers based on Report Type */}
            {reportType === 'company_wise' ? (
              <table className="w-full text-left text-xs">
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
                    <tr key={c.name} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-600 tabular-nums">+{formatPKR(c.cashIn)}</td>
                      <td className="py-3 px-4 text-right font-medium text-rose-600 tabular-nums">-{formatPKR(c.cashOut)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatPKR(c.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'category_wise' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Total Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.categories?.map((cat: any) => (
                    <tr key={cat.name} className="hover:bg-slate-50">
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
            ) : reportType === 'account_wise' ? (
              <table className="w-full text-left text-xs">
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
                    <tr key={`${acc.company}-${acc.name}`} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{acc.company}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{acc.name}</td>
                      <td className="py-3 px-4 text-slate-500 uppercase">{acc.type}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600 tabular-nums">{formatPKR(acc.openingBalance)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatPKR(acc.currentBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : reportType === 'monthly' ? (
              <table className="w-full text-left text-xs">
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
                    <tr key={m.month} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{m.month}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium tabular-nums">+{formatPKR(m.cashIn)}</td>
                      <td className="py-3 px-4 text-right text-rose-600 font-medium tabular-nums">-{formatPKR(m.cashOut)}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">{formatPKR(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Default: Cash Flow / Transaction List
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Party / Vendor</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.transactions?.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{format(new Date(tx.paymentDate), 'yyyy-MM-dd')}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{tx.company.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.type === 'CASH_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{tx.category.name}</td>
                        <td className="py-3 px-4 text-slate-900 font-medium">{tx.party}</td>
                        <td className="py-3 px-4 text-slate-600">{tx.account.name}</td>
                        <td className={`py-3 px-4 text-right font-bold tabular-nums ${
                          tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
