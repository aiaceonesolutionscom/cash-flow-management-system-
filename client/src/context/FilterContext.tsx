import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Company } from '../types';
import { useAuth } from './AuthContext';

interface FilterContextType {
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  companies: Company[];
  refreshTrigger: number;
  triggerRefresh: () => void;
  activeCompanyName: string;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies');
      if (res.data.success && res.data.companies) {
        setCompanies(res.data.companies);
      }
    } catch (e) {
      console.error('Failed to load companies in filter context', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated || localStorage.getItem('cashflow_token')) {
      fetchCompanies();
    } else {
      setCompanies([]);
    }
  }, [isAuthenticated, refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const activeCompanyName = selectedCompanyId === 'all'
    ? 'All Companies'
    : companies.find((c) => c.id === selectedCompanyId)?.name || 'Selected Company';

  return (
    <FilterContext.Provider
      value={{
        selectedCompanyId,
        setSelectedCompanyId,
        dateRange,
        setDateRange,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        companies,
        refreshTrigger,
        triggerRefresh,
        activeCompanyName
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
};
