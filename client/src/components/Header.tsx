import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  Minus,
  ArrowRightLeft,
  LogOut,
  UserCheck,
  ChevronDown,
  Menu,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import { ConfirmDialog } from './common/ConfirmDialog';

interface HeaderProps {
  onOpenCashIn: () => void;
  onOpenCashOut: () => void;
  onOpenTransfer?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCashIn,
  onOpenCashOut,
  onOpenTransfer,
  onOpenSettings,
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Primary Top Bar */}
      <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2">
        {/* Left Area: Mobile Menu Toggle & Brand / Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {/* Hamburger Toggle for Mobile */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700 active:scale-95 transition-all shrink-0 cursor-pointer"
              aria-label="Open navigation menu"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}

          {/* Desktop Filter Dropdowns (Inline on Desktop >= md) */}
          <div className="hidden md:flex items-center space-x-2.5">
            {/* Company Filter Dropdown */}
            <div className="relative flex items-center shrink-0">
              <div className="absolute left-2.5 pointer-events-none text-slate-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer max-w-[210px] truncate"
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
            <div className="relative flex items-center shrink-0">
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
          </div>
        </div>

        {/* Right Area: Action Buttons & Admin Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Quick Action: Cash In */}
          <button
            onClick={onOpenCashIn}
            className="inline-flex items-center px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Record Incoming Money (Cash In)"
          >
            <Plus className="w-3.5 h-3.5 sm:mr-1" />
            <span><span className="hidden sm:inline">Cash </span>In</span>
          </button>

          {/* Quick Action: Cash Out */}
          <button
            onClick={onOpenCashOut}
            className="inline-flex items-center px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Record Expense / Outflow (Cash Out)"
          >
            <Minus className="w-3.5 h-3.5 sm:mr-1" />
            <span><span className="hidden sm:inline">Cash </span>Out</span>
          </button>

          {/* Quick Action: Transfer Funds Between Accounts */}
          {onOpenTransfer && (
            <button
              onClick={onOpenTransfer}
              className="inline-flex items-center px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95"
              title="Transfer Funds Between Accounts (e.g. Bank to Cash)"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Transfer</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1" />

          {/* Admin Badge & Profile Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 pl-1 text-left hover:opacity-85 transition-opacity cursor-pointer group"
            title="Click to view Profile & Security Settings"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 group-hover:bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">{admin?.name || 'Admin'}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[100px]">{admin?.email}</div>
            </div>
          </button>

          {/* Settings Gear Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Admin Profile & Password Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Universal Custom Date Strip (Active when Custom Range is selected - never overlaps buttons!) */}
      {showCustomDate && (
        <div className="border-t border-slate-200/80 bg-slate-50/95 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center space-x-2 text-xs text-slate-700 font-semibold">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Custom Date Range:</span>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 text-slate-800 focus:ring-0 p-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">→</span>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 text-slate-800 focus:ring-0 p-0 cursor-pointer"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
                title="Clear Custom Dates"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sub-Header Filter Bar (Always visible on mobile < md screens so nothing is hidden or overlapped!) */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50/90 px-3 py-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Company Filter Dropdown */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer truncate"
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
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer truncate"
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
        </div>
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
