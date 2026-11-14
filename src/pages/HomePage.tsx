import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Flame,
  Clock,
  Heart,
  Compass,
  PenTool,
  Users,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { Blog, Category, LeaderboardItem } from '../types';
import { apiRequest } from '../utils/api';
import { FeedCard } from '../components/FeedCard';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../context/AuthContext';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topWriters, setTopWriters] = useState<LeaderboardItem[]>([]);
  const [currentSort, setCurrentSort] = useState<'latest' | 'most_liked' | 'trending'>('latest');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Infinite scroll state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // 1. Load Sidebar metadata (Categories & Top Creators) once
  useEffect(() => {
    async function loadSidebarData() {
      try {
        const [catRes, leaderboardRes] = await Promise.all([
          apiRequest<{ categories: Category[] }>('/api/categories').catch(() => ({ categories: [] })),
          apiRequest<{ writers: LeaderboardItem[] }>('/api/leaderboard?timeframe=weekly').catch(() => ({ writers: [] })),
        ]);
        setCategories(catRes.categories || []);
        setTopWriters(leaderboardRes.writers?.slice(0, 4) || []);
      } catch (err) {
        console.error('Failed to load sidebar metadata:', err);
      }
    }
    loadSidebarData();
  }, []);

  // 2. Load Initial Page of Blogs whenever sort or category changes
  useEffect(() => {
    let isCancelled = false;

    async function loadInitialFeed() {
      setIsLoadingInitial(true);
      setPage(1);

      try {
        const params = new URLSearchParams();
        params.set('sort', currentSort);
        if (selectedCategory) params.set('category', selectedCategory);
        params.set('page', '1');
        params.set('limit', '6');

        const res = await apiRequest<{ blogs: Blog[]; pagination: { totalPages: number } }>(
          `/api/blogs?${params.toString()}`
        );

        if (!isCancelled) {
          setBlogs(res.blogs || []);
          setTotalPages(res.pagination?.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
      } finally {
        if (!isCancelled) setIsLoadingInitial(false);
      }
    }

    loadInitialFeed();

    return () => {
      isCancelled = true;
    };
  }, [currentSort, selectedCategory]);

  // 3. Infinite Scroll: Load Next Page
  const loadNextPage = useCallback(async () => {
    if (isLoadingMore || page >= totalPages) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams();
      params.set('sort', currentSort);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('page', String(nextPage));
      params.set('limit', '6');

      const res = await apiRequest<{ blogs: Blog[]; pagination: { totalPages: number } }>(
        `/api/blogs?${params.toString()}`
      );

      setBlogs((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const newUnique = (res.blogs || []).filter((b) => !existingIds.has(b.id));
        return [...prev, ...newUnique];
      });

      setPage(nextPage);
      setTotalPages(res.pagination?.totalPages || nextPage);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, page, totalPages, currentSort, selectedCategory]);

  // 4. Setup Intersection Observer for seamless auto-scrolling
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingInitial && !isLoadingMore && page < totalPages) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [loadNextPage, isLoadingInitial, isLoadingMore, page, totalPages]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Mobile Feed Filter Bar (Sticky, minimal, zero obstruction) */}
      <div className="lg:hidden mb-6 flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/60">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCurrentSort('latest')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentSort === 'latest'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-surface/80 text-foreground-muted hover:text-foreground border border-border/80'
            }`}
          >
            ⚡ Latest
          </button>
          <button
            onClick={() => setCurrentSort('most_liked')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentSort === 'most_liked'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-surface/80 text-foreground-muted hover:text-foreground border border-border/80'
            }`}
          >
            ❤️ Most Liked
          </button>
          <button
            onClick={() => setCurrentSort('trending')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentSort === 'trending'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-background-surface/80 text-foreground-muted hover:text-foreground border border-border/80'
            }`}
          >
            🔥 Trending
          </button>
        </div>

        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory('')}
            className="text-xs text-primary font-semibold shrink-0 hover:underline"
          >
            Clear topic
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT / CENTER: CONTINUOUS STREAM FEED (Instagram/Reddit) */}
        {/* ========================================================= */}
        <main className="lg:col-span-8 space-y-6">
          {isLoadingInitial ? (
            /* Loading skeletons */
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-border/60 bg-background-surface/60 p-6 space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-border/60" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3.5 rounded bg-border/60" />
                      <div className="w-20 h-2.5 rounded bg-border/40" />
                    </div>
                  </div>
                  <div className="w-3/4 h-6 rounded bg-border/60" />
                  <div className="w-full h-12 rounded bg-border/40" />
                  <div className="aspect-[16/9] w-full rounded-2xl bg-border/50" />
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            /* Empty state */
            <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-background-surface/40 p-8 space-y-3">
              <Compass className="w-10 h-10 text-primary mx-auto opacity-70" />
              <h3 className="font-serif text-xl font-bold">No stories found</h3>
              <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                No published blogs match this filter yet. Be the first author to share your thoughts!
              </p>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white"
                >
                  Show All Topics
                </button>
              )}
            </div>
          ) : (
            /* Active Posts Stream */
            <div className="space-y-6">
              {blogs.map((blog) => (
                <FeedCard
                  key={blog.id}
                  blog={blog}
                  onRequireAuth={() => setIsLoginModalOpen(true)}
                />
              ))}

              {/* Infinite Scroll Trigger Sentinel */}
              <div ref={observerTarget} className="py-4 text-center">
                {isLoadingMore && (
                  <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-background-surface/80 border border-border text-xs text-foreground-muted animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span>Loading more stories...</span>
                  </div>
                )}

                {!isLoadingMore && page >= totalPages && blogs.length > 0 && (
                  <div className="py-8 text-center text-xs text-foreground-subtle font-mono flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>You're all caught up with the latest community stories ✨</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* RIGHT SIDEBAR: SORTING, TOPICS & DISCOVERY (Clean & Minimal) */}
        {/* ========================================================= */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-6 self-start">
          {/* 1. Feed Sorting Box */}
          <div className="rounded-3xl border border-border/80 bg-background-surface/85 backdrop-blur-md p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
              Feed Stream
            </h3>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setCurrentSort('latest')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentSort === 'latest'
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Latest Stories</span>
                </div>
                {currentSort === 'latest' && <span className="text-[10px] uppercase font-mono">Active</span>}
              </button>

              <button
                onClick={() => setCurrentSort('most_liked')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentSort === 'most_liked'
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Most Liked</span>
                </div>
                {currentSort === 'most_liked' && <span className="text-[10px] uppercase font-mono">Active</span>}
              </button>

              <button
                onClick={() => setCurrentSort('trending')}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  currentSort === 'trending'
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  <span>Trending Momentum</span>
                </div>
                {currentSort === 'trending' && <span className="text-[10px] uppercase font-mono">Active</span>}
              </button>
            </div>
          </div>

          {/* 2. Topic Filter Chips */}
          {categories.length > 0 && (
            <div className="rounded-3xl border border-border/80 bg-background-surface/85 backdrop-blur-md p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                  Explore Topics
                </h3>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'bg-background-elevated hover:bg-background-subtle text-foreground-muted'
                  }`}
                >
                  All Topics
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(isSelected ? '' : cat.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-primary text-white font-semibold shadow-sm'
                          : 'bg-background-elevated hover:bg-background-subtle text-foreground-muted'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Recommended Creators (Minimal) */}
          {topWriters.length > 0 && (
            <div className="rounded-3xl border border-border/80 bg-background-surface/85 backdrop-blur-md p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                    Top Writers
                  </h3>
                </div>
                <Link to="/leaderboard" className="text-[11px] text-primary hover:underline font-semibold">
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {topWriters.map((writer) => (
                  <Link
                    key={writer.id}
                    to={`/@${writer.username}`}
                    className="flex items-center justify-between p-1.5 -mx-1.5 rounded-xl hover:bg-background-elevated transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          writer.avatar_url ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${writer.username}`
                        }
                        alt={writer.display_name}
                        className="w-8 h-8 rounded-full object-cover border border-border group-hover:border-primary transition-colors shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {writer.display_name}
                        </p>
                        <p className="text-[10px] text-foreground-subtle truncate font-mono">
                          @{writer.username}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4. Minimal Writer CTA */}
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-amber-950/20 via-background-surface/85 to-orange-950/20 p-5 shadow-sm space-y-3">
            <h4 className="font-serif font-bold text-base text-foreground">
              Have something meaningful to share?
            </h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Publish your stories, share technical breakdowns, and connect with a community of readers.
            </p>
            {user ? (
              <Link
                to="/write"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Start Writing</span>
              </Link>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Start Writing</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
