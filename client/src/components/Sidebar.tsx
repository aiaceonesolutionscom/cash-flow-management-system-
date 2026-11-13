import React from 'react';
import {
  LayoutDashboard,
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  Building2,
  Tag,
  BarChart3,
  Menu,
  Settings,
  StickyNote,
  ArrowRightLeft,
  ShieldCheck,
  Coins
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'funds', label: 'Funds Pool', icon: Coins },
    { id: 'cash-in', label: 'Cash In', icon: ArrowDownRight },
    { id: 'cash-out', label: 'Cash Out', icon: ArrowUpRight },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'notes', label: 'Company Notes', icon: StickyNote },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
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
          /* COLLAPSED STATE: Logo with auto-hover-to-hamburger (yahan to tumne sahi laga diya) */
          <div className="h-16 flex items-center justify-center px-2 border-b border-slate-200 bg-white shrink-0">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="relative group w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden transition-all duration-200 hover:border-blue-400 hover:shadow-md cursor-pointer shrink-0"
              title="Click to Expand Sidebar"
            >
              {/* App Logo - Hides when mouse hovers */}
              <img
                src="/logos/app-logo.png"
                alt="App Logo"
                className="w-full h-full object-contain p-1 transition-opacity duration-200 group-hover:opacity-0"
              />

              {/* Hamburger Icon - Shows when mouse hovers */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-blue-50/95 text-blue-600 transition-all duration-200">
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </div>
            </button>
          </div>
        ) : (
          /* EXPANDED STATE (andar): Normal logo on left, and Hamburger button on right to close/collapse */
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white shrink-0">
            {/* Left: Normal App Logo & Brand Title (stays visible, doesn't hide) */}
            <div className="flex items-center space-x-2.5 min-w-0 truncate">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 shrink-0">
                <img
                  src="/logos/app-logo.png"
                  alt="App Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="truncate">
                <h1 className="font-bold text-slate-900 text-sm leading-tight tracking-tight">CASHFLOW</h1>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Financial Suite</p>
              </div>
            </div>

            {/* Right: Hamburger button to collapse/close the sidebar (yeh idhar laga dena andar) */}
            <button
              type="button"
              onClick={isMobile ? onCloseMobile : onToggleCollapse}
              className="w-9 h-9 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0 ml-2"
              title={isMobile ? "Close Menu" : "Collapse Sidebar"}
            >
              <Menu className="w-4.5 h-4.5 stroke-[2.2]" />
            </button>
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
