import React from 'react';
import {
  LayoutDashboard,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  ReceiptText,
  Building2,
  Tag,
  BarChart3,
  Building,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
  // Simplified menu: Accounts & Audit trail removed per user instruction
  const menuItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'cash-in', label: 'Cash In (Income)', icon: ArrowDownRight },
    { id: 'cash-out', label: 'Cash Out (Expenses)', icon: ArrowUpRight },
    { id: 'transfers', label: 'Money Transfers', icon: ArrowRightLeft },
    { id: 'transactions', label: 'Transaction Ledger', icon: ReceiptText },
    { id: 'companies', label: 'Company Overview', icon: Building2 },
    { id: 'categories', label: 'Expense Categories', icon: Tag },
    { id: 'reports', label: 'Financial Reports', icon: BarChart3 },
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">CASHFLOW</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Financial Suite</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Management Modules
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 shrink-0">
        <div className="text-xs text-slate-600">
          <div className="font-semibold text-slate-800">PKR (₨) Currency</div>
          <div className="text-[11px] text-slate-400 mt-0.5">3 Companies Integrated</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Always visible on large screens >= 1024px) */}
      <aside className="hidden lg:block w-64 border-r border-slate-200 h-screen sticky top-0 shrink-0 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Visible on small screens when isOpenMobile is true) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
