import React from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  fileName?: string;
  fileUrl?: string;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  title = 'Proof / Receipt Slip',
  fileName,
  fileUrl
}) => {
  if (!isOpen || !fileUrl) return null;

  const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || (fileName && fileName.toLowerCase().endsWith('.pdf'));
  const fullUrl = fileUrl.startsWith('http') ? fileUrl : fileUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0 truncate">
              <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
              {fileName && <p className="text-[11px] text-slate-400 truncate">{fileName}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 text-xs font-medium flex items-center space-x-1 transition-all"
              title="Open full in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open</span>
            </a>
            <a
              href={fullUrl}
              download={fileName || 'attachment'}
              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 text-xs font-medium flex items-center space-x-1 transition-all"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-900/5 p-2 sm:p-4 flex items-center justify-center overflow-auto min-h-[300px]">
          {isPdf ? (
            <iframe
              src={fullUrl}
              title={fileName || 'PDF Document'}
              className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="relative max-h-[75vh] flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-2 shadow-inner border border-slate-200">
              <img
                src={fullUrl}
                alt={fileName || 'Receipt Slip'}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
