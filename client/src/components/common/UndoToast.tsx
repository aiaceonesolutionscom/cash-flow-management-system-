import React, { useEffect, useState } from 'react';
import { RotateCcw, X, CheckCircle2 } from 'lucide-react';

export interface UndoToastProps {
  isOpen: boolean;
  message: string;
  onUndo: () => void;
  onClose: () => void;
  durationMs?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  isOpen,
  message,
  onUndo,
  onClose,
  durationMs = 8000
}) => {
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    const intervalTime = 100;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return Math.max(prev - step, 0);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, durationMs, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-200 font-medium truncate">
              {message}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Undo Action Button */}
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-xs shadow-blue-500/30"
            >
              <RotateCcw className="w-3.5 h-3.5 animate-spin-reverse" />
              <span>UNDO</span>
            </button>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className="h-full bg-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
