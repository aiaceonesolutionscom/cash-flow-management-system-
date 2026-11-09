import React from 'react';
import {
  LayoutDashboard,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  ReceiptText,
  Wallet,
  Building2,
  Tag,
  BarChart3,
  ShieldCheck,
  Building
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'cash-in', label: 'Cash In (Income)', icon: ArrowDownRight },
    { id: 'cash-out', label: 'Cash Out (Expenses)', icon: ArrowUpRight },
    { id: 'transfers', label: 'Money Transfers', icon: ArrowRightLeft },
    { id: 'transactions', label: 'Transaction Ledger', icon: ReceiptText },
    { id: 'accounts', label: 'Accounts & Balances', icon: Wallet },
    { id: 'companies', label: 'Company Overview', icon: Building2 },
    { id: 'categories', label: 'Expense Categories', icon: Tag },
    { id: 'reports', label: 'Financial Reports', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">CASHFLOW</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Tri-Company Suite</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Financial Management
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="text-xs text-slate-500">
          <div className="font-semibold text-slate-700">Currency: PKR (₨)</div>
          <div className="text-[11px] text-slate-400 mt-0.5">3 Companies Integrated</div>
        </div>
      </div>
    </aside>
  );
};
