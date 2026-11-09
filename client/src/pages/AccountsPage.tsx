import React, { useEffect, useState } from 'react';
import { Wallet, Building, CreditCard, Edit3, History, RefreshCw, Loader2, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Account, AccountType } from '../types';
import { OpeningBalanceModal } from '../components/modals/OpeningBalanceModal';
import { format } from 'date-fns';

export const AccountsPage: React.FC = () => {
  const { selectedCompanyId, refreshTrigger, triggerRefresh, activeCompanyName } = useFilters();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);

  // History Drawer State
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/accounts', {
        params: { companyId: selectedCompanyId }
      });
      if (res.data.success) {
        setAccounts(res.data.accounts);
      }
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedCompanyId, refreshTrigger]);

  const handleEditOpening = (acc: Account) => {
    setEditingAccount(acc);
    setIsOpeningModalOpen(true);
  };

  const handleViewHistory = async (acc: Account) => {
    try {
      setHistoryAccount(acc);
      setIsHistoryLoading(true);
      const res = await api.get(`/accounts/${acc.id}/history`);
      if (res.data.success) {
        setHistoryData(res.data.history);
      }
    } catch (err) {
      console.error('Failed to load account history', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'CASH':
        return <Wallet className="w-5 h-5 text-amber-600" />;
      case 'BANK':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'WALLET':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Accounts & Balances</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage Cash, Bank, and Digital Wallet balances and opening capital for <span className="font-semibold text-slate-700">{activeCompanyName}</span>
          </p>
        </div>

        <button
          onClick={fetchAccounts}
          className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs self-start sm:self-auto flex items-center space-x-1.5"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading financial accounts...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No accounts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      {getAccountIcon(acc.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{acc.name}</h3>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                        {acc.company?.name || 'Company'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                    {acc.type}
                  </span>
                </div>

                {/* Balances Section */}
                <div className="mt-5 space-y-3">
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Current Balance</div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums">
                      {formatPKR(acc.currentBalance)}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">Opening Balance</div>
                      <div className="text-xs font-semibold text-slate-700 tabular-nums">
                        {formatPKR(acc.openingBalance)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditOpening(acc)}
                      className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded font-medium"
                      title="Adjust initial opening balance"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Set Opening
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleViewHistory(acc)}
                  className="w-full flex items-center justify-center py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <History className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  View Account Ledger History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account History Modal / Drawer */}
      {historyAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Account Activity Ledger</h3>
                <p className="text-xs text-slate-500">
                  {historyAccount.company?.name} — {historyAccount.name} ({historyAccount.type})
                </p>
              </div>
              <button
                onClick={() => setHistoryAccount(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isHistoryLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading account ledger...</span>
                </div>
              ) : !historyData || (historyData.transactions.length === 0 && historyData.transfersFrom.length === 0 && historyData.transfersTo.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No transaction or transfer history found for this account.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Direct Transactions */}
                  {historyData.transactions.map((tx: any) => (
                    <div key={tx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          tx.type === 'CASH_IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {tx.type === 'CASH_IN' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{tx.party}</div>
                          <div className="text-[10px] text-slate-400">{format(new Date(tx.paymentDate), 'yyyy-MM-dd')} • {tx.category?.name}</div>
                        </div>
                      </div>
                      <div className={`font-bold tabular-nums text-sm ${
                        tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'CASH_IN' ? '+' : '-'}{formatPKR(tx.amount)}
                      </div>
                    </div>
                  ))}

                  {/* Outgoing Transfers */}
                  {historyData.transfersFrom.map((tr: any) => (
                    <div key={`from-${tr.id}`} className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <ArrowRightLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">Transfer Out to {tr.toAccount?.name}</div>
                          <div className="text-[10px] text-slate-400">{format(new Date(tr.transferDate), 'yyyy-MM-dd')} • Internal Transfer</div>
                        </div>
                      </div>
                      <div className="font-bold tabular-nums text-sm text-blue-600">
                        -{formatPKR(tr.amount)}
                      </div>
                    </div>
                  ))}

                  {/* Incoming Transfers */}
                  {historyData.transfersTo.map((tr: any) => (
                    <div key={`to-${tr.id}`} className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <ArrowRightLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">Transfer In from {tr.fromAccount?.name}</div>
                          <div className="text-[10px] text-slate-400">{format(new Date(tr.transferDate), 'yyyy-MM-dd')} • Internal Transfer</div>
                        </div>
                      </div>
                      <div className="font-bold tabular-nums text-sm text-blue-600">
                        +{formatPKR(tr.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opening Balance Modal */}
      <OpeningBalanceModal
        isOpen={isOpeningModalOpen}
        account={editingAccount}
        onClose={() => {
          setIsOpeningModalOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
};
