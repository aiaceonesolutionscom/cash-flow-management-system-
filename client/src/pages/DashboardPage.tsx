import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building,
  CreditCard,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart2
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
  const { selectedCompanyId, dateRange, startDate, endDate, refreshTrigger, activeCompanyName } = useFilters();
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
        <div className="text-slate-400 text-sm flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Calculating live financial metrics...</span>
        </div>
      </div>
    );
  }

  const { cards, charts, recentTransactions } = data;
  const netFlowNum = parseFloat(cards.netCashFlow);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Financial Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial status for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>
      </div>

      {/* 8 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">
            {formatPKR(cards.totalAvailableBalance)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Combined sum of Cash, Bank & Wallet
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Flow</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              netFlowNum >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {netFlowNum >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`mt-3 text-2xl font-bold tabular-nums ${
            netFlowNum >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatPKR(cards.netCashFlow)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Total Cash In minus Total Cash Out
          </div>
        </div>

        {/* Total Cash In */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash In</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-600 tabular-nums">
            {formatPKR(cards.totalCashIn)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total received income across period</div>
        </div>

        {/* Total Cash Out (Expenses) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cash Out / Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-600 tabular-nums">
            {formatPKR(cards.totalCashOut)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total outgoing payments and expenses</div>
        </div>

        {/* Cash Account Balance */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Cash Account</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 tabular-nums">
            {formatPKR(cards.cashAccountBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical liquid cash balance</div>
        </div>

        {/* Bank Account Balance */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Bank Account</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 tabular-nums">
            {formatPKR(cards.bankAccountBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Commercial bank account funds</div>
        </div>

        {/* Wallet Account Balance */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Digital Wallet</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 tabular-nums">
            {formatPKR(cards.walletAccountBalance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Digital wallets / petty funds</div>
        </div>

        {/* Expense Total Summary */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Total Period Expenses</span>
            <TrendingDown className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 tabular-nums">
            {formatPKR(cards.totalExpenses)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Classified business expenditure</div>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash In vs Cash Out (Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <BarChart2 className="w-4 h-4 mr-1.5 text-blue-600" />
                Monthly Cash In vs Cash Out
              </h3>
              <p className="text-xs text-slate-400">Inflows and outflows over the past 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatPKR(val)}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="cashIn" name="Cash In (PKR)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cashOut" name="Cash Out (PKR)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown (Pie Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <PieIcon className="w-4 h-4 mr-1.5 text-blue-600" />
                Expense Categories
              </h3>
              <p className="text-xs text-slate-400">Distribution of company spending</p>
            </div>
          </div>
          <div className="h-64">
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
                    innerRadius={50}
                    outerRadius={80}
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

      {/* Secondary Analytics Row: Company Comparison & Cash Flow Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Comparison (When viewing All Companies) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Company-Wise Financial Performance</h3>
              <p className="text-xs text-slate-400">Cash In and Net Cash Flow by company entity</p>
            </div>
          </div>
          <div className="h-60">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Net Cash Flow Trend</h3>
              <p className="text-xs text-slate-400">Monthly trajectory of surplus or deficit</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyComparison}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
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
                <Area type="monotone" dataKey="net" name="Net Cash Flow" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Financial Transactions Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Financial Transactions</h3>
            <p className="text-xs text-slate-400">Latest recorded income and expense activities</p>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No recent financial transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Company</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Party / Vendor</th>
                  <th className="py-3 px-6">Account</th>
                  <th className="py-3 px-6 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-6 text-slate-600 whitespace-nowrap">
                      {format(new Date(tx.paymentDate), 'yyyy-MM-dd')}
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-800">
                      {tx.company.name}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        tx.type === 'CASH_IN'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.type === 'CASH_IN' ? '+ Cash In' : '- Cash Out'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-700">{tx.category.name}</td>
                    <td className="py-3 px-6 text-slate-900 font-medium">{tx.party}</td>
                    <td className="py-3 px-6 text-slate-600">{tx.account.name}</td>
                    <td className={`py-3 px-6 text-right font-bold tabular-nums ${
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
    </div>
  );
};
