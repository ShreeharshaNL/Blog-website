import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  PenTool,
  Users,
  CheckCircle2,
  Sparkles,
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
  
  // Infinite scroll
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  // Load Categories & Top Writers
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

  // Load Feed
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

  // Load next page
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

  // Intersection Observer
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
      {/* Mobile filter switcher */}
      <div className="lg:hidden mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setCurrentSort('latest')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              currentSort === 'latest'
                ? 'bg-foreground text-background font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setCurrentSort('most_liked')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              currentSort === 'most_liked'
                ? 'bg-foreground text-background font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Most Liked
          </button>
          <button
            onClick={() => setCurrentSort('trending')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              currentSort === 'trending'
                ? 'bg-foreground text-background font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Trending
          </button>
        </div>

        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory('')}
            className="text-xs text-primary hover:underline font-medium"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* MAIN FEED: MINIMAL ENDLESS STREAM */}
        {/* ========================================================= */}
        <main className="lg:col-span-8 space-y-5">
          {isLoadingInitial ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-background-surface p-6 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-border" />
                    <div className="w-32 h-3 rounded bg-border" />
                  </div>
                  <div className="w-3/4 h-5 rounded bg-border" />
                  <div className="w-full h-10 rounded bg-border/60" />
                  <div className="aspect-[16/9] w-full rounded-lg bg-border/40" />
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="py-20 text-center rounded-xl border border-border bg-background-surface p-8 space-y-3">
              <Compass className="w-8 h-8 text-foreground-subtle mx-auto opacity-60" />
              <h3 className="font-serif text-lg font-bold">No stories found</h3>
              <p className="text-xs text-foreground-muted max-w-sm mx-auto">
                No published stories match this filter. Be the first author to publish!
              </p>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-white"
                >
                  Show All Topics
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {blogs.map((blog) => (
                <FeedCard
                  key={blog.id}
                  blog={blog}
                  onRequireAuth={() => setIsLoginModalOpen(true)}
                />
              ))}

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="py-6 text-center">
                {isLoadingMore && (
                  <p className="text-xs text-foreground-subtle font-mono animate-pulse">
                    Loading older stories...
                  </p>
                )}

                {!isLoadingMore && page >= totalPages && blogs.length > 0 && (
                  <div className="py-6 text-center text-xs text-foreground-subtle flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>You're caught up with all stories</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* RIGHT SIDEBAR: REFINED EDITORIAL DISCOVERY */}
        {/* ========================================================= */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-5 self-start">
          {/* Feed Switcher */}
          <div className="rounded-xl border border-border/80 bg-background-surface/90 backdrop-blur-sm p-4 space-y-2.5 shadow-sm">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
              Feed
            </h3>
            <div className="flex flex-col gap-1">
              {[
                { id: 'latest', label: 'Latest Stories' },
                { id: 'most_liked', label: 'Most Liked' },
                { id: 'trending', label: 'Trending' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentSort(tab.id as any)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    currentSort === tab.id
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                  }`}
                >
                  <span>{tab.label}</span>
                  {currentSort === tab.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          {categories.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-background-surface/90 backdrop-blur-sm p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Topics
                </h3>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-white font-medium'
                      : 'bg-background-elevated text-foreground-muted hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.slug;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(isSelected ? '' : cat.slug)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary text-white font-medium'
                          : 'bg-background-elevated text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Creators */}
          {topWriters.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-background-surface/90 backdrop-blur-sm p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Writers to Follow
                </h3>
                <Link to="/leaderboard" className="text-[11px] text-primary hover:underline font-medium">
                  View all
                </Link>
              </div>

              <div className="space-y-2.5">
                {topWriters.map((writer) => (
                  <Link
                    key={writer.id}
                    to={`/@${writer.username}`}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-background-elevated transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          writer.avatar_url ||
                          `https://api.dicebear.com/7.x/identicon/svg?seed=${writer.username}`
                        }
                        alt={writer.display_name}
                        className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {writer.display_name}
                        </p>
                        <p className="text-[10px] text-foreground-subtle truncate">
                          @{writer.username}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-primary font-medium">
                      Read
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Minimal Writer CTA */}
          <div className="rounded-xl border border-border/80 bg-background-surface/90 backdrop-blur-sm p-4 space-y-2.5 shadow-sm">
            <h4 className="font-serif font-bold text-sm text-foreground">
              Write on INKVERSE
            </h4>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Share your insights, essays, and technical breakdowns with our community.
            </p>
            {user ? (
              <Link
                to="/write"
                className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Start Writing</span>
              </Link>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-1.5"
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
