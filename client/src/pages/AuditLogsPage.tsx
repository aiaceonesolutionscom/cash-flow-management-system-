import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Download,
  Trash2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog, AuditAction } from '../types';
import { format } from 'date-fns';

interface SystemErrorEntry {
  timestamp: string;
  level: string;
  message: string;
  error?: {
    message: string;
    stack?: string;
  };
  request?: {
    method?: string;
    url?: string;
    ip?: string;
    userId?: string;
    params?: any;
    query?: any;
    body?: any;
  };
}

interface LogStats {
  errorLogSize: string;
  appLogSize: string;
  lastErrorTime: string | null;
}

export const AuditLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'errors'>('audit');

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [_totalCount, setTotalCount] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(true);

  // System Error Logs State
  const [errorLogs, setErrorLogs] = useState<SystemErrorEntry[]>([]);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [isLoadingErrors, setIsLoadingErrors] = useState<boolean>(false);
  const [expandedErrorIdx, setExpandedErrorIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setIsLoadingAudit(true);
      const params: any = {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity: entitySearch || undefined,
        limit: 100
      };
      const res = await api.get('/audit-logs', { params });
      if (res.data.success) {
        setLogs(res.data.logs);
        setTotalCount(res.data.meta.totalCount);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Fetch System Error Logs
  const fetchSystemErrorLogs = async () => {
    try {
      setIsLoadingErrors(true);
      const res = await api.get('/system-logs');
      if (res.data.success) {
        setErrorLogs(res.data.logs || []);
        setLogStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to load system error logs', err);
    } finally {
      setIsLoadingErrors(false);
    }
  };

  // Clear Error Logs
  const handleClearErrorLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all system error logs?')) return;
    try {
      setIsClearing(true);
      const res = await api.post('/system-logs/clear');
      if (res.data.success) {
        setErrorLogs([]);
        if (logStats) setLogStats({ ...logStats, errorLogSize: '0.00 KB' });
      }
    } catch (err) {
      console.error('Failed to clear error logs', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Download Error Logs
  const handleDownloadLogs = async () => {
    try {
      const res = await api.get('/system-logs/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cashflow-error-${new Date().toISOString().split('T')[0]}.log`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Failed to download log file', err);
      alert('Log file is empty or cannot be downloaded right now.');
    }
  };

  // Copy Stack Trace
  const handleCopyTrace = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else {
      fetchSystemErrorLogs();
    }
  }, [activeTab, actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">CREATE</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">UPDATE</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">DELETE</span>;
      case 'TRANSFER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">TRANSFER</span>;
      case 'BALANCE_ADJUST':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">BALANCE ADJUST</span>;
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              {activeTab === 'audit' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Terminal className="w-5 h-5 text-rose-600" />
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'audit' ? 'System Audit Trail' : 'Application Error Logs'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'audit'
              ? 'Immutable record of financial transactions, creations, edits, and deletions.'
              : 'Detailed server diagnostics, runtime exceptions, and stack traces saved in logs/error.log.'}
          </p>
        </div>

        {/* Tab Switching Buttons */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Activity Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'errors'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Server Error Logs</span>
            {errorLogs.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-extrabold rounded-full">
                {errorLogs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <form onSubmit={handleSearch} className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="Search by entity name (e.g. Transaction, CompanyFund, Account)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </form>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="BALANCE_ADJUST">BALANCE ADJUST</option>
              </select>

              <button
                onClick={fetchAuditLogs}
                className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
                title="Refresh Audit Logs"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoadingAudit ? (
              <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading audit log entries...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No activity audit logs found matching filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Event Details</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-sans text-xs">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{log.entity}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-md truncate">
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{log.ipAddress || 'localhost'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: SYSTEM ERROR LOGS */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {/* Diagnostics Strip & Control Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-500">Error Log Size:</span>{' '}
                <span className="font-mono font-bold text-rose-600">{logStats?.errorLogSize || '0 KB'}</span>
              </div>
              <div className="text-slate-300">•</div>
              <div>
                <span className="font-semibold text-slate-500">File:</span>{' '}
                <span className="font-mono text-slate-700 font-medium">server/logs/error.log</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={fetchSystemErrorLogs}
                disabled={isLoadingErrors}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                title="Reload Error Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingErrors ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleDownloadLogs}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                title="Download Log File"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .log</span>
              </button>

              <button
                onClick={handleClearErrorLogs}
                disabled={isClearing || errorLogs.length === 0}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Clear All Log Entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>
          </div>

          {/* Error Log Entries Feed */}
          {isLoadingErrors ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
              <span>Reading error.log entries...</span>
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <div className="text-sm font-bold text-slate-800">Clean Health — No Server Errors Logged!</div>
              <div className="text-xs text-slate-400 max-w-md mx-auto">
                No runtime exceptions or 500 errors recorded in <code className="font-mono">logs/error.log</code>. All backend controllers and APIs are operating normally.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {errorLogs.map((entry, idx) => {
                const isExpanded = expandedErrorIdx === idx;
                const stack = entry.error?.stack || '';

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-rose-200/80 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Log Card Summary Header */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50/30">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white">
                            {entry.level || 'ERROR'}
                          </span>
                          <span className="text-xs font-mono text-slate-500 font-semibold">
                            {entry.timestamp ? format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'Unknown Date'}
                          </span>
                          {entry.request?.method && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                              {entry.request.method} {entry.request.url}
                            </span>
                          )}
                          {entry.request?.ip && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              IP: {entry.request.ip}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {entry.message}
                          {entry.error?.message && entry.error.message !== entry.message && (
                            <span className="font-normal text-rose-700 ml-1.5">
                              — {entry.error.message}
                            </span>
                          )}
                        </div>
                      </div>

                      {stack && (
                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleCopyTrace(stack, idx)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Copy Stack Trace"
                          >
                            {copiedIdx === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px] text-emerald-600 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copy Stack</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedErrorIdx(isExpanded ? null : idx)}
                            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Trace' : 'View Trace'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Stack Trace & Request Parameters */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-950 text-slate-100 font-mono text-[11px] space-y-3 border-t border-slate-200">
                        {entry.request && (
                          <div className="pb-2 border-b border-slate-800 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Request Context:</div>
                            <div className="text-slate-300">
                              <span className="text-blue-400">Endpoint:</span> {entry.request.method} {entry.request.url}
                            </div>
                            {entry.request.query && Object.keys(entry.request.query).length > 0 && (
                              <div className="text-slate-300">
                                <span className="text-blue-400">Query:</span> {JSON.stringify(entry.request.query)}
                              </div>
                            )}
                            {entry.request.body && (
                              <div className="text-slate-300 truncate max-w-full">
                                <span className="text-blue-400">Body:</span> {JSON.stringify(entry.request.body)}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Stack Trace:</div>
                          <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-300 max-h-64 overflow-y-auto">
                            {stack}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
