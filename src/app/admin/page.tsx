'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, Shield, ShieldCheck, Eye, Users, Clock, 
  Loader2, Crown, RefreshCw
} from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(data => {
      if (data.success) {
        setRole(data.data.role);
        if (data.data.role === 'admin') fetchUsers();
      } else {
        setRole('viewer');
      }
    }).catch(() => setRole('viewer'));
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-4">
        <div className="bg-white rounded-2xl shadow-ambient p-8 text-center max-w-md space-y-4">
          <Shield className="w-12 h-12 text-brand-coral mx-auto" />
          <h1 className="text-xl font-bold text-ink">Admin Access Required</h1>
          <p className="text-sm text-ink-secondary">You don't have permission to view this page.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-indigo text-white rounded-xl font-bold text-sm transition-hover hover:bg-brand-indigo-dark">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* Header */}
      <header className="bg-brand-indigo rounded-[20px] p-6 md:p-8 shadow-ambient">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-indigo-light/70 hover:text-white mb-5 transition-hover">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8" />
          Admin Panel
        </h1>
        <p className="text-sm text-brand-indigo-light/80 mt-2">
          Manage user roles and view login activity. Only <strong>@shikho.com</strong> accounts can access the app.
        </p>
      </header>

      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-ambient overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-ink-muted/10">
          {[
            { label: 'Total Users', value: users.length, icon: Users, color: 'text-brand-indigo', bg: 'bg-brand-indigo-light' },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Viewers', value: users.filter(u => u.role === 'viewer').length, icon: Eye, color: 'text-brand-sunrise', bg: 'bg-brand-sunrise-light' },
            { label: 'Active Today', value: users.filter(u => { const d = new Date(u.last_login); const now = new Date(); return d.toDateString() === now.toDateString(); }).length, icon: Clock, color: 'text-brand-magenta', bg: 'bg-brand-magenta-light' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-5">
              <div className={`p-3 rounded-xl ${stat.bg} shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-ink">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-[20px] shadow-ambient overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-muted/10 flex items-center justify-between">
          <h2 className="font-bold text-ink text-lg">All Users</h2>
          <button onClick={fetchUsers} className="p-2 text-ink-muted hover:text-brand-indigo rounded-xl transition-hover">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-ink-muted/10 text-xs uppercase font-bold text-ink tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Role</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-center">Logins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-muted/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-indigo" />
                  </td>
                </tr>
              ) : users.map((user) => {
                const isPrimary = user.email === 'aminul.robin@shikho.com';
                return (
                  <tr key={user._id} className="hover:bg-brand-indigo-light/30 transition-hover">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-9 h-9 rounded-full ring-2 ring-ink-muted/10" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-indigo-light flex items-center justify-center text-brand-indigo font-bold text-sm">
                            {(user.name || user.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-ink text-sm">{user.name || '—'}</p>
                          {isPrimary && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-brand-sunrise uppercase">
                              <Crown className="w-3 h-3" /> Primary Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-ink-secondary font-medium text-sm">{user.email}</td>
                    <td className="px-6 py-4 text-center">
                      {isPrimary ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={updating === user._id}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer outline-none transition-hover ${
                            user.role === 'admin' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-brand-indigo-light text-brand-indigo border-brand-indigo/20'
                          } ${updating === user._id ? 'opacity-50' : ''}`}
                        >
                          <option value="admin">🛡️ Admin</option>
                          <option value="viewer">👁️ Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-ink-secondary text-sm font-medium">
                      {new Date(user.last_login).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-ink">{user.login_count}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
