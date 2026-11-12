import React from 'react';
import { X, Printer, Receipt, Calendar, CreditCard, Tag, User } from 'lucide-react';
import { Transaction } from '../../types';
import { formatPKR } from '../../services/api';
import { format } from 'date-fns';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  if (!isOpen || !transaction) return null;

  const isCashIn = transaction.type === 'CASH_IN';
  const voucherTypeTitle = isCashIn ? 'OFFICIAL CASH RECEIPT VOUCHER' : 'OFFICIAL CASH PAYMENT VOUCHER';
  const voucherPrefix = isCashIn ? 'CRV' : 'CPV';
  const shortId = transaction.id.slice(0, 8).toUpperCase();
  const voucherNo = transaction.referenceNo || `${voucherPrefix}-${shortId}`;

  const formattedDate = (() => {
    try {
      return format(new Date(transaction.paymentDate), 'dd MMMM yyyy');
    } catch {
      return transaction.paymentDate;
    }
  })();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCashIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <Receipt className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Payment Voucher Preview</h3>
              <p className="text-[11px] text-slate-500">Official audit document</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div id="printable-voucher" className="p-6 sm:p-8 bg-white text-slate-900 select-text">
          {/* Company & Voucher Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                  {transaction.company?.name || 'Company Name'}
                </h1>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                  Financial Management Suite • PKR Currency
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded border ${
                  isCashIn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-300'
                }`}>
                  {isCashIn ? 'Cash Inflow' : 'Cash Outflow'}
                </span>
                <p className="text-xs font-bold text-slate-700 font-mono mt-1">
                  {voucherNo}
                </p>
              </div>
            </div>

            <div className="text-center mt-4">
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800 underline underline-offset-4 decoration-2">
                {voucherTypeTitle}
              </h2>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs mb-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Date:</span>
                <span className="font-bold text-slate-800">{formattedDate}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">{isCashIn ? 'Received From:' : 'Paid To (Party):'}</span>
                <span className="font-bold text-slate-900">{transaction.party}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-600">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Account / Channel:</span>
                <span className="font-bold text-slate-800">
                  {transaction.account?.name} ({transaction.account?.type})
                </span>
              </div>
              <div className="flex items-center space-x-2 text-slate-600">
                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Category:</span>
                <span className="font-bold text-slate-800">{transaction.category?.name || 'General'}</span>
              </div>
            </div>
          </div>

          {/* Description & Line Details Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Particulars / Narration</th>
                  <th className="py-2.5 px-4 text-right w-36">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">1</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">
                      {transaction.description || (isCashIn ? `Cash Received from ${transaction.party}` : `Payment Made to ${transaction.party}`)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Account: {transaction.account?.name} • Category: {transaction.category?.name}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono text-sm">
                    {formatPKR(transaction.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                  <td colSpan={2} className="py-2.5 px-4 text-right uppercase text-slate-700 tracking-wider">
                    Total Amount
                  </td>
                  <td className="py-2.5 px-4 text-right text-base font-extrabold text-slate-900 font-mono">
                    {formatPKR(transaction.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Three Signatures Block for Audit Compliance */}
          <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1.5 mx-2">
                <p className="font-bold text-slate-800">Prepared By</p>
                <p className="text-[10px] text-slate-400">Finance Executive</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 mx-2">
                <p className="font-bold text-slate-800">Verified By</p>
                <p className="text-[10px] text-slate-400">Internal Audit</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1.5 mx-2">
                <p className="font-bold text-slate-800">Authorized / Received By</p>
                <p className="text-[10px] text-slate-400">Director / Payee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
