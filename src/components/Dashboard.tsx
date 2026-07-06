'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, RefreshCw, Loader2, FileSpreadsheet, 
  ExternalLink, AlertCircle, CheckCircle2, ChevronRight,
  Shield, LogOut, Eye, Clock, Key
} from 'lucide-react';

export default function Dashboard() {
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [urlsInput, setUrlsInput] = useState('');

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sheets');
      const data = await res.json();
      if (data.success) {
        setSheets(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.success) {
        setUserProfile(data.data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchSheets();
    fetchProfile();
  }, []);

  const handleRequestAdmin = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/users/request-admin', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setUserProfile((prev: any) => ({ ...prev, admin_request: true }));
        alert('Admin access requested successfully!');
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setRequesting(false);
    }
  };

  const isAdmin = userProfile?.role === 'admin';

  const handleSync = async () => {
    if (!urlsInput.trim()) {
      alert('Please enter at least one Google Sheet URL');
      return;
    }
    
    const urls = urlsInput.split('\n').map(u => u.trim()).filter(u => u);
    
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      const data = await res.json();
      if (data.success) {
        setUrlsInput('');
        fetchSheets();
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 transition-page">
      
      {/* User Profile Bar */}
      {userProfile && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-ambient flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-ink-muted/10">
          <div className="flex items-center gap-4">
            {userProfile.image ? (
              <img src={userProfile.image} alt="" className="w-12 h-12 rounded-full ring-2 ring-brand-indigo/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-indigo-light flex items-center justify-center text-brand-indigo font-bold text-lg">
                {userProfile.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-ink text-lg leading-tight">{userProfile.name}</h2>
              <p className="text-sm text-ink-secondary">{userProfile.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-brand-indigo-light text-brand-indigo border border-brand-indigo/20'}`}>
                  {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  {userProfile.role}
                </span>
                <span className="text-xs font-medium text-ink-muted">
                  • {userProfile.login_count} logins • {userProfile.sections_viewed || 0} sections viewed
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isAdmin && (
              userProfile.admin_request ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-sunrise-light text-brand-sunrise-dark text-xs font-bold rounded-xl border border-brand-sunrise/20">
                  <Clock className="w-4 h-4" /> Pending Admin Approval
                </span>
              ) : (
                <button 
                  onClick={handleRequestAdmin}
                  disabled={requesting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-indigo-light hover:bg-brand-indigo text-brand-indigo hover:text-white text-xs font-bold rounded-xl border border-brand-indigo/20 transition-hover disabled:opacity-50"
                >
                  <Key className="w-4 h-4" /> Request Admin Access
                </button>
              )
            )}
            {isAdmin && (
              <Link href="/admin" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold rounded-xl border border-emerald-200 transition-hover">
                <Shield className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            <button onClick={() => signOut()} className="p-2 text-ink-muted hover:text-brand-coral bg-surface rounded-xl transition-hover" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Area using 70% Indigo influence */}
      <header className="bg-brand-indigo rounded-2xl p-6 md:p-10 shadow-ambient flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-brand-magenta-light" />
            Catalogue Database
          </h1>
          <p className="mt-2 text-brand-indigo-light/90 font-medium">
            Import and manage your Shikho class databases.
          </p>
        </div>
        
        {/* Sync Controls */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
            <textarea 
              placeholder="Paste Google Sheet URLs (one per line)..." 
              className="text-sm bg-white text-ink border-0 rounded-xl px-4 py-3 w-full sm:w-72 resize-none h-[48px] focus:ring-2 focus:ring-brand-magenta outline-none transition-hover placeholder:text-ink-muted shadow-ambient"
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              rows={1}
            />
            <button 
              onClick={handleSync} 
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-magenta hover:bg-brand-magenta-dark text-white rounded-xl font-semibold transition-hover shadow-ambient disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap h-[48px]"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              {syncing ? 'Importing...' : 'Import Sheets'}
            </button>
          </div>
        )}
      </header>

      {/* Sheets Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-ink">Imported Sheets</h2>
        
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-ink-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-indigo" />
            <p className="font-medium">Loading your sheets...</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="py-20 bg-surface border border-brand-indigo-light rounded-2xl flex flex-col items-center justify-center text-center px-4 shadow-ambient">
            <div className="w-20 h-20 bg-brand-indigo-light rounded-full flex items-center justify-center mb-5">
              <FileSpreadsheet className="w-10 h-10 text-brand-indigo" />
            </div>
            <h3 className="text-xl font-bold text-ink mb-2">No Sheets Imported</h3>
            <p className="text-ink-secondary font-medium max-w-md">
              Paste one or more Google Sheet URLs above and click "Import Sheets" to begin tracking your classes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheets.map((sheet) => (
              <Link key={sheet._id} href={`/sheet/${sheet.sheet_id}`} className="group block outline-none">
                <div className="bg-white border-2 border-transparent group-hover:border-brand-magenta/20 group-focus:border-brand-magenta rounded-[16px] p-6 shadow-ambient group-hover:shadow-ambient-hover transition-hover h-full flex flex-col relative overflow-hidden">
                  
                  <div className="flex items-start justify-between mb-5">
                    <div className="bg-brand-indigo-light p-3 rounded-xl">
                      <FileSpreadsheet className="w-6 h-6 text-brand-indigo" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-surface border border-brand-indigo-light px-3 py-1.5 rounded-full">
                      <span className="text-xs font-bold text-brand-indigo uppercase tracking-wider">
                        {sheet.total_entries} Classes
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-ink line-clamp-2 mb-3 group-hover:text-brand-indigo transition-hover">
                    {sheet.title}
                  </h3>
                  
                  <div className="mt-auto pt-5 flex items-center justify-between border-t border-brand-indigo-light/50">
                    <div className="flex items-center gap-2">
                      {sheet.error_count > 0 ? (
                        <div className="flex items-center gap-2 text-sm font-semibold text-brand-coral">
                          <AlertCircle className="w-5 h-5" />
                          <span>{sheet.error_count} Errors</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>All Valid</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center group-hover:bg-brand-magenta-light transition-hover">
                      <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-brand-magenta" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
