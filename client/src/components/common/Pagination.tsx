import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50]
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= itemsPerPage)) {
    if (!totalItems || totalItems === 0) return null;
  }

  const startItem = totalItems !== undefined ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems !== undefined ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  // Generate visible page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600 select-none">
      {/* Left: Summary and Page Size Selector */}
      <div className="flex items-center justify-between sm:justify-start space-x-3">
        {totalItems !== undefined && (
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">{totalItems === 0 ? 0 : startItem}</span> to{' '}
            <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalItems}</span> records
          </div>
        )}

        {onItemsPerPageChange && (
          <div className="flex items-center space-x-1.5 pl-2 sm:border-l sm:border-slate-200">
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="py-1 px-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center sm:justify-end space-x-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First Page"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Prev Page */}
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            title="Previous Page"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center space-x-1 px-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold">
                    ...
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages}
            title="Next Page"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last Page"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
