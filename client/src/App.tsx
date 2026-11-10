import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FilterProvider, useFilters } from './context/FilterContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CashInPage } from './pages/CashInPage';
import { CashOutPage } from './pages/CashOutPage';
import { TransfersPage } from './pages/TransfersPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ReportsPage } from './pages/ReportsPage';

// Quick Action Modals
import { CashInModal } from './components/modals/CashInModal';
import { CashOutModal } from './components/modals/CashOutModal';
import { TransferModal } from './components/modals/TransferModal';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { companies, selectedCompanyId, triggerRefresh } = useFilters();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Quick Action Modal states
  const [isCashInOpen, setIsCashInOpen] = useState<boolean>(false);
  const [isCashOutOpen, setIsCashOutOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Initializing secure session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'cash-in':
        return <CashInPage onOpenCreate={() => setIsCashInOpen(true)} />;
      case 'cash-out':
        return <CashOutPage onOpenCreate={() => setIsCashOutOpen(true)} />;
      case 'transfers':
        return <TransfersPage onOpenCreate={() => setIsTransferOpen(true)} />;
      case 'transactions':
        return <TransactionsPage />;
      case 'companies':
        return <CompaniesPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'reports':
        return <ReportsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {/* Sidebar Navigation (with Desktop and Mobile Drawer modes) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onOpenCashIn={() => setIsCashInOpen(true)}
          onOpenCashOut={() => setIsCashOutOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Quick Action Modals */}
      <CashInModal
        isOpen={isCashInOpen}
        onClose={() => setIsCashInOpen(false)}
        onSuccess={triggerRefresh}
        companies={companies}
        initialCompanyId={selectedCompanyId}
      />

      <CashOutModal
        isOpen={isCashOutOpen}
        onClose={() => setIsCashOutOpen(false)}
        onSuccess={triggerRefresh}
        companies={companies}
        initialCompanyId={selectedCompanyId}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={triggerRefresh}
        companies={companies}
        initialCompanyId={selectedCompanyId}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FilterProvider>
        <MainLayout />
      </FilterProvider>
    </AuthProvider>
  );
}
