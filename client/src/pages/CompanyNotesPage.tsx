import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Edit2,
  Trash2,
  RefreshCw,
  TrendingUp,
  LayoutGrid,
  List
} from 'lucide-react';
import { api, formatPKR } from '../services/api';
import { CompanyNote, CompanyNotesSummary, DemandPriority, DemandStatus } from '../types';
import { useFilters } from '../context/FilterContext';
import { CompanyNoteModal } from '../components/modals/CompanyNoteModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const CompanyNotesPage: React.FC = () => {
  const { selectedCompanyId, companies } = useFilters();

  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [summary, setSummary] = useState<CompanyNotesSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<CompanyNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch summary (Grand total + 3 companies breakdown)
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/company-notes/summary', {
        params: { companyId: selectedCompanyId }
      });
      if (res.data?.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching notes summary:', err);
    }
  }, [selectedCompanyId]);

  // Fetch list of notes
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/company-notes', {
        params: {
          companyId: selectedCompanyId,
          status: statusFilter,
          priority: priorityFilter,
          search: search.trim() || undefined
        }
      });
      if (res.data?.success) {
        setNotes(res.data.notes);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, statusFilter, priorityFilter, search]);

  useEffect(() => {
    fetchSummary();
    fetchNotes();
  }, [fetchSummary, fetchNotes]);

  // Handle Note Save (Create or Update)
  const handleSaveNote = async (data: any) => {
    if (editingNote) {
      await api.put(`/company-notes/${editingNote.id}`, data);
    } else {
      await api.post('/company-notes', data);
    }
    fetchSummary();
    fetchNotes();
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (id: string, newStatus: DemandStatus) => {
    try {
      await api.patch(`/company-notes/${id}/status`, { status: newStatus });
      fetchSummary();
      fetchNotes();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/company-notes/${deleteId}`);
      setDeleteId(null);
      fetchSummary();
      fetchNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Priority Styling helper
  const getPriorityBadge = (p: DemandPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">🚨 URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">🔥 HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">⚡ MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">🟢 LOW</span>;
    }
  };

  // Status Styling helper
  const getStatusBadge = (s: DemandStatus) => {
    switch (s) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center space-x-1"><Clock className="w-2.5 h-2.5" /><span>Pending</span></span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 flex items-center space-x-1"><RefreshCw className="w-2.5 h-2.5" /><span>In Progress</span></span>;
      case 'FULFILLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1"><CheckCircle2 className="w-2.5 h-2.5" /><span>Fulfilled</span></span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Cancelled</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Company Notes & Demands</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {notes.length} Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track company-wise budget requirements, multi-line marketing demands, and fund requests.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingNote(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Requirement Note</span>
        </button>
      </div>

      {/* TOP OVERVIEW CARDS: Grand Total + 3 Companies Individual Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Grand Total All Requirements (Vibrant Dark Blue with Crisp White Text) */}
        <div
          className="rounded-2xl p-5 text-white bg-blue-600 shadow-sm flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Grand Total Required</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-xs">
              {formatPKR(summary?.grandTotalPending || 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-blue-100 font-medium">
              <span>All 3 Companies</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-semibold text-[10px] text-white">
                {summary?.counts?.PENDING?.count || 0} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Company Breakdown Cards (All 3 companies) */}
        {summary?.companyBreakdowns?.map((cb) => (
          <div key={cb.companyId} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]" title={cb.companyName}>
                {cb.companyName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
                {cb.companyCode}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {formatPKR(cb.pendingTotal)}
              </div>
              <div className="mt-1 text-xs text-slate-400 font-medium flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Pending Requirement</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-2.5 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by purpose, item (e.g. Meta Ads), or notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Status Filter */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-2.5 pr-7 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
              >
                <option value="all">Status: All</option>
                <option value="PENDING">⏳ Pending Only</option>
                <option value="IN_PROGRESS">⚙️ In Progress</option>
                <option value="FULFILLED">✅ Fulfilled</option>
                <option value="CANCELLED">❌ Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="relative flex items-center">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="pl-2.5 pr-7 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
              >
                <option value="all">Priority: All</option>
                <option value="URGENT">🚨 Urgent</option>
                <option value="HIGH">🔥 High</option>
                <option value="MEDIUM">⚡ Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid / Sticky Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Detailed Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading company requirements...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
            📝
          </div>
          <h3 className="text-base font-bold text-slate-800">No Company Requirements Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a requirement note to list itemized expenses needed for any of the 3 companies.
          </p>
          <button
            onClick={() => {
              setEditingNote(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS / STICKY VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map((n) => {
            const isFulfilled = n.status === 'FULFILLED';
            return (
              <div
                key={n.id}
                className={`rounded-2xl border bg-white p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                  isFulfilled ? 'border-emerald-200/80 bg-emerald-50/20' : 'border-slate-200/90 shadow-2xs'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate" title={n.company.name}>
                        {n.company.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {n.company.code}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {getPriorityBadge(n.priority)}
                      {getStatusBadge(n.status)}
                    </div>
                  </div>

                  {/* Title & Purpose */}
                  <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                    {n.title}
                  </h3>

                  {n.dueDate && (
                    <div className="mt-1.5 flex items-center space-x-1 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Needed by: {new Date(n.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Line Items Breakdown Table */}
                  <div className="mt-3.5 bg-slate-50/90 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex justify-between">
                      <span>Item Breakdown</span>
                      <span>Amount</span>
                    </div>
                    {n.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100/80 last:border-b-0">
                        <span className="text-slate-700 font-semibold truncate pr-2" title={it.itemName}>
                          {it.itemName}
                        </span>
                        <span className="text-slate-900 font-bold shrink-0">
                          {formatPKR(it.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Notes / Remarks if any */}
                  {n.notes && (
                    <p className="mt-2.5 text-xs text-slate-500 italic line-clamp-2" title={n.notes}>
                      "{n.notes}"
                    </p>
                  )}
                </div>

                {/* Card Footer: Total & Actions */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Requirement</div>
                    <div className="text-lg font-bold text-blue-700 tabular-nums">
                      {formatPKR(n.totalAmount)}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Mark as Fulfilled / Pending Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(n.id, isFulfilled ? 'PENDING' : 'FULFILLED')}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isFulfilled
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title={isFulfilled ? 'Re-open as Pending' : 'Mark as Fulfilled (Fund Provided)'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNote(n);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Requirement Note"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteId(n.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Requirement Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Requirement Title</th>
                  <th className="px-4 py-3">Items Breakdown</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {notes.map((n) => {
                  const isFulfilled = n.status === 'FULFILLED';
                  return (
                    <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">
                        {n.company.name}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {n.title}
                        {n.dueDate && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Due: {new Date(n.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {n.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                              <span className="font-semibold">{it.itemName}:</span>
                              <span className="ml-1 text-slate-900 font-bold">{formatPKR(it.amount)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getPriorityBadge(n.priority)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(n.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-blue-700">
                        {formatPKR(n.totalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(n.id, isFulfilled ? 'PENDING' : 'FULFILLED')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isFulfilled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600'
                            }`}
                            title={isFulfilled ? 'Re-open as Pending' : 'Mark as Fulfilled'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNote(n);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(n.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note Create / Edit Modal */}
      <CompanyNoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={handleSaveNote}
        companies={companies}
        noteToEdit={editingNote}
        defaultCompanyId={selectedCompanyId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Requirement Note"
        message="Are you sure you want to permanently delete this requirement note and all its itemized records? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
