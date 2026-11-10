import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  Minus,
  LogOut,
  UserCheck,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { ConfirmDialog } from './common/ConfirmDialog';

interface HeaderProps {
  onOpenCashIn: () => void;
  onOpenCashOut: () => void;
  onOpenTransfer?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCashIn,
  onOpenCashOut,
  onToggleMobileMenu
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const handleDateRangeChange = (val: string) => {
    setDateRange(val);
    setShowCustomDate(val === 'custom');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left Area: Mobile Menu Button & Global Filters */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Hamburger Toggle for Mobile */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Company Filter Dropdown */}
        <div className="relative flex items-center shrink-0">
          <div className="absolute left-2.5 pointer-events-none text-slate-400 hidden xs:block">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="pl-2 xs:pl-8 pr-7 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer max-w-[125px] sm:max-w-[210px] truncate"
          >
            <option value="all">🏢 All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-slate-400" />
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative items-center hidden sm:flex shrink-0">
          <div className="absolute left-2.5 pointer-events-none text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none text-slate-400" />
        </div>

        {/* Custom Date Pickers */}
        {showCustomDate && (
          <div className="hidden md:flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
            />
            <span className="text-[10px] text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[11px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
            />
          </div>
        )}
      </div>

      {/* Right Area: Action Buttons & Admin Profile */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Quick Action: Cash In */}
        <button
          onClick={onOpenCashIn}
          className="inline-flex items-center px-2 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          title="Record Incoming Money"
        >
          <Plus className="w-3.5 h-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Cash </span>In
        </button>

        {/* Quick Action: Cash Out */}
        <button
          onClick={onOpenCashOut}
          className="inline-flex items-center px-2 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          title="Record Expense / Outgoing"
        >
          <Minus className="w-3.5 h-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Cash </span>Out
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1 hidden xs:block" />

        {/* Admin Badge */}
        <div className="flex items-center space-x-1.5 pl-1">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-none">{admin?.name || 'Admin'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[100px]">{admin?.email}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="Logout"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out Confirmation"
        message="Are you sure you want to log out of your Admin session? You will need to enter your password again to access the system."
        confirmText="Yes, Log Out"
        cancelText="Stay Signed In"
        variant="warning"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
};
