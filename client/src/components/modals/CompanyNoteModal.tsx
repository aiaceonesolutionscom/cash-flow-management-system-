import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Building2, Calendar, AlertCircle, Calculator } from 'lucide-react';
import { Company, CompanyNote, CompanyNoteItem, DemandPriority, DemandStatus } from '../../types';
import { formatPKR } from '../../services/api';

interface CompanyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: {
    companyId: string;
    title: string;
    priority: DemandPriority;
    status?: DemandStatus;
    dueDate?: string;
    notes?: string;
    items: { itemName: string; amount: number }[];
  }) => Promise<void>;
  companies: Company[];
  noteToEdit?: CompanyNote | null;
  defaultCompanyId?: string;
}

export const CompanyNoteModal: React.FC<CompanyNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  companies,
  noteToEdit,
  defaultCompanyId
}) => {
  const [companyId, setCompanyId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [priority, setPriority] = useState<DemandPriority>('HIGH');
  const [status, setStatus] = useState<DemandStatus>('PENDING');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<{ itemName: string; amount: string }[]>([
    { itemName: '', amount: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (noteToEdit) {
        setCompanyId(noteToEdit.companyId);
        setTitle(noteToEdit.title);
        setPriority(noteToEdit.priority);
        setStatus(noteToEdit.status);
        setDueDate(noteToEdit.dueDate ? noteToEdit.dueDate.substring(0, 10) : '');
        setNotes(noteToEdit.notes || '');
        if (noteToEdit.items && noteToEdit.items.length > 0) {
          setItems(
            noteToEdit.items.map((it: CompanyNoteItem) => ({
              itemName: it.itemName,
              amount: it.amount.toString()
            }))
          );
        } else {
          setItems([{ itemName: '', amount: '' }]);
        }
      } else {
        setCompanyId(defaultCompanyId && defaultCompanyId !== 'all' ? defaultCompanyId : (companies[0]?.id || ''));
        setTitle('');
        setPriority('HIGH');
        setStatus('PENDING');
        setDueDate('');
        setNotes('');
        setItems([
          { itemName: '', amount: '' }
        ]);
      }
    }
  }, [isOpen, noteToEdit, defaultCompanyId, companies]);

  if (!isOpen) return null;

  // Calculate live total
  const calculatedTotal = items.reduce((acc, it) => {
    const val = parseFloat(it.amount);
    return acc + (isNaN(val) || val <= 0 ? 0 : val);
  }, 0);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { itemName: '', amount: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'itemName' | 'amount', value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyId) {
      setError('Please select a company');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a requirement title or purpose');
      return;
    }

    // Validate items
    const parsedItems: { itemName: string; amount: number }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const trimmedName = it.itemName.trim();
      const numAmt = parseFloat(it.amount);

      if (!trimmedName) {
        setError(`Item #${i + 1} must have a name or description`);
        return;
      }
      if (isNaN(numAmt) || numAmt <= 0) {
        setError(`Item #${i + 1} must have a valid positive amount`);
        return;
      }
      parsedItems.push({ itemName: trimmedName, amount: numAmt });
    }

    if (parsedItems.length === 0) {
      setError('Please provide at least one valid item');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        companyId,
        title: title.trim(),
        priority,
        status: noteToEdit ? status : undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: parsedItems
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              📝
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {noteToEdit ? 'Edit Financial Requirement' : 'New Company Requirement Note'}
              </h3>
              <p className="text-xs text-slate-500">Record fund demands & itemized budget requirements</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Company Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Company <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4" />
              </div>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="" disabled>Select target company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Requirement Purpose / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Monthly Digital Marketing & Media Budget"
              required
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DemandPriority)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="URGENT">🚨 URGENT (Immediate)</option>
                <option value="HIGH">🔥 HIGH</option>
                <option value="MEDIUM">⚡ MEDIUM</option>
                <option value="LOW">🟢 LOW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Needed By Date (Optional)</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Status (if editing) */}
          {noteToEdit && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DemandStatus)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="PENDING">⏳ PENDING (Awaiting Funds)</option>
                <option value="IN_PROGRESS">⚙️ IN PROGRESS (Partially Paid)</option>
                <option value="FULFILLED">✅ FULFILLED (Provided)</option>
                <option value="CANCELLED">❌ CANCELLED</option>
              </select>
            </div>
          )}

          {/* Multi-Line Items Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>Line Items Breakdown</span>
                <span className="text-rose-500">*</span>
                <span className="text-[11px] text-slate-400 font-normal">({items.length} items)</span>
              </label>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                      placeholder={`Item description (e.g., Meta Ads, Video Editor)`}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-36 sm:w-44">
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-[10px] font-bold text-slate-400">PKR</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.amount}
                        onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-right"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Total Calculation Card */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between px-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600">
                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                  <span>Calculated Total Requirement:</span>
                </div>
                <div className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {formatPKR(calculatedTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Additional Notes / Justification (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any extra details, bank instructions, or campaign targets..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving Requirement...' : (noteToEdit ? 'Update Requirement' : 'Save Requirement Note')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
