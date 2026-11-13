import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownRight, Upload, Loader2, ChevronDown, Check, Coins } from 'lucide-react';
import { api } from '../../services/api';
import { Company, Account, Category } from '../../types';

interface AvailableFundOption {
  id: string;
  title: string;
  receivedFrom: string;
  receivingMethod?: string;
  totalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
}

interface CashInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Company[];
  initialCompanyId?: string;
  initialFundId?: string;
}

export const CashInModal: React.FC<CashInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companies,
  initialCompanyId,
  initialFundId
}) => {
  const [companyId, setCompanyId] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState<boolean>(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  // Available Funds Pool
  const [availableFunds, setAvailableFunds] = useState<AvailableFundOption[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>('');

  const [amount, setAmount] = useState<string>('');
  const [party, setParty] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Load available funds from pool
  useEffect(() => {
    if (isOpen) {
      const fetchAvailableFunds = async () => {
        try {
          const res = await api.get('/funds/available');
          if (res.data.success) {
            setAvailableFunds(res.data.funds || []);
            if (initialFundId) {
              setSelectedFundId(initialFundId);
              const found = res.data.funds.find((f: AvailableFundOption) => f.id === initialFundId);
              if (found) {
                setParty(found.receivedFrom);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load available funds pool', e);
        }
      };
      fetchAvailableFunds();
    }
  }, [isOpen, initialFundId]);

  useEffect(() => {
    if (isOpen) {
      const defComp = initialCompanyId && initialCompanyId !== 'all' ? initialCompanyId : companies[0]?.id || '';
      setCompanyId(defComp);
      setAmount('');
      if (!initialFundId) {
        setParty('');
        setSelectedFundId('');
      }
      setReferenceNo('');
      setDescription('');
      setReceiptFile(null);
      setError('');
      setIsCatDropdownOpen(false);
    }
  }, [isOpen, initialCompanyId, companies, initialFundId]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!companyId) return;

    const loadCompanyData = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          api.get(`/accounts?companyId=${companyId}`),
          api.get(`/categories?companyId=${companyId}&type=INCOME`)
        ]);
        if (accRes.data.success) {
          setAccounts(accRes.data.accounts);
          if (accRes.data.accounts.length > 0) {
            setAccountId(accRes.data.accounts[0].id);
          }
        }
        if (catRes.data.success) {
          setCategories(catRes.data.categories);
          if (catRes.data.categories.length > 0) {
            setCategoryId(catRes.data.categories[0].id);
            setCategoryInput(catRes.data.categories[0].name);
          } else {
            setCategoryId('');
            setCategoryInput('');
          }
        }
      } catch (err) {
        console.error('Failed to load accounts/categories for company', err);
      }
    };
    loadCompanyData();
  }, [companyId]);

  if (!isOpen) return null;

  const handleCategoryInputChange = (val: string) => {
    setCategoryInput(val);
    setIsCatDropdownOpen(true);
    // Check if matches existing category exactly (case-insensitive)
    const exactMatch = categories.find((c) => c.name.toLowerCase() === val.trim().toLowerCase());
    if (exactMatch) {
      setCategoryId(exactMatch.id);
    } else {
      setCategoryId('');
    }
  };

  const selectExistingCategory = (cat: Category) => {
    setCategoryId(cat.id);
    setCategoryInput(cat.name);
    setIsCatDropdownOpen(false);
  };

  const selectNewCategory = () => {
    setCategoryId('');
    setIsCatDropdownOpen(false);
  };

  const handleFundSelection = (fundId: string) => {
    setSelectedFundId(fundId);
    if (!fundId) return;
    const found = availableFunds.find((f) => f.id === fundId);
    if (found) {
      if (!party || party === 'Customer / Client Name' || party === '') {
        setParty(found.receivedFrom);
      }
      // Auto-set Category to Company Funds if available
      const fundCat = categories.find((c) => c.name.toLowerCase().includes('fund'));
      if (fundCat) {
        setCategoryId(fundCat.id);
        setCategoryInput(fundCat.name);
      } else if (!categoryInput.toLowerCase().includes('fund')) {
        setCategoryInput('Company Funds');
        setCategoryId('');
      }
    }
  };

  const selectedFund = availableFunds.find((f) => f.id === selectedFundId);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryInput.toLowerCase())
  );

  const hasExactMatch = categories.some(
    (c) => c.name.toLowerCase() === categoryInput.trim().toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalCatName = categoryInput.trim();
    if (!companyId || !accountId || (!categoryId && !finalCatName) || !amount || !party || !paymentDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (selectedFundId) {
      const found = availableFunds.find((f) => f.id === selectedFundId);
      if (found && parseFloat(amount) > found.remainingAmount) {
        setError(`Entered amount (PKR ${parseFloat(amount).toLocaleString()}) exceeds available fund balance (PKR ${found.remainingAmount.toLocaleString()}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('companyId', companyId);
      formData.append('accountId', accountId);

      if (categoryId) {
        formData.append('categoryId', categoryId);
      } else {
        formData.append('categoryName', finalCatName);
      }

      formData.append('amount', amount);
      formData.append('party', party);
      formData.append('paymentDate', paymentDate);
      if (referenceNo) formData.append('referenceNo', referenceNo);
      if (description) formData.append('description', description);
      if (receiptFile) formData.append('receipt', receiptFile);
      if (selectedFundId) formData.append('companyFundId', selectedFundId);

      const res = await api.post('/cash-in', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record Cash In.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record Cash In</h3>
              <p className="text-xs text-slate-500">Add incoming payment into an account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Company *</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Payment Method / Account *</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type === 'CASH' ? '💵 Cash' : a.type === 'BANK' ? '🏦 Bank' : '📱 Wallet'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Amount (PKR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium tabular-nums"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Received From *</label>
              <input
                type="text"
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder="Customer / Client Name"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Searchable & Creatable Income Category Combobox */}
            <div className="relative" ref={catDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Income Category *</label>
                {categoryInput.trim() && !hasExactMatch && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    + Auto-creates as Income
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => handleCategoryInputChange(e.target.value)}
                  onFocus={() => setIsCatDropdownOpen(true)}
                  placeholder="Type to search or add new category..."
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions / Create Dropdown Menu */}
              {isCatDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto p-1 divide-y divide-slate-50 animate-in fade-in-50 duration-150">
                  {/* Option to create brand new if typed text doesn't exactly match */}
                  {categoryInput.trim() && !hasExactMatch && (
                    <button
                      type="button"
                      onClick={selectNewCategory}
                      className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 text-xs font-bold flex items-center justify-between transition-colors mb-1 cursor-pointer"
                    >
                      <span className="truncate">Add new "{categoryInput.trim()}"</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 ml-2">
                        + New Income Category
                      </span>
                    </button>
                  )}

                  {/* Filtered Existing Categories */}
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => selectExistingCategory(cat)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  ) : !categoryInput.trim() ? (
                    <div className="px-3 py-2 text-xs text-slate-400 text-center">Type any category name to create or search...</div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Dynamic Source Fund Pool Selector (Shown when Category is Company Funds, or when user links to master fund) */}
          {(categoryInput.toLowerCase().includes('fund') || selectedFundId || availableFunds.length > 0) && (
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                  <Coins className="w-4 h-4 text-blue-600" />
                  <span>Source Capital Fund Pool (Multi-Company Allocation)</span>
                </div>
                {selectedFund && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Remaining: ₨ {selectedFund.remainingAmount.toLocaleString()}
                  </span>
                )}
              </div>
              <select
                value={selectedFundId}
                onChange={(e) => handleFundSelection(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="">-- No Master Fund Link (Direct One-Off Inflow) --</option>
                {availableFunds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.receivedFrom} • {f.title} (Available: ₨ {f.remainingAmount.toLocaleString()})
                  </option>
                ))}
              </select>
              {selectedFund ? (
                <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium px-1 pt-0.5">
                  <span>Total Fund: ₨ {selectedFund.totalAmount.toLocaleString()}</span>
                  <span>Disbursed so far: ₨ {selectedFund.allocatedAmount.toLocaleString()}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Select an active master fund from the pool to automatically track remaining unspent balances.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Reference Number</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Cheque # / Receipt # / Bank Reference"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details regarding this cash inflow..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Receipt Attachment (Optional)</label>
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Choose File
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </label>
              <span className="text-xs text-slate-500 truncate max-w-xs">
                {receiptFile ? receiptFile.name : 'No file chosen (PDF, JPEG, PNG up to 10MB)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Cash In'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
