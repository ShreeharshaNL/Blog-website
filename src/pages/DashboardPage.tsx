import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Eye,
  Heart,
  ThumbsDown,
  Sparkles,
  Users,
  PenTool,
  Clock,
  Trash2,
  Edit2,
  Lock,
  LockOpen,
  TrendingUp,
  Award,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AuthorAnalytics, Blog } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LevelBadge } from '../components/LevelBadge';
import { calculateLevel } from '../utils/gamification';

export const DashboardPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<AuthorAnalytics | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeTab, setActiveTab] = useState<'published' | 'draft' | 'scheduled' | 'all'>('published');
  const [showDislikeStats, setShowDislikeStats] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [overviewData, blogsData] = await Promise.all([
        apiRequest<AuthorAnalytics>('/api/dashboard/overview'),
        apiRequest<{ blogs: Blog[]; show_dislike_stats: boolean }>('/api/dashboard/blogs'),
      ]);

      setAnalytics(overviewData);
      setBlogs(blogsData.blogs || []);
      setShowDislikeStats(Boolean(overviewData.overview.show_dislike_stats));
    } catch (err) {
      console.error('Failed to load author dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const handleToggleDislikeSetting = async () => {
    const nextState = !showDislikeStats;
    setShowDislikeStats(nextState);

    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ show_dislike_stats: nextState }),
      });
      updateUser({ show_dislike_stats: nextState });
      await loadDashboard();
    } catch (err: any) {
      alert('Failed to update dislike visibility: ' + (err.message || 'Error'));
      setShowDislikeStats(!nextState);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!confirm('Are you sure you want to permanently delete this story? This action cannot be undone.')) {
      return;
    }

    try {
      await apiRequest(`/api/blogs/${blogId}`, { method: 'DELETE' });
      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || 'Error'));
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-3xl font-bold mb-3">Sign In Required</h2>
        <p className="text-sm text-foreground-muted mb-6">
          Sign in to access your author analytics, stories manager, and reputation metrics.
        </p>
        <Link to="/" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 text-white">
          Return Home
        </Link>
      </div>
    );
  }

  const levelInfo = analytics ? calculateLevel(analytics.overview.total_points) : null;
  const filteredBlogs = blogs.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Author Dashboard
            </h1>
            <LevelBadge points={user.points} level={user.level} />
          </div>
          <p className="text-sm text-foreground-muted mt-1">
            Track your stories, reader engagement, private analytics, and reputation points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/points"
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Points Ledger ({user.points} pts)</span>
          </Link>

          <Link
            to="/write"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-900/30 transition-all flex items-center gap-1.5"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>New Story</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Published Stories */}
          <div className="p-4 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center justify-between text-foreground-subtle mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Stories</span>
              <PenTool className="w-4 h-4 text-purple-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-foreground">
              {analytics.overview.total_blogs}
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">Published total</p>
          </div>

          {/* Verified Views */}
          <div className="p-4 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center justify-between text-foreground-subtle mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Readers</span>
              <Eye className="w-4 h-4 text-blue-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-foreground">
              {analytics.overview.total_views.toLocaleString()}
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">Deduplicated views</p>
          </div>

          {/* Genuine Likes */}
          <div className="p-4 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center justify-between text-foreground-subtle mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Likes</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-rose-400">
              {analytics.overview.total_likes.toLocaleString()}
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">Genuine reactions</p>
          </div>

          {/* Followers */}
          <div className="p-4 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center justify-between text-foreground-subtle mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Followers</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-foreground">
              {analytics.overview.followers}
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">Active readers</p>
          </div>

          {/* Engagement Rate */}
          <div className="p-4 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center justify-between text-foreground-subtle mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Engagement</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-foreground">
              {analytics.overview.engagement_rate}%
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">Likes+comments/views</p>
          </div>

          {/* Reputation Points */}
          <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10">
            <div className="flex items-center justify-between text-purple-300 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Points</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <p className="font-serif text-2xl font-bold text-purple-300">
              {analytics.overview.total_points}
            </p>
            <p className="text-[11px] text-purple-300/80 mt-1 font-mono">
              Level {analytics.overview.level} {levelInfo?.name}
            </p>
          </div>
        </div>
      )}

      {/* Level Progress Bar */}
      {levelInfo && (
        <div className="p-5 rounded-2xl border border-border bg-background-surface">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-2">
              <span>Current Tier: <strong>Level {levelInfo.level} ({levelInfo.name})</strong></span>
            </span>
            <span className="font-mono text-purple-400">
              {levelInfo.nextPoints
                ? `${user.points} / ${levelInfo.nextPoints} pts (${levelInfo.progressPercent}%)`
                : 'Max Level Legend reached!'}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-background-elevated overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* CRITICAL FEATURE: PRIVATE DISLIKE ANALYTICS */}
      <section className="p-6 rounded-2xl border border-border bg-background-surface space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold">Private Dislike Analytics</h3>
              <p className="text-xs text-foreground-muted">
                Strictly confidential feedback visible only to you as author. Dislikes are NEVER publicly disclosed.
              </p>
            </div>
          </div>

          {/* Toggle Dislike Privacy Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-foreground-muted">
              {showDislikeStats ? 'Dislike stats enabled' : 'Dislike stats hidden'}
            </span>
            <button
              onClick={handleToggleDislikeSetting}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                showDislikeStats ? 'bg-purple-600' : 'bg-background-elevated border border-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showDislikeStats ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notice & Stat Display */}
        {showDislikeStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-background-elevated/40 border border-border">
              <div className="flex items-center justify-between text-xs text-foreground-subtle mb-1">
                <span>Total Dislikes Received</span>
                <ThumbsDown className="w-4 h-4 text-purple-400" />
              </div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {analytics?.overview.private_dislike_count ?? 0}
              </p>
              <p className="text-[11px] text-foreground-subtle mt-1">Across all published stories</p>
            </div>

            <div className="sm:col-span-2 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3 text-xs text-foreground-muted">
              <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Privacy Guarantee:</p>
                <p className="leading-relaxed">
                  INKVERSE guarantees that negative reaction counts are never rendered on public article pages, never sent in public blog queries, and never accessible to other readers. This private metric helps you gauge tone and audience alignment without public penalty.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-foreground-subtle">
            <Lock className="w-6 h-6 mx-auto mb-2 text-foreground-subtle opacity-60" />
            <p>Dislike metrics are currently hidden in your dashboard.</p>
            <p className="text-foreground-muted mt-0.5">
              Toggle the switch above if you wish to inspect private feedback for editorial insights.
            </p>
          </div>
        )}
      </section>

      {/* Stories Management Tabs & Table */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            {[
              { id: 'published', label: 'Published' },
              { id: 'draft', label: 'Drafts' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'all', label: 'All Stories' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredBlogs.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-background-surface/40">
            <PenTool className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold">No {activeTab} stories found</p>
            <p className="text-xs text-foreground-muted mt-1 mb-4">
              Ready to write something impactful?
            </p>
            <Link
              to="/write"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start Writing
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-background-elevated/70 border-b border-border text-foreground-subtle uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Title</th>
                    <th className="py-3 px-4 sm:px-6">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Views</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Likes</th>
                    {showDislikeStats && (
                      <th className="py-3 px-4 sm:px-6 text-center text-purple-400">Private Dislikes</th>
                    )}
                    <th className="py-3 px-4 sm:px-6">Date</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredBlogs.map((b) => (
                    <tr key={b.id} className="hover:bg-background-elevated/50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 max-w-xs">
                        <Link
                          to={b.status === 'published' ? `/blog/${b.slug}` : `/write/${b.id}`}
                          className="font-semibold text-foreground hover:text-purple-400 transition-colors line-clamp-1"
                        >
                          {b.title}
                        </Link>
                        <p className="text-[11px] text-foreground-subtle line-clamp-1">{b.description}</p>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : b.status === 'draft'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono text-foreground-muted">
                        {b.view_count.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono text-rose-400">
                        {b.like_count.toLocaleString()}
                      </td>

                      {showDislikeStats && (
                        <td className="py-3.5 px-4 sm:px-6 text-center font-mono text-purple-400 font-semibold">
                          {b.dislike_count ?? 0}
                        </td>
                      )}

                      <td className="py-3.5 px-4 sm:px-6 text-foreground-subtle font-mono text-[11px]">
                        {new Date(b.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/write/${b.id}`}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-purple-400 hover:bg-background-elevated transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteBlog(b.id)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-rose-400 hover:bg-background-elevated transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
