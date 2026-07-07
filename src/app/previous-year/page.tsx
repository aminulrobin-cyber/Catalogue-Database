'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { 
  Archive, Loader2, FileSpreadsheet, 
  Shield, LogOut, Eye, Clock, Key, ArrowLeft
} from 'lucide-react';
import { 
  DndContext, closestCenter, KeyboardSensor, 
  PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  rectSortingStrategy 
} from '@dnd-kit/sortable';
import ThemeToggle from '@/components/ThemeToggle';
import SortableSheetCard from '@/components/SortableSheetCard';

export default function PreviousYearPage() {
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [sheetOrder, setSheetOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (sheets.length > 0) {
      const stored = localStorage.getItem('sheetOrderArchived');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const validOrder = parsed.filter((id: string) => sheets.some(s => s._id === id));
          const newSheets = sheets.filter(s => !parsed.includes(s._id)).map(s => s._id);
          setSheetOrder([...validOrder, ...newSheets]);
        } catch (e) {
          setSheetOrder(sheets.map(s => s._id));
        }
      } else {
        setSheetOrder(sheets.map(s => s._id));
      }
    }
  }, [sheets]);

  const sortedSheets = React.useMemo(() => {
    const activeSheets = sheets.filter(s => s.is_previous_year);
    if (!sheetOrder.length || activeSheets.length === 0) return activeSheets;
    const map = new Map(activeSheets.map(s => [s._id, s]));
    return sheetOrder.map(id => map.get(id)).filter(Boolean);
  }, [sheets, sheetOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sheetOrder.indexOf(active.id);
      const newIndex = sheetOrder.indexOf(over.id);
      const newOrder = arrayMove(sheetOrder, oldIndex, newIndex);
      setSheetOrder(newOrder);
      localStorage.setItem('sheetOrderArchived', JSON.stringify(newOrder));
    }
  };

  const handleArchiveToggle = async (sheetId: string, is_previous_year: boolean) => {
    try {
      const res = await fetch(`/api/sheets/${sheetId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_previous_year })
      });
      const data = await res.json();
      if (data.success) {
        setSheets(sheets.map(s => s.sheet_id === sheetId ? { ...s, is_previous_year } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestAdmin = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/users/request-admin', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchProfile();
      }
    } finally {
      setRequesting(false);
    }
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 transition-page">
      {/* User Profile Bar */}
      {userProfile && (
        <div className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {userProfile.image ? (
              <img src={userProfile.image} alt="" className="w-12 h-12 rounded-full ring-2 ring-brand-indigo/20" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brand-indigo-light flex items-center justify-center text-brand-indigo font-bold text-lg">
                {userProfile.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-bold text-ink dark:text-white text-lg leading-tight">{userProfile.name}</h2>
              <p className="text-sm text-ink-secondary dark:text-white/70">{userProfile.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isAdmin ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-brand-indigo-light text-brand-indigo border border-brand-indigo/20'}`}>
                  {isAdmin ? <Shield className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                  {userProfile.role}
                </span>
                <span className="text-xs font-medium text-ink-muted dark:text-white/50">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-indigo-light dark:bg-[#111] hover:bg-brand-indigo dark:hover:bg-white text-brand-indigo dark:text-white hover:text-white dark:hover:text-black text-xs font-bold rounded-xl border border-brand-indigo/20 dark:border-white/20 transition-hover disabled:opacity-50"
                >
                  <Key className="w-4 h-4" /> Request Admin Access
                </button>
              )
            )}
            {isAdmin && (
              <Link href="/admin" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-[#111] hover:bg-emerald-600 dark:hover:bg-white text-emerald-700 dark:text-white hover:text-white dark:hover:text-black text-xs font-bold rounded-xl border border-emerald-200 dark:border-white/20 transition-hover">
                <Shield className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            <ThemeToggle />
            <button onClick={() => signOut()} className="p-2 text-ink-muted dark:text-white/80 hover:text-brand-coral bg-white/30 dark:bg-[#111] backdrop-blur-sm rounded-xl transition-hover border border-white/40 dark:border-white/20" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Area using 70% Indigo influence */}
      <header className="glass-header rounded-2xl p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Archive className="w-8 h-8 text-brand-magenta-light" />
            Previous Year Resources
          </h1>
          <p className="mt-2 text-brand-indigo-light/90 font-medium">
            Archived classes and resources from previous years.
          </p>
        </div>
      </header>

      {/* Sheets Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-ink dark:text-white">Archived Sheets</h2>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-indigo dark:text-white/70 hover:text-brand-magenta dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-ink-muted dark:text-white/60">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand-indigo dark:text-brand-indigo-light" />
            <p className="font-medium">Loading your archived sheets...</p>
          </div>
        ) : sortedSheets.length === 0 ? (
          <div className="py-20 glass-panel rounded-2xl flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 bg-white/50 dark:bg-[#111] backdrop-blur-sm rounded-full flex items-center justify-center mb-5 border border-white/60 dark:border-white/20">
              <Archive className="w-10 h-10 text-brand-indigo dark:text-brand-indigo-light" />
            </div>
            <h3 className="text-xl font-bold text-ink dark:text-white mb-2">No Archived Sheets</h3>
            <p className="text-ink-secondary dark:text-white/70 font-medium max-w-md">
              You haven't moved any sheets to the previous year resources yet.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="dark:chromatic-wrapper">
              <SortableContext items={sheetOrder} strategy={rectSortingStrategy}>
                <div className="dark:chromatic-content grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 dark:p-6">
                  {sortedSheets.map((sheet: any) => (
                    <SortableSheetCard key={sheet._id} sheet={sheet} onArchiveToggle={handleArchiveToggle} />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}
