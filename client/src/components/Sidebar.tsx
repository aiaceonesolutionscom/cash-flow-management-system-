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
  Menu,
  ChevronRight,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile
}) => {
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

  const renderContent = (isMobile: boolean = false) => {
    const collapsed = !isMobile && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white select-none">
        {/* Brand Header */}
        {collapsed ? (
          /* COLLAPSED STATE (Screenshot 2 & 3) */
          <div className="py-3 px-2 border-b border-slate-200 bg-white flex flex-col items-center gap-2.5 shrink-0">
            {/* Top C Logo (Screenshot 3) */}
            <div
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0 cursor-pointer hover:border-blue-300 transition-all"
              title="Click to Expand Sidebar"
            >
              <img
                src="/logos/app-logo.png"
                alt="App Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Teer (Arrow >) Expand Button (Screenshot 2) */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/25 flex items-center justify-center transition-all cursor-pointer group shrink-0"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-5 h-5 text-white stroke-[2.8] transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ) : (
          /* EXPANDED STATE (Screenshot 1) */
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              {/* Hamburger Button (Screenshot 1) */}
              <button
                type="button"
                onClick={onToggleCollapse}
                className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Collapse Sidebar"
              >
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* Logo + Brand Name */}
              <div className="flex items-center space-x-2.5 truncate">
                <img
                  src="/logos/app-logo.png"
                  alt="App Logo"
                  className="w-8 h-8 rounded-lg object-contain border border-slate-100 shrink-0"
                />
                <div className="truncate">
                  <h1 className="font-bold text-slate-900 text-sm leading-tight tracking-tight">CASHFLOW</h1>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Financial Suite</p>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {isMobile && onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <div className={`flex-1 py-4 overflow-y-auto space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Management Modules
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed
                    ? 'justify-center p-3'
                    : 'space-x-3 px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 shrink-0">
            <div className="text-xs text-slate-600">
              <div className="font-semibold text-slate-800">PKR (₨) Currency</div>
              <div className="text-[11px] text-slate-400 mt-0.5">3 Companies Integrated</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar with smooth width transition (w-64 when open, w-20 when collapsed) */}
      <aside
        className={`hidden lg:block border-r border-slate-200 h-screen sticky top-0 shrink-0 bg-white transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
