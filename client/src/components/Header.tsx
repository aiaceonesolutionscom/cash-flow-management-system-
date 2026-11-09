import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  LogOut,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';

interface HeaderProps {
  onOpenCashIn: () => void;
  onOpenCashOut: () => void;
  onOpenTransfer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCashIn,
  onOpenCashOut,
  onOpenTransfer
}) => {
  const { admin, logout } = useAuth();
  const {
    selectedCompanyId,
    setSelectedCompanyId,
    dateRange,
    setDateRange,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    companies
  } = useFilters();

  const [showCustomDate, setShowCustomDate] = useState<boolean>(dateRange === 'custom');

  const handleDateRangeChange = (val: string) => {
    setDateRange(val);
    setShowCustomDate(val === 'custom');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Global Company & Date Filters */}
      <div className="flex items-center space-x-3">
        {/* Company Filter */}
        <div className="relative flex items-center">
          <div className="absolute left-3 pointer-events-none text-slate-400">
            <Building2 className="w-4 h-4" />
          </div>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="all">🏢 All Companies (Combined)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-slate-400" />
        </div>

        {/* Date Filter */}
        <div className="relative flex items-center">
          <div className="absolute left-3 pointer-events-none text-slate-400">
            <Calendar className="w-4 h-4" />
          </div>
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="pl-9 pr-8 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-slate-400" />
        </div>

        {/* Custom Date Inputs if selected */}
        {showCustomDate && (
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            />
          </div>
        )}
      </div>

      {/* Right: Quick Action Buttons & Admin Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Actions */}
        <button
          onClick={onOpenCashIn}
          className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Cash In
        </button>

        <button
          onClick={onOpenCashOut}
          className="inline-flex items-center px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <MinusCircle className="w-3.5 h-3.5 mr-1.5" />
          Cash Out
        </button>

        <button
          onClick={onOpenTransfer}
          className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
          Transfer
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Admin Profile & Logout */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 pl-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-none">{admin?.name || 'Administrator'}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{admin?.email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
