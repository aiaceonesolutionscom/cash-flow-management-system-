import React, { useEffect, useState } from 'react';
import { Building2, ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown, Wallet, Building, CreditCard, Loader2 } from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { useFilters } from '../context/FilterContext';
import { Company } from '../types';

export const CompaniesPage: React.FC = () => {
  const { refreshTrigger, setSelectedCompanyId } = useFilters();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/companies');
        if (res.data.success) {
          setCompanies(res.data.companies);
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, [refreshTrigger]);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Companies Financial Overview</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Independent financial summaries and liquidity tracking for all three connected company entities
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading company metrics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {companies.map((comp) => {
            const netFlow = parseFloat(comp.metrics?.netCashFlow || '0');
            return (
              <div
                key={comp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-md"
              >
                <div>
                  {/* Company Title */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{comp.name}</h3>
                      <span className="text-xs font-semibold text-blue-600">Code: {comp.code}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      PKR (₨)
                    </span>
                  </div>

                  {/* Primary Total Available Balance */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Company Balance
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                      {formatPKR(comp.metrics?.totalBalance)}
                    </div>
                  </div>

                  {/* Cash Flow Highlights */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase flex items-center">
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                        Cash In
                      </div>
                      <div className="text-sm font-bold text-emerald-600 tabular-nums mt-1">
                        {formatPKR(comp.metrics?.totalCashIn)}
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                      <div className="text-[10px] text-rose-700 font-semibold uppercase flex items-center">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        Cash Out
                      </div>
                      <div className="text-sm font-bold text-rose-600 tabular-nums mt-1">
                        {formatPKR(comp.metrics?.totalCashOut)}
                      </div>
                    </div>
                  </div>

                  {/* Net Cash Flow Banner */}
                  <div className="mt-3 p-3 rounded-lg border flex items-center justify-between bg-white border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Net Cash Flow</span>
                    <span className={`text-sm font-bold tabular-nums flex items-center ${
                      netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {netFlow >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                      {formatPKR(comp.metrics?.netCashFlow)}
                    </span>
                  </div>

                  {/* Accounts Breakdown */}
                  <div className="mt-5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Connected Accounts
                    </div>
                    <div className="space-y-1.5">
                      {comp.accounts?.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700">
                            {acc.type === 'CASH' && <Wallet className="w-3.5 h-3.5 text-amber-500" />}
                            {acc.type === 'BANK' && <Building className="w-3.5 h-3.5 text-blue-500" />}
                            {acc.type === 'WALLET' && <CreditCard className="w-3.5 h-3.5 text-purple-500" />}
                            <span>{acc.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {formatPKR(acc.currentBalance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filter shortcut */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedCompanyId(comp.id)}
                    className="w-full py-2 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                  >
                    Focus Dashboard on {comp.code} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
