import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { Company, Account } from '../../types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Company[];
  initialCompanyId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companies,
  initialCompanyId
}) => {
  const [fromCompanyId, setFromCompanyId] = useState<string>('');
  const [toCompanyId, setToCompanyId] = useState<string>('');

  const [fromAccounts, setFromAccounts] = useState<Account[]>([]);
  const [toAccounts, setToAccounts] = useState<Account[]>([]);

  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');

  const [amount, setAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const defComp = initialCompanyId && initialCompanyId !== 'all' ? initialCompanyId : companies[0]?.id || '';
      setFromCompanyId(defComp);
      setToCompanyId(defComp);
      setAmount('');
      setReferenceNo('');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialCompanyId, companies]);

  // Load Source Accounts when fromCompanyId changes
  useEffect(() => {
    if (!fromCompanyId) return;

    const loadFromAccounts = async () => {
      try {
        const res = await api.get(`/accounts?companyId=${fromCompanyId}`);
        if (res.data.success) {
          const accs: Account[] = res.data.accounts;
          setFromAccounts(accs);
          if (accs.length > 0) {
            setFromAccountId(accs[0].id);
          } else {
            setFromAccountId('');
          }
        }
      } catch (err) {
        console.error('Failed to load source accounts', err);
      }
    };
    loadFromAccounts();
  }, [fromCompanyId]);

  // Load Destination Accounts when toCompanyId changes
  useEffect(() => {
    if (!toCompanyId) return;

    const loadToAccounts = async () => {
      try {
        const res = await api.get(`/accounts?companyId=${toCompanyId}`);
        if (res.data.success) {
          const accs: Account[] = res.data.accounts;
          setToAccounts(accs);
          if (fromCompanyId === toCompanyId && accs.length >= 2) {
            // Pick a different account if same company
            setToAccountId(accs[1].id);
          } else if (accs.length > 0) {
            setToAccountId(accs[0].id);
          } else {
            setToAccountId('');
          }
        }
      } catch (err) {
        console.error('Failed to load destination accounts', err);
      }
    };
    loadToAccounts();
  }, [toCompanyId, fromCompanyId]);

  if (!isOpen) return null;

  const isInterCompany = fromCompanyId && toCompanyId && fromCompanyId !== toCompanyId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromCompanyId || !toCompanyId || !fromAccountId || !toAccountId || !amount || !transferDate) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    if (fromCompanyId === toCompanyId && fromAccountId === toAccountId) {
      setError('Source and Destination accounts cannot be the same within the same company.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Transfer amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/transfers', {
        companyId: fromCompanyId,
        fromAccountId,
        toAccountId,
        amount,
        transferDate,
        referenceNo: referenceNo || undefined,
        notes: notes || undefined
      });

      if (res.data.success) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete money transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-blue-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Transfer Money</h3>
              <p className="text-xs text-slate-500">Between accounts (within company or across companies)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transfer Mode Indicator */}
        <div className="px-5 pt-3">
          {isInterCompany ? (
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
              <Building2 className="w-4 h-4 shrink-0 text-purple-600" />
              <span>Inter-Company Transfer (Cross-Entity Fund Movement)</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-700 text-xs font-semibold">
              <Building2 className="w-4 h-4 shrink-0 text-blue-500" />
              <span>Internal Account Transfer (Same Company)</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Source Section (From) */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Source (Money Leaving)</span>
              <span className="text-rose-500 font-bold">- Deducts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Company *</label>
                <select
                  value={fromCompanyId}
                  onChange={(e) => setFromCompanyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Account *</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  {fromAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Destination Section (To) */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Destination (Money Arriving)</span>
              <span className="text-emerald-600 font-bold">+ Credits</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Company *</label>
                <select
                  value={toCompanyId}
                  onChange={(e) => setToCompanyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Account *</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  {toAccounts.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      disabled={fromCompanyId === toCompanyId && a.id === fromAccountId}
                    >
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Transfer Amount (PKR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₨</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 tabular-nums"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Transfer Date *
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. Bank Ref # / Cheque # / ATM Slip"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transfer Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer (e.g. Inter-company loan, cash withdrawal, reimbursement)..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-normal"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm shadow-blue-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
