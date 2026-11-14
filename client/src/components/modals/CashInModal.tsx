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

interface SpilloverPlanItem {
  fundId: string;
  title: string;
  amount: number;
  remainingAfter: number;
  isPrimary: boolean;
}

interface CashInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Company[];
  initialCompanyId?: string;
  initialFundId?: string;
  editTransaction?: any;
}

export const CashInModal: React.FC<CashInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companies,
  initialCompanyId,
  initialFundId,
  editTransaction
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
  const [spilloverPlan, setSpilloverPlan] = useState<SpilloverPlanItem[] | null>(null);

  // Load available funds from pool
  useEffect(() => {
    if (isOpen) {
      setSpilloverPlan(null);
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
      setSpilloverPlan(null);
      if (editTransaction) {
        setCompanyId(editTransaction.companyId);
        setAmount(String(editTransaction.amount));
        setParty(editTransaction.party || '');
        setAccountId(editTransaction.accountId || '');
        setCategoryId(editTransaction.categoryId || '');
        setCategoryInput(editTransaction.category?.name || '');
        setPaymentDate(
          editTransaction.paymentDate
            ? new Date(editTransaction.paymentDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setReferenceNo(editTransaction.referenceNo || '');
        setDescription(editTransaction.description || '');
        setSelectedFundId(editTransaction.companyFundId || '');
        setReceiptFile(null);
        setError('');
        setIsCatDropdownOpen(false);
      } else {
        const defComp = initialCompanyId && initialCompanyId !== 'all' ? initialCompanyId : companies[0]?.id || '';
        setCompanyId(defComp);
        setAmount('');
        if (!initialFundId) {
          setParty('');
          setSelectedFundId('');
        } else {
          setSelectedFundId(initialFundId);
        }
        setReferenceNo('');
        setDescription('');
        setReceiptFile(null);
        setError('');
        setIsCatDropdownOpen(false);
      }
    }
  }, [isOpen, initialCompanyId, companies, initialFundId, editTransaction]);

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
            if (editTransaction?.accountId && accRes.data.accounts.some((a: any) => a.id === editTransaction.accountId)) {
              setAccountId(editTransaction.accountId);
            } else if (!accountId || !accRes.data.accounts.some((a: any) => a.id === accountId)) {
              setAccountId(accRes.data.accounts[0].id);
            }
          }
        }
        if (catRes.data.success) {
          const cats: Category[] = catRes.data.categories;
          setCategories(cats);
          if (editTransaction) {
            if (editTransaction.categoryId) {
              setCategoryId(editTransaction.categoryId);
              setCategoryInput(editTransaction.category?.name || '');
            } else if (editTransaction.category?.name) {
              const matched = cats.find((c) => c.name.toLowerCase() === editTransaction.category?.name.toLowerCase());
              if (matched) {
                setCategoryId(matched.id);
                setCategoryInput(matched.name);
              } else {
                setCategoryId('');
                setCategoryInput(editTransaction.category.name);
              }
            }
          } else if (initialFundId || selectedFundId) {
            const fundCat = cats.find((c) => c.name.toLowerCase().includes('fund'));
            if (fundCat) {
              setCategoryId(fundCat.id);
              setCategoryInput(fundCat.name);
            } else {
              setCategoryInput('Company Funds');
              setCategoryId('');
            }
          } else if (cats.length > 0) {
            setCategoryId(cats[0].id);
            setCategoryInput(cats[0].name);
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

  const executeSave = async (overrideAmount?: string, allocations?: SpilloverPlanItem[]) => {
    try {
      setIsSubmitting(true);
      setError('');
      const finalCatName = categoryInput.trim();
      const finalAmount = overrideAmount !== undefined ? overrideAmount : amount;

      const formData = new FormData();
      formData.append('companyId', companyId);
      formData.append('accountId', accountId || (editTransaction?.accountId || ''));

      if (categoryId) {
        formData.append('categoryId', categoryId);
      }
      if (finalCatName) {
        formData.append('categoryName', finalCatName);
      }

      formData.append('amount', finalAmount);
      formData.append('party', party);
      formData.append('paymentDate', paymentDate);
      if (referenceNo) formData.append('referenceNo', referenceNo);
      if (description) formData.append('description', description);
      if (receiptFile) formData.append('receipt', receiptFile);

      if (allocations && allocations.length > 0) {
        formData.append(
          'fundAllocations',
          JSON.stringify(allocations.map((a) => ({ fundId: a.fundId, amount: a.amount })))
        );
      } else if (selectedFundId) {
        formData.append('companyFundId', selectedFundId);
      }

      const res = editTransaction
        ? await api.put(`/cash-in/${editTransaction.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        : await api.post('/cash-in', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save Cash In.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDenySpillover = async () => {
    if (!spilloverPlan || spilloverPlan.length === 0) return;
    const primaryAlloc = spilloverPlan[0];
    const restrictedAmount = String(primaryAlloc.amount);
    setAmount(restrictedAmount);
    setSpilloverPlan(null);
    await executeSave(restrictedAmount, undefined);
  };

  const handleAcceptSpillover = async () => {
    if (!spilloverPlan) return;
    const planToExecute = [...spilloverPlan];
    setSpilloverPlan(null);
    await executeSave(amount, planToExecute);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalCatName = categoryInput.trim();
    if (!companyId || !accountId || (!categoryId && !finalCatName) || !amount || !party || !paymentDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (!editTransaction && selectedFundId) {
      const found = availableFunds.find((f) => f.id === selectedFundId);
      if (found && numAmount > found.remainingAmount) {
        // Check other funds in available pool
        const otherFunds = availableFunds.filter((f) => f.id !== selectedFundId && f.remainingAmount > 0);
        const otherTotal = otherFunds.reduce((sum, f) => sum + f.remainingAmount, 0);
        const totalPool = found.remainingAmount + otherTotal;

        if (numAmount > totalPool) {
          setError(
            `Entered amount (PKR ${numAmount.toLocaleString()}) exceeds total available pool across all funds (PKR ${totalPool.toLocaleString()}). Maximum available is PKR ${totalPool.toLocaleString()}.`
          );
          return;
        }

        // Build spillover deduction plan
        const plan: SpilloverPlanItem[] = [];
        plan.push({
          fundId: found.id,
          title: found.title,
          amount: found.remainingAmount,
          remainingAfter: 0,
          isPrimary: true
        });

        let needed = numAmount - found.remainingAmount;
        for (const f of otherFunds) {
          if (needed <= 0) break;
          const take = Math.min(needed, f.remainingAmount);
          plan.push({
            fundId: f.id,
            title: f.title,
            amount: take,
            remainingAfter: f.remainingAmount - take,
            isPrimary: false
          });
          needed -= take;
        }

        // Trigger user confirmation permission dialog
        setSpilloverPlan(plan);
        return;
      }
    }

    await executeSave();
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
              <h3 className="text-lg font-bold text-slate-900">
                {editTransaction ? 'Edit Cash In' : 'Record Cash In'}
              </h3>
              <p className="text-xs text-slate-500">
                {editTransaction ? 'Modify existing cash inflow record' : 'Add incoming payment into an account'}
              </p>
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
                disabled={!!editTransaction}
                className={`w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  editTransaction ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                }`}
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
              ) : editTransaction ? (
                'Update Cash In'
              ) : (
                'Save Cash In'
              )}
            </button>
          </div>
        </form>

        {/* Multi-Fund Deduction Confirmation Dialog */}
        {spilloverPlan && spilloverPlan.length > 0 && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Fund Spillover Deduction Confirmation</h4>
                    <p className="text-[11px] text-amber-700 font-medium">Selected fund balance is insufficient for requested amount</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSpilloverPlan(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                  Selected fund <strong className="text-slate-800">"{spilloverPlan[0].title}"</strong> only has{' '}
                  <strong className="text-emerald-700">PKR {spilloverPlan[0].amount.toLocaleString()}</strong> remaining.
                  To complete your requested Cash In of{' '}
                  <strong className="text-blue-700">PKR {parseFloat(amount).toLocaleString()}</strong>, the remaining{' '}
                  <strong className="text-amber-700">
                    PKR {(parseFloat(amount) - spilloverPlan[0].amount).toLocaleString()}
                  </strong>{' '}
                  can be deducted from next available fund(s):
                </div>

                {/* Deduction Breakdown */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Proposed Allocation Breakdown:
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {spilloverPlan.map((item, idx) => (
                      <div key={item.fundId} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                              item.isPrimary ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-800">{item.title}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.isPrimary
                                ? 'Selected Fund (Fully exhausted)'
                                : `Available Fund (PKR ${item.remainingAfter.toLocaleString()} will remain)`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-slate-900 tabular-nums">
                            PKR {item.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-bold border-t border-slate-200">
                      <span className="text-slate-700">Total Cash In Amount</span>
                      <span className="text-emerald-700 text-sm tabular-nums">
                        PKR {parseFloat(amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  * Agar aap <strong>Deny</strong> karenge, to sirf PKR {spilloverPlan[0].amount.toLocaleString()} cash in hoga. Agar aap <strong>Accept</strong> karenge, to poore PKR {parseFloat(amount).toLocaleString()} dono funds se kat kar record honge.
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDenySpillover}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer text-center"
                >
                  Deny — Restrict to PKR {spilloverPlan[0].amount.toLocaleString()}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAcceptSpillover}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-500/20 rounded-xl cursor-pointer text-center flex items-center justify-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      <span>Allocating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Accept — Deduct PKR {parseFloat(amount).toLocaleString()} Across Funds</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
