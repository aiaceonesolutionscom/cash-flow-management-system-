import React, { useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentId?: string;
  originalName?: string;
  mimeType?: string;
  title?: string;
  amount?: string;
  party?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  attachmentId,
  originalName = 'Receipt',
  mimeType = 'image/jpeg',
  title = 'Receipt Attachment',
  amount,
  party
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !attachmentId) return null;

  const token = localStorage.getItem('cashflow_token');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const viewUrl = `/api/attachments/${attachmentId}/view${tokenParam}`;
  const downloadUrl = `/api/attachments/${attachmentId}/download${tokenParam}`;
  const isPdf = mimeType.includes('pdf') || originalName.toLowerCase().endsWith('.pdf');

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {party && <span>{party} • </span>}
                {amount && <span className="font-semibold text-slate-700">PKR {amount} • </span>}
                <span>{originalName}</span>
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-1.5 shrink-0 pl-2">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
              </>
            )}

            <a
              href={downloadUrl}
              download={originalName}
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>

            <a
              href={viewUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer ml-1"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-900/5 p-4 overflow-auto flex items-center justify-center min-h-[300px] select-none">
          {isPdf ? (
            <iframe
              src={viewUrl}
              title="PDF Receipt"
              className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="overflow-auto max-h-[68vh] flex items-center justify-center">
              <img
                src={viewUrl}
                alt={originalName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out'
                }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md cursor-grab active:cursor-grabbing"
              />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div>Stored securely as raw bytes in PostgreSQL database</div>
          {!isPdf && (
            <button
              type="button"
              onClick={handleReset}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Reset View ({Math.round(zoom * 100)}%)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
