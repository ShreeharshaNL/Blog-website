import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  Compass,
  Trophy,
  PenTool,
  CheckCircle2,
  Clock,
  Flame,
  Users,
} from 'lucide-react';
import { Blog, Category, LeaderboardItem } from '../types';
import { apiRequest } from '../utils/api';
import { BlogCard } from '../components/BlogCard';
import { LevelBadge } from '../components/LevelBadge';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [trendingBlogs, setTrendingBlogs] = useState<Blog[]>([]);
  const [editorPicks, setEditorPicks] = useState<Blog[]>([]);
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topWriters, setTopWriters] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [trendingData, picksData, latestData, catData, leaderboardData] = await Promise.all([
          apiRequest<{ blogs: Blog[] }>('/api/blogs/trending').catch(() => ({ blogs: [] })),
          apiRequest<{ blogs: Blog[] }>('/api/blogs/editor-picks').catch(() => ({ blogs: [] })),
          apiRequest<{ blogs: Blog[] }>('/api/blogs?sort=latest&limit=6').catch(() => ({ blogs: [] })),
          apiRequest<{ categories: Category[] }>('/api/categories').catch(() => ({ categories: [] })),
          apiRequest<{ writers: LeaderboardItem[] }>('/api/leaderboard?timeframe=weekly').catch(() => ({ writers: [] })),
        ]);

        setTrendingBlogs(trendingData.blogs || []);
        setEditorPicks(picksData.blogs || []);
        setLatestBlogs(latestData.blogs || []);
        setCategories(catData.categories || []);
        setTopWriters(leaderboardData.writers?.slice(0, 5) || []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION WITH RETRO SUNSET DESERT BACKDROP */}
      <section className="relative pt-16 md:pt-28 pb-16 md:pb-24 overflow-hidden rounded-3xl mx-2 sm:mx-4 border border-orange-500/20 bg-background-surface/30 backdrop-blur-[2px] mt-2 shadow-2xl">
        {/* Subtle warm glow enhancement */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-orange-500/5 via-transparent to-amber-500/5" />

        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-amber-500 dark:text-amber-400 mb-6 backdrop-blur-sm animate-fade-in shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Introducing INKVERSE — The Editorial Community</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Your Ideas Deserve to{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 dark:from-amber-300 dark:via-orange-400 dark:to-rose-400 bg-clip-text text-transparent italic">
              Be Read.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
            Write something meaningful. Share your perspective. Build your audience. Earn recognition and reputation points with every verified reader.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to="/write"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-950/40 transition-all hover:scale-105"
              >
                <PenTool className="w-4 h-4" />
                <span>Start Writing</span>
              </Link>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-950/40 transition-all hover:scale-105"
              >
                <PenTool className="w-4 h-4" />
                <span>Start Writing</span>
              </button>
            )}

            <Link
              to="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm border border-border bg-background-surface/80 hover:bg-background-elevated text-foreground transition-colors backdrop-blur-sm"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span>Explore Stories</span>
            </Link>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-3 max-w-md mx-auto mt-14 pt-8 border-t border-border/60 text-center">
            <div>
              <p className="font-serif text-xl sm:text-2xl font-bold text-foreground">+20</p>
              <p className="text-[11px] text-foreground-subtle uppercase tracking-wider mt-0.5">Publish Reward</p>
            </div>
            <div>
              <p className="font-serif text-xl sm:text-2xl font-bold text-primary">100%</p>
              <p className="text-[11px] text-foreground-subtle uppercase tracking-wider mt-0.5">Genuine Views</p>
            </div>
            <div>
              <p className="font-serif text-xl sm:text-2xl font-bold text-foreground">Level 1-7</p>
              <p className="text-[11px] text-foreground-subtle uppercase tracking-wider mt-0.5">Creator Tiers</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EDITOR'S PICKS (FEATURED) */}
      {editorPicks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold">Editor's Picks</h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Hand-curated exceptional stories chosen for literary and technical merit.
                </p>
              </div>
            </div>
            <Link
              to="/explore?sort=most_liked"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-orange-500 transition-colors"
            >
              <span>View all curated</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <BlogCard blog={editorPicks[0]} variant="featured" />

          {editorPicks.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {editorPicks.slice(1, 3).map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. TRENDING STORIES */}
      {trendingBlogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold">Trending Stories</h2>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Stories capturing community attention and sparking deep conversations right now.
                </p>
              </div>
            </div>
            <Link
              to="/explore?sort=trending"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-orange-500 transition-colors"
            >
              <span>Explore trending</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingBlogs.slice(0, 6).map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        </section>
      )}

      {/* 4. POPULAR CATEGORIES */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold">Popular Categories</h2>
              <p className="text-xs text-foreground-muted mt-0.5">
                Browse thought pieces across technology, science, craft, and culture.
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-orange-500 transition-colors"
            >
              <span>All topics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="group p-4 rounded-2xl border border-border bg-background-surface hover:bg-background-elevated hover:border-orange-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                </div>
                <span className="text-[11px] text-foreground-subtle font-mono mt-3 block">
                  {cat.blog_count || 0} stories
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5. TOP WRITERS & WEEKLY LEADERBOARD HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Latest Publications (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold">Latest Publications</h2>
                <p className="text-xs text-foreground-muted">Fresh dispatches directly from the community.</p>
              </div>
              <Link
                to="/explore?sort=latest"
                className="text-xs font-semibold text-primary hover:text-orange-500"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {latestBlogs.slice(0, 4).map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          </div>

          {/* Top Writers Leaderboard Highlight (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-border bg-background-surface p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                <h3 className="font-bold text-base">Weekly Leaderboard</h3>
              </div>
              <Link to="/leaderboard" className="text-xs text-primary hover:underline font-semibold">
                Full rankings
              </Link>
            </div>

            <p className="text-xs text-foreground-muted mb-4">
              Top creators earning points this week through publications and reader engagement.
            </p>

            <div className="space-y-3.5">
              {topWriters.length === 0 ? (
                <p className="text-xs text-foreground-subtle py-4 text-center">No ranked writers yet.</p>
              ) : (
                topWriters.map((writer) => (
                  <Link
                    key={writer.id}
                    to={`/@${writer.username}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-background-elevated transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          writer.rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : writer.rank === 2
                            ? 'bg-stone-400/20 text-stone-300 border border-stone-400/40'
                            : writer.rank === 3
                            ? 'bg-orange-700/20 text-orange-400 border border-orange-700/40'
                            : 'text-foreground-subtle'
                        }`}
                      >
                        {writer.rank}
                      </span>
                      <img
                        src={
                          writer.avatar_url ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${writer.username}`
                        }
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold group-hover:text-primary truncate">
                          {writer.display_name}
                        </p>
                        <p className="text-[10px] text-foreground-subtle truncate">@{writer.username}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xs font-bold text-amber-500 dark:text-amber-400">
                        {writer.points} pts
                      </span>
                      <LevelBadge level={writer.level} className="text-[9px] py-0 px-1.5 ml-2" />
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/write"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center justify-center gap-2 transition-colors"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Publish to climb the leaderboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. JOIN THE COMMUNITY BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-orange-500/30 bg-gradient-to-r from-amber-950/40 via-background-surface to-orange-950/40 p-8 sm:p-12 text-center shadow-2xl shadow-orange-950/20">
          {/* Subtle backdrop reflection */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 dark:opacity-40">
            <img
              src="/hero-backdrop.jpg"
              alt=""
              className="w-full h-full object-cover object-bottom filter saturate-150"
            />
            <div className="absolute inset-0 bg-background-surface/75 backdrop-blur-[1px]" />
          </div>

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>A Home for Creators</span>
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to Share Your Voice with INKVERSE?
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Join a growing collective of engineers, designers, founders, and thinkers. Earn points, receive badges, and climb creator tiers as your words reach thousands.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold bg-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-950/40 transition-all hover:scale-105"
              >
                Join INKVERSE Today
              </button>
              <Link
                to="/explore"
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold border border-border bg-background-elevated hover:bg-background-subtle text-foreground transition-colors"
              >
                Browse Stories First
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
