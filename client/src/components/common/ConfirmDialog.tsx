import React from 'react';
import { AlertTriangle, Info, Trash2, X, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 focus:ring-rose-500',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/20 focus:ring-amber-500',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
          icon: <Info className="w-6 h-6 text-blue-600" />,
          buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 focus:ring-blue-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={isLoading ? undefined : onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-4">
          {/* Icon Badge */}
          <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${styles.buttonBg}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
