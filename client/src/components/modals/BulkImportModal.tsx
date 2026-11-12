import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api, formatPKR } from '../../services/api';
import { Company, Account, Category } from '../../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Company[];
  initialCompanyId?: string;
}

interface ParsedRow {
  date: string;
  type: 'CASH_IN' | 'CASH_OUT';
  categoryName: string;
  party: string;
  amount: number;
  referenceNo?: string;
  description?: string;
  error?: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companies,
  initialCompanyId
}) => {
  const [companyId, setCompanyId] = useState<string>(initialCompanyId && initialCompanyId !== 'all' ? initialCompanyId : companies[0]?.id || '');
  const [accountId, setAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch accounts and categories whenever companyId changes
  React.useEffect(() => {
    if (!companyId) return;
    const loadCompanyData = async () => {
      try {
        const [accRes, catRes] = await Promise.all([
          api.get('/accounts', { params: { companyId } }),
          api.get('/categories', { params: { companyId } })
        ]);
        if (accRes.data.success) {
          const accs: Account[] = accRes.data.accounts || [];
          setAccounts(accs);
          if (accs.length > 0) setAccountId(accs[0].id);
        }
        if (catRes.data.success) {
          setCategories(catRes.data.categories || []);
        }
      } catch (err) {
        console.error('Failed to load company accounts/categories for bulk import', err);
      }
    };
    loadCompanyData();
  }, [companyId]);

  if (!isOpen) return null;

  const downloadSampleTemplate = () => {
    const csvContent =
      'Date,Type,Category,Party,Amount,Reference,Description\n' +
      '2026-11-12,CASH_IN,Sales,Apex Client Ltd,50000,INV-1001,November Retainer Fee\n' +
      '2026-11-12,CASH_OUT,Utilities,K-Electric Bill,12500,BILL-4921,Office Electricity Expense\n' +
      '2026-11-12,CASH_OUT,Office Supplies,Stationery Depot,3500,REC-991,Printing paper and ink\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cashflow_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGeneralError('');
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length < 2) {
          setGeneralError('CSV file is empty or missing data rows.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const dateIdx = headers.findIndex((h) => h.includes('date'));
        const typeIdx = headers.findIndex((h) => h.includes('type'));
        const catIdx = headers.findIndex((h) => h.includes('cat'));
        const partyIdx = headers.findIndex((h) => h.includes('party') || h.includes('vendor') || h.includes('client'));
        const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('total'));
        const refIdx = headers.findIndex((h) => h.includes('ref'));
        const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('note'));

        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.trim());
          if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

          const rawDate = dateIdx >= 0 ? parts[dateIdx] : new Date().toISOString().split('T')[0];
          const rawType = (typeIdx >= 0 ? parts[typeIdx].toUpperCase() : 'CASH_OUT') as any;
          const type: 'CASH_IN' | 'CASH_OUT' = rawType.includes('IN') ? 'CASH_IN' : 'CASH_OUT';
          const categoryName = catIdx >= 0 ? parts[catIdx] : 'General';
          const party = partyIdx >= 0 ? parts[partyIdx] : 'Unspecified Party';
          const amount = amountIdx >= 0 ? parseFloat(parts[amountIdx].replace(/[^0-9.-]/g, '')) : 0;
          const referenceNo = refIdx >= 0 ? parts[refIdx] : '';
          const description = descIdx >= 0 ? parts[descIdx] : '';

          let error = '';
          if (isNaN(amount) || amount <= 0) error = 'Invalid Amount';
          else if (!party) error = 'Missing Party Name';

          rows.push({
            date: rawDate,
            type,
            categoryName,
            party,
            amount: isNaN(amount) ? 0 : amount,
            referenceNo,
            description,
            error
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        setGeneralError(`Failed to parse CSV file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!companyId) {
      setGeneralError('Please select a target company.');
      return;
    }
    if (!accountId) {
      setGeneralError('Please select an account for these transactions.');
      return;
    }
    if (parsedRows.length === 0) {
      setGeneralError('No valid rows found to import.');
      return;
    }

    const hasInvalid = parsedRows.some((r) => r.error);
    if (hasInvalid) {
      setGeneralError('Please fix or remove rows with errors before importing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError('');

      // Match categories by name or fallback to first matching type
      const itemsToSubmit = parsedRows.map((row) => {
        const catTargetType = row.type === 'CASH_IN' ? 'INCOME' : 'EXPENSE';
        const matchedCat = categories.find(
          (c) => c.name.toLowerCase() === row.categoryName.toLowerCase() && c.type === catTargetType
        ) || categories.find((c) => c.type === catTargetType) || categories[0];

        return {
          companyId,
          accountId,
          categoryId: matchedCat?.id,
          type: row.type,
          amount: row.amount,
          party: row.party,
          paymentDate: row.date,
          referenceNo: row.referenceNo || null,
          description: row.description || null
        };
      });

      const res = await api.post('/transactions/bulk-import', { items: itemsToSubmit });
      if (res.data.success) {
        setSuccessMessage(`Successfully imported ${res.data.importedCount} transactions!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setGeneralError(err.response?.data?.message || err.message || 'Failed to import transactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalIn = parsedRows.filter((r) => r.type === 'CASH_IN').reduce((acc, r) => acc + r.amount, 0);
  const totalOut = parsedRows.filter((r) => r.type === 'CASH_OUT').reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">Bulk Import Transactions</h3>
              <p className="text-xs text-slate-500">Upload CSV file to import multiple Cash In & Cash Out entries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Company & Account Selection Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Company</label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Destination Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type}) • Current Bal: PKR {formatPKR(a.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Area / Template Strip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV File</span>
              </button>
              <span className="text-slate-600 font-medium text-[11px]">
                {parsedRows.length > 0 ? `${parsedRows.length} rows parsed` : 'Supports standard CSV format'}
              </span>
            </div>

            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Alerts */}
          {generalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{generalError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 ? (
            <div className="space-y-3">
              {/* Summary Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="font-bold text-slate-800 text-xs">Previewing {parsedRows.length} Transactions:</span>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                    Inflow: PKR {formatPKR(totalIn)}
                  </span>
                  <span className="text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                    Outflow: PKR {formatPKR(totalOut)}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Party</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3">Ref #</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.error ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{row.date}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type === 'CASH_IN'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {row.type === 'CASH_IN' ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{row.categoryName}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.party}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatPKR(row.amount)}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{row.referenceNo || '—'}</td>
                        <td className="py-2 px-3">
                          {row.error ? (
                            <span className="text-rose-600 font-semibold text-[10px]">{row.error}</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[10px]">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <FileSpreadsheet className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
              <p className="font-semibold text-slate-600 text-xs">No CSV file uploaded yet</p>
              <p className="text-[11px]">Download our sample template or upload your existing spreadsheet.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={parsedRows.length === 0 || isSubmitting}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importing Transactions...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Import {parsedRows.length} Transactions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
