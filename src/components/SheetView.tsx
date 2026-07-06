'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  RefreshCw, AlertCircle, CheckCircle2, HelpCircle, 
  Search, ExternalLink, Loader2, FileText, Video, FileDown,
  FilterX, ArrowLeft, Database, Clock, XCircle, LogOut,
  ChevronDown, Check, Shield
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// Status Dropdown — The interactive replacement for StatusBadge
// ═══════════════════════════════════════════════════════════════════
function StatusDropdown({ 
  entryId, 
  currentStatus, 
  onStatusChange 
}: { 
  entryId: string; 
  currentStatus: string; 
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options = [
    { value: 'ok', label: 'OK / Approved', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', hoverBg: 'hover:bg-emerald-50' },
    { value: 'pending', label: 'Pending', icon: Clock, color: 'text-brand-sunrise', bg: 'bg-brand-sunrise-light', border: 'border-brand-sunrise/30', hoverBg: 'hover:bg-brand-sunrise-light' },
    { value: 'error', label: 'Fix Needed', icon: AlertCircle, color: 'text-brand-coral', bg: 'bg-brand-coral-light', border: 'border-brand-coral/30', hoverBg: 'hover:bg-brand-coral-light' },
  ];

  const current = options.find(o => o.value === currentStatus) || options[1];

  const handleSelect = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }
    
    setSaving(true);
    setIsOpen(false);

    try {
      const res = await fetch(`/api/entries/${entryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (data.success) {
        onStatusChange(entryId, newStatus);
      } else {
        alert('Failed to update status: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-hover ${current.bg} ${current.color} ${current.border} hover:shadow-sm disabled:opacity-60`}
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <current.icon className="w-3.5 h-3.5" />
        )}
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white rounded-xl shadow-lg border border-ink-muted/15 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-ink-muted/10">
            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Set Status</p>
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm font-semibold transition-colors ${opt.hoverBg} ${opt.value === currentStatus ? opt.bg : ''}`}
            >
              <opt.icon className={`w-4 h-4 ${opt.color}`} />
              <span className="text-ink">{opt.label}</span>
              {opt.value === currentStatus && (
                <Check className="w-4 h-4 text-brand-indigo ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// User Menu — Shows current user and sign out button
// ═══════════════════════════════════════════════════════════════════
function UserMenu({ role }: { role: string }) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const isAdmin = role === 'admin';

  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <p className="text-sm font-bold text-white leading-tight">{session.user.name}</p>
        <div className="flex items-center justify-end gap-2 mt-0.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
            {isAdmin ? <Shield className="w-2.5 h-2.5" /> : null}
            {role}
          </span>
        </div>
      </div>
      {session.user.image && (
        <img 
          src={session.user.image} 
          alt={session.user.name || ''} 
          className="w-10 h-10 rounded-full ring-2 ring-white/30"
        />
      )}
      {isAdmin && (
        <Link
          href="/admin"
          className="p-2.5 text-brand-indigo-light/60 hover:text-white hover:bg-white/10 rounded-xl transition-hover"
          title="Admin Panel"
        >
          <Shield className="w-5 h-5" />
        </Link>
      )}
      <button
        onClick={() => signOut()}
        className="p-2.5 text-brand-indigo-light/60 hover:text-white hover:bg-white/10 rounded-xl transition-hover"
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main SheetView Component
// ═══════════════════════════════════════════════════════════════════
export default function SheetView({ sheetId }: { sheetId: string }) {
  const [userRole, setUserRole] = useState('viewer');
  const isAdmin = userRole === 'admin';

  const [entries, setEntries] = useState<any[]>([]);
  const [sheetTracker, setSheetTracker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Fetch user role from /api/me (runs in Node.js, not Edge)
  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(data => {
      if (data.success) setUserRole(data.data.role);
    }).catch(() => {});
    
    // Track that the user viewed a section
    fetch('/api/users/track-view', { method: 'POST' }).catch(() => {});
  }, []);
  
  // Filters state
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [searchClassId, setSearchClassId] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const [entriesRes, sheetsRes] = await Promise.all([
        fetch(`/api/entries?sheet_id=${sheetId}`),
        fetch('/api/sheets')
      ]);
      
      const entriesData = await entriesRes.json();
      const sheetsData = await sheetsRes.json();
      
      if (entriesData.success) {
        setEntries(entriesData.data);
      }
      
      if (sheetsData.success) {
        const currentSheet = sheetsData.data.find((s: any) => s.sheet_id === sheetId);
        setSheetTracker(currentSheet);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [sheetId]);

  const handleSync = async () => {
    if (!sheetTracker?.url) return;
    
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [sheetTracker.url] })
      });
      const data = await res.json();
      if (data.success) {
        fetchEntries(); 
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Optimistic status update — instant UI feedback without page reload
  const handleStatusChange = (entryId: string, newStatus: string) => {
    setEntries(prev => prev.map(e => 
      e._id === entryId ? { ...e, status: newStatus, status_override: true } : e
    ));
  };

  const clearFilters = () => {
    setSearchClassId('');
    setFilterSubject('');
    setFilterTeacher('');
    setFilterBatch('');
    setFilterStatus('');
    setShowErrorsOnly(false);
  };

  const uniqueSubjects = useMemo(() => Array.from(new Set(entries.map(e => e.subject).filter(Boolean))), [entries]);
  const uniqueTeachers = useMemo(() => Array.from(new Set(entries.map(e => e.teacher).filter(Boolean))), [entries]);
  const uniqueBatches = useMemo(() => Array.from(new Set(entries.map(e => e.batch).filter(Boolean))), [entries]);

  // Status counts for the status bar
  const statusCounts = useMemo(() => {
    const ok = entries.filter(e => e.status === 'ok').length;
    const pending = entries.filter(e => e.status === 'pending').length;
    const issues = entries.filter(e => e.status === 'error').length;
    const notChecked = entries.filter(e => !e.status || e.status === 'not_checked').length;
    const duplicates = entries.filter(e => e.duplicate).length;
    return { ok, pending, issues, notChecked, duplicates, total: entries.length };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (showErrorsOnly && e.status !== 'error') return false;
      if (searchClassId && !e.class_id?.toLowerCase().includes(searchClassId.toLowerCase())) return false;
      if (filterSubject && e.subject !== filterSubject) return false;
      if (filterTeacher && e.teacher !== filterTeacher) return false;
      if (filterBatch && e.batch !== filterBatch) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      return true;
    });
  }, [entries, showErrorsOnly, searchClassId, filterSubject, filterTeacher, filterBatch, filterStatus]);

  // Helper to render a clickable link or a "missing" indicator
  const LinkCell = ({ url, type }: { url: string; type: 'video' | 'pdf' }) => {
    const isValid = url && (url.startsWith('http://') || url.startsWith('https://'));
    const Icon = type === 'video' ? Video : FileDown;
    
    if (isValid) {
      return (
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer" 
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-indigo-light text-brand-indigo hover:bg-brand-indigo hover:text-white font-bold text-xs transition-hover group"
          title={url}
        >
          <Icon className="w-4 h-4" />
          Open
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        </a>
      );
    }
    
    if (url) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-sunrise-light text-brand-sunrise text-xs font-bold">
          <Clock className="w-3.5 h-3.5" />
          Pending
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-coral-light text-brand-coral text-xs font-bold">
        <XCircle className="w-3.5 h-3.5" />
        Missing
      </span>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 transition-page font-sans">
      {/* Header */}
      <header className="glass-header rounded-[20px] p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-indigo-light/70 hover:text-white mb-5 transition-hover outline-none focus-visible:ring-2 focus-visible:ring-brand-magenta rounded-lg px-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {sheetTracker ? sheetTracker.title : 'Loading Sheet...'}
          </h1>
          {sheetTracker && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              {isAdmin && (
                <>
                  <a href={sheetTracker.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-magenta-light hover:text-white transition-hover">
                    <ExternalLink className="w-4 h-4" />
                    Open Source Google Sheet
                  </a>
                  <span className="text-brand-indigo-dark hidden sm:inline">|</span>
                </>
              )}
              <span className="text-sm font-medium text-brand-indigo-light/80">
                Last synced: {new Date(sheetTracker.last_synced).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        
        {/* Right side: User Menu + Sync */}
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <UserMenu role={userRole} />
          {isAdmin && (
            <button 
              onClick={handleSync} 
              disabled={syncing || !sheetTracker}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-magenta hover:bg-brand-magenta-dark text-white rounded-xl font-bold transition-hover shadow-ambient disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap h-[48px]"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              {syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════ STATUS BAR ═══════════════ */}
      <div className="glass-panel rounded-2xl overflow-hidden p-0 border border-white/60">
        {/* Progress bar */}
        <div className="h-2 flex w-full">
          {statusCounts.total > 0 && (
            <>
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(statusCounts.ok / statusCounts.total) * 100}%` }} />
              <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(statusCounts.pending / statusCounts.total) * 100}%` }} />
              <div className="bg-red-500 transition-all duration-500" style={{ width: `${(statusCounts.issues / statusCounts.total) * 100}%` }} />
              <div className="bg-gray-300 transition-all duration-500" style={{ width: `${(statusCounts.notChecked / statusCounts.total) * 100}%` }} />
            </>
          )}
        </div>
        
        {/* Status counts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-ink-muted/10">
          {[
            { label: 'Total Classes', value: statusCounts.total, icon: Database, color: 'text-brand-indigo', bg: 'bg-white/40' },
            { label: 'Approved', value: statusCounts.ok, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
            { label: 'Pending', value: statusCounts.pending, icon: Clock, color: 'text-brand-sunrise-dark', bg: 'bg-brand-sunrise-light/50' },
            { label: 'Fix Needed', value: statusCounts.issues, icon: AlertCircle, color: 'text-brand-coral', bg: 'bg-brand-coral-light/50' },
            { label: 'Duplicates', value: statusCounts.duplicates, icon: FileText, color: 'text-brand-sunrise-dark', bg: 'bg-brand-sunrise-light/50' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-5">
              <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-ink mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Area */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input 
                type="text" 
                placeholder="Search Class ID..."
                className="w-full glass-input rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-indigo outline-none transition-hover placeholder:text-ink-muted"
                value={searchClassId}
                onChange={e => setSearchClassId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={showErrorsOnly}
                  onChange={(e) => setShowErrorsOnly(e.target.checked)}
                />
                <div className={`w-12 h-7 rounded-full transition-colors ${showErrorsOnly ? 'bg-brand-coral' : 'bg-ink-muted/30'}`}></div>
                <div className={`absolute w-5 h-5 bg-white rounded-full transition-transform top-1 left-1 shadow-sm ${showErrorsOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-sm font-bold text-ink-secondary group-hover:text-ink transition-colors">
                Show Only Issues
              </span>
            </label>
            
            <button onClick={clearFilters} className="p-2.5 text-ink-muted hover:text-brand-magenta hover:bg-brand-magenta-light rounded-xl transition-hover" title="Clear Filters">
              <FilterX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: filterSubject, setter: setFilterSubject, defaultText: 'All Subjects', options: uniqueSubjects },
            { value: filterTeacher, setter: setFilterTeacher, defaultText: 'All Teachers', options: uniqueTeachers },
            { value: filterBatch, setter: setFilterBatch, defaultText: 'All Batches', options: uniqueBatches },
          ].map((selectProps, i) => (
             <select key={i} className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand-indigo transition-hover cursor-pointer" value={selectProps.value} onChange={e => selectProps.setter(e.target.value)}>
               <option value="">{selectProps.defaultText}</option>
               {selectProps.options.map(o => <option key={o} value={o}>{o}</option>)}
             </select>
          ))}
          <select className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand-indigo transition-hover cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ok">OK / Approved</option>
            <option value="error">Fix Needed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-table flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-secondary">
            <thead className="glass-table-header text-xs uppercase font-bold text-ink tracking-wider">
              <tr>
                <th className="px-5 py-5">Date</th>
                <th className="px-5 py-5">Subject</th>
                <th className="px-5 py-5">Chapter/Topic</th>
                <th className="px-5 py-5">Teacher</th>
                <th className="px-5 py-5">Class ID</th>
                <th className="px-5 py-5 text-center">Video</th>
                <th className="px-5 py-5 text-center">PDF</th>
                <th className="px-5 py-5">Uploader</th>
                <th className="px-5 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-muted/10">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-ink-muted">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-indigo" />
                    <span className="font-semibold text-base">Loading class data...</span>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-ink-muted font-semibold text-base">
                    No classes found. Try syncing or adjusting your filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => (
                  <tr key={entry._id || idx} className="glass-table-row">
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-ink">
                      {entry.date || '-'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-semibold font-bangla text-ink">
                      {entry.subject || '-'}
                    </td>
                    <td className="px-5 py-4 max-w-[280px] font-medium font-bangla" title={entry.chapter}>
                      <span className="line-clamp-2">{entry.chapter || '-'}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium font-bangla">{entry.teacher || '-'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-brand-indigo bg-brand-indigo-light px-2.5 py-1.5 rounded-lg">
                        {entry.class_id}
                      </span>
                      {entry.duplicate && <span className="ml-2 inline-flex px-2 py-0.5 rounded-md text-[10px] font-black bg-brand-sunrise-light text-brand-sunrise">DUP</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <LinkCell url={entry.video_link} type="video" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <LinkCell url={entry.pdf_link} type="pdf" />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-ink-secondary">
                      {entry.uploader || '-'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusDropdown
                        entryId={entry._id}
                        currentStatus={entry.status}
                        onStatusChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-white/50 bg-white/40 text-sm font-bold text-ink-secondary flex justify-between items-center">
          <span>Showing {filteredEntries.length} of {entries.length} entries</span>
          {filteredEntries.length !== entries.length && (
            <button onClick={clearFilters} className="text-brand-magenta hover:text-brand-magenta-dark text-xs font-bold transition-hover">
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
