import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Users,
  AlertTriangle,
  Sliders,
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Activity,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { User, ReportItem, AdminAuditLog } from '../types';

const ADMIN_STORAGE_KEY = 'inkverse_admin_password';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'reports' | 'settings' | 'reversal' | 'logs'>('overview');

  // Master passcode authentication state
  const [adminPass, setAdminPass] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) === 'shnl2005';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Points reversal form
  const [reversalTxId, setReversalTxId] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Authenticated Admin API client helper (automatically attaches x-admin-password)
  const adminApi = useCallback(<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const currentPass = adminPass || sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
    return apiRequest<T>(endpoint, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'x-admin-password': currentPass,
      },
    });
  }, [adminPass]);

  // Handle Password Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passwordInput.trim();
    if (!cleanPass) {
      setAuthError('Please enter the admin password');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass }),
      });

      if (res.success) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, cleanPass);
        setAdminPass(cleanPass);
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        setAuthError('Incorrect password. Access denied.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Incorrect password. Access denied.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminPass('');
    setIsUnlocked(false);
    setPasswordInput('');
    setAuthError(null);
  };

  useEffect(() => {
    async function loadAdminData() {
      if (!isUnlocked) return;
      setIsLoading(true);

      try {
        if (activeTab === 'overview') {
          const res = await adminApi<{ stats: any; popular_categories: any[] }>('/api/admin/stats');
          setStats(res);
        } else if (activeTab === 'users') {
          const res = await adminApi<{ users: User[] }>(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
          setUsersList(res.users || []);
        } else if (activeTab === 'reports') {
          const res = await adminApi<{ reports: ReportItem[] }>('/api/admin/reports');
          setReportsList(res.reports || []);
        } else if (activeTab === 'settings') {
          const res = await adminApi<{ settings: { key: string; value: string }[] }>('/api/admin/settings');
          const map: Record<string, string> = {};
          (res.settings || []).forEach((s) => {
            map[s.key] = s.value;
          });
          setSettings(map);
        } else if (activeTab === 'logs') {
          const res = await adminApi<{ audit_logs: AdminAuditLog[] }>('/api/admin/audit-logs');
          setAuditLogs(res.audit_logs || []);
        }
      } catch (err) {
        console.error('Failed to load admin view:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [activeTab, userSearch, isUnlocked, adminApi]);

  const handleUpdateUserStatus = async (targetId: string, newStatus: string) => {
    try {
      await adminApi(`/api/admin/users/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, status: newStatus as any } : u))
      );
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Error'));
    }
  };

  const handleUpdateUserRole = async (targetId: string, newRole: string) => {
    try {
      await adminApi(`/api/admin/users/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetId ? { ...u, role: newRole as any } : u))
      );
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Error'));
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolved' | 'dismissed', deleteTarget = false) => {
    try {
      await adminApi(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action, delete_target: deleteTarget }),
      });
      setReportsList((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      alert('Failed to resolve report: ' + (err.message || 'Error'));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      alert('Platform settings saved successfully.');
    } catch (err: any) {
      alert('Failed to save settings: ' + (err.message || 'Error'));
    }
  };

  const handleReversePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTxId.trim() || !reversalReason.trim()) return;

    setIsReversing(true);
    try {
      await adminApi('/api/admin/points/reverse', {
        method: 'POST',
        body: JSON.stringify({
          transaction_id: reversalTxId.trim(),
          reason: reversalReason.trim(),
        }),
      });
      alert('Fraudulent points reversed with audit log entry.');
      setReversalTxId('');
      setReversalReason('');
    } catch (err: any) {
      alert('Reversal failed: ' + (err.message || 'Error'));
    } finally {
      setIsReversing(false);
    }
  };

  // If NOT unlocked, render Master Password Gate
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 animate-fade-in">
        <div className="rounded-3xl border border-border bg-background-surface/90 backdrop-blur-md p-6 sm:p-8 shadow-2xl shadow-black/20 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Admin Portal
            </h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Restricted management zone. Enter the administration password to unlock platform controls.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center justify-center gap-2 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(null);
                }}
                placeholder="Enter password..."
                autoFocus
                className="w-full text-sm px-4 py-3 rounded-xl border border-border bg-background-elevated text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground p-1 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !passwordInput.trim()}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Admin Panel</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-border/60">
            <Link
              to="/"
              className="text-xs text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Website</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
                INKVERSE Admin Panel
              </h1>
              <p className="text-xs text-foreground-muted mt-0.5">
                {user ? (
                  <>Logged in as <strong>@{user.username}</strong> ({user.role})</>
                ) : (
                  <>Authenticated as <strong>Administrator</strong> (Master Passcode)</>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Lock administrative console"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Admin</span>
          </button>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-border bg-background-surface hover:bg-background-elevated"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border scrollbar-none">
        {[
          { id: 'overview', label: 'Platform Overview', icon: Activity },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'reports', label: 'Content Moderation', icon: AlertTriangle },
          { id: 'settings', label: 'Point Rules & Config', icon: Sliders },
          { id: 'reversal', label: 'Fraud Points Reversal', icon: RotateCcw },
          { id: 'logs', label: 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Users
              </span>
              <p className="font-serif text-2xl font-bold mt-1">{stats.stats.total_users}</p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Total registered</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Active
              </span>
              <p className="font-serif text-2xl font-bold text-emerald-400 mt-1">
                {stats.stats.daily_active_users}
              </p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Active past 24h</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Publications
              </span>
              <p className="font-serif text-2xl font-bold text-primary mt-1">
                {stats.stats.total_blogs}
              </p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Live stories</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Readers
              </span>
              <p className="font-serif text-2xl font-bold text-blue-400 mt-1">
                {stats.stats.total_views.toLocaleString()}
              </p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Verified views</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Reactions
              </span>
              <p className="font-serif text-2xl font-bold text-rose-400 mt-1">
                {stats.stats.total_reactions.toLocaleString()}
              </p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Total likes/dislikes</p>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background-surface">
              <span className="text-[11px] uppercase tracking-wider text-foreground-subtle font-semibold">
                Pending Reports
              </span>
              <p className="font-serif text-2xl font-bold text-amber-400 mt-1">
                {stats.stats.pending_reports}
              </p>
              <p className="text-[10px] text-foreground-subtle mt-0.5">Awaiting review</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by username, display name, or email..."
              className="w-full max-w-md text-xs p-3 rounded-xl border border-border bg-background-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="rounded-2xl border border-border bg-background-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-background-elevated/70 border-b border-border text-foreground-subtle uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">User</th>
                  <th className="py-3 px-4 sm:px-6">Role</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6 font-mono text-center">Points</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-background-elevated/40 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <p className="font-semibold text-foreground">{u.display_name}</p>
                      <p className="text-foreground-subtle font-mono text-[11px]">@{u.username} · {u.email}</p>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                        className="text-xs p-1 rounded-lg border border-border bg-background-elevated font-semibold capitalize"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : u.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-center font-mono font-bold text-primary">
                      {u.points}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      {u.status === 'active' ? (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'suspended')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'active')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTENT MODERATION */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="font-serif text-2xl font-bold">Reported Items ({reportsList.length})</h2>
          {reportsList.length === 0 ? (
            <p className="text-xs text-foreground-muted p-8 text-center rounded-2xl border border-border bg-background-surface">
              No pending reports. All clear!
            </p>
          ) : (
            <div className="space-y-4">
              {reportsList.map((rep) => (
                <div key={rep.id} className="p-5 rounded-2xl border border-border bg-background-surface space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-400 uppercase tracking-wider font-mono">
                      {rep.target_type} report
                    </span>
                    <span className="text-foreground-subtle font-mono">
                      Reported by @{rep.reporter?.username || rep.reporter_id}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Reason: {rep.reason}</p>
                  {rep.details && (
                    <p className="text-xs text-foreground-muted bg-background-elevated p-2.5 rounded-xl">
                      "{rep.details}"
                    </p>
                  )}
                  <p className="text-xs font-mono text-foreground-subtle">Target ID: {rep.target_id}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 justify-end">
                    <button
                      onClick={() => handleResolveReport(rep.id, 'dismissed')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-background-elevated hover:bg-background-subtle text-foreground"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => handleResolveReport(rep.id, 'resolved', true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Offending Content</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-6 animate-fade-in p-6 rounded-2xl border border-border bg-background-surface">
          <h2 className="font-serif text-2xl font-bold mb-4">Configurable Rewards System</h2>
          <p className="text-xs text-foreground-muted mb-4">
            Adjust gamification points dynamically without restarting the application.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                Publish Story Reward (pts)
              </label>
              <input
                type="number"
                value={settings.reward_publish_blog || '20'}
                onChange={(e) => setSettings({ ...settings, reward_publish_blog: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                Per 100 Verified Views (pts)
              </label>
              <input
                type="number"
                value={settings.reward_100_views || '5'}
                onChange={(e) => setSettings({ ...settings, reward_100_views: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                Per 10 Genuine Likes (pts)
              </label>
              <input
                type="number"
                value={settings.reward_10_likes || '5'}
                onChange={(e) => setSettings({ ...settings, reward_10_likes: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                Editor's Pick Award (pts)
              </label>
              <input
                type="number"
                value={settings.reward_editor_pick || '50'}
                onChange={(e) => setSettings({ ...settings, reward_editor_pick: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-colors shadow-sm shadow-primary/20"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* 5. FRAUD REVERSAL */}
      {activeTab === 'reversal' && (
        <form onSubmit={handleReversePoints} className="max-w-xl space-y-4 p-6 rounded-2xl border border-border bg-background-surface animate-fade-in">
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <span>Reverse Fraudulent Points</span>
          </h2>
          <p className="text-xs text-foreground-muted">
            Revoke points awarded through artificial engagement or view spam. An immutable audit record will be logged.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
              Transaction ID
            </label>
            <input
              type="text"
              value={reversalTxId}
              onChange={(e) => setReversalTxId(e.target.value)}
              placeholder="e.g. ptx_12345678"
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
              Audit Reason
            </label>
            <textarea
              rows={2}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Explain fraud detection trigger or manual audit reason..."
              className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isReversing}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
          >
            {isReversing ? 'Processing Reversal...' : 'Execute Reversal'}
          </button>
        </form>
      )}

      {/* 6. AUDIT TRAIL */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="font-serif text-2xl font-bold">Administrative Audit Trail</h2>
          <div className="rounded-2xl border border-border bg-background-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-background-elevated/70 border-b border-border text-foreground-subtle uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Action</th>
                  <th className="py-3 px-4 sm:px-6">Admin</th>
                  <th className="py-3 px-4 sm:px-6">Target</th>
                  <th className="py-3 px-4 sm:px-6">Details</th>
                  <th className="py-3 px-4 sm:px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-background-elevated/40">
                    <td className="py-3 px-4 sm:px-6 font-semibold text-primary">{log.action}</td>
                    <td className="py-3 px-4 sm:px-6">@{log.admin_username || log.admin_id}</td>
                    <td className="py-3 px-4 sm:px-6">{log.target_type}: {log.target_id}</td>
                    <td className="py-3 px-4 sm:px-6 max-w-xs truncate text-foreground-muted">{log.details}</td>
                    <td className="py-3 px-4 sm:px-6 text-foreground-subtle">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
