import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart2,
  Wallet,
  Building,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { DashboardData } from '../types';
import { format } from 'date-fns';

const PIE_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#4b5563'];

export const DashboardPage: React.FC = () => {
  const { selectedCompanyId, dateRange, startDate, endDate, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const params: any = {
          companyId: selectedCompanyId,
          dateRange
        };
        if (dateRange === 'custom' && startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }

        const res = await api.get('/dashboard/summary', { params });
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedCompanyId, dateRange, startDate, endDate, refreshTrigger]);

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 text-sm flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading live financial overview...</span>
        </div>
      </div>
    );
  }

  const { cards, charts, recentTransactions } = data;
  const netFlowNum = parseFloat(cards.netCashFlow);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title & Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Financial Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time cash flow & liquidity for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <button
          onClick={triggerRefresh}
          className="self-start sm:self-auto p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center space-x-1.5 text-xs font-medium"
          title="Refresh Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Primary High-Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Available Balance</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums truncate">
              {formatPKR(cards.totalAvailableBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">Total liquid capital in PKR</div>
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Net Cash Flow</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netFlowNum >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {netFlowNum >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${
              netFlowNum >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {formatPKR(cards.netCashFlow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">
              {netFlowNum >= 0 ? 'Net period surplus' : 'Net period deficit'}
            </div>
          </div>
        </div>

        {/* Total Cash In (Distinctive Royal Indigo Color) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Cash In</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 tabular-nums truncate">
              +{formatPKR(cards.totalCashIn)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">Total incoming payments</div>
          </div>
        </div>

        {/* Total Cash Out / Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Cash Out</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-rose-600 tabular-nums truncate">
              -{formatPKR(cards.totalCashOut)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-normal">Total outgoing expenditures</div>
          </div>
        </div>
      </div>

      {/* Account Liquidity Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Liquidity Breakdown by Account Type
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Cash in Hand</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
              {formatPKR(cards.cashAccountBalance)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Bank Accounts</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
              {formatPKR(cards.bankAccountBalance)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Digital Wallets</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
              {formatPKR(cards.walletAccountBalance)}
            </span>
          </div>
        </div>

        {/* Funds & Requirements Quick Strip */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Company Funds Injected */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Company Funds Injected</div>
              <div className="text-xs text-slate-500">Recorded capital injections</div>
            </div>
            <div className="text-sm sm:text-base font-bold text-blue-700 tabular-nums">
              {formatPKR(cards.totalFundsInjected || 0)}
            </div>
          </div>

          {/* Active Demands / Requirements */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Active Company Requirements</div>
              <div className="text-xs text-slate-500">{cards.activeRequirementsCount || 0} pending demands</div>
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-700 tabular-nums">
              {formatPKR(cards.totalRequirementsPending || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Financial Transactions Section (Top 5 Placed in Center) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest recorded income & expense activities</p>
          </div>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
            Top 5 Recent
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No recent financial transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
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
                {recentTransactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {format(new Date(tx.paymentDate), 'yyyy-MM-dd')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {tx.company.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        tx.type === 'CASH_IN'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{tx.category.name}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium truncate max-w-[150px]">{tx.party}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{tx.account.name}</td>
                    <td className={`py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
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

      {/* Primary Analytics Charts Row (Moved Below Recent Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash In vs Cash Out (Bar Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <BarChart2 className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
                Monthly Cash In vs Cash Out
              </h3>
              <p className="text-xs text-slate-400">Inflows and outflows over past months</p>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatPKR(val)}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="cashIn" name="Cash In" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown (Pie Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <PieIcon className="w-4 h-4 mr-1.5 text-blue-600 shrink-0" />
                Expense Breakdown
              </h3>
              <p className="text-xs text-slate-400">Expenditure by category</p>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            {charts.categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expense data recorded in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {charts.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatPKR(val)}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Company-Wise Comparison & Net Flow Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Company-Wise Comparison</h3>
            <p className="text-xs text-slate-400">Cash In and Net Cash Flow by company entity</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.companyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="code" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatPKR(val)}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="cashIn" name="Cash In" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net Flow" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Net Cash Flow Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Net Cash Flow Trajectory</h3>
            <p className="text-xs text-slate-400">Surplus or deficit trend</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyComparison}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatPKR(val)}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="net" name="Net Flow" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
