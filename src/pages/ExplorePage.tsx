import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Compass, Sparkles, SlidersHorizontal, Clock } from 'lucide-react';
import { Blog, Category } from '../types';
import { apiRequest } from '../utils/api';
import { BlogCard } from '../components/BlogCard';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const query = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentSort = searchParams.get('sort') || 'trending';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    async function loadCategories() {
      try {
        const catRes = await apiRequest<{ categories: Category[] }>('/api/categories');
        setCategories(catRes.categories || []);
      } catch (err) {
        // Ignore
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function searchBlogs() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        if (currentCategory) params.set('category', currentCategory);
        if (currentSort) params.set('sort', currentSort);
        params.set('page', String(page));
        params.set('limit', '12');

        const res = await apiRequest<{ blogs: Blog[]; pagination: { total: number } }>(
          `/api/blogs?${params.toString()}`
        );
        setBlogs(res.blogs || []);
        setTotalCount(res.pagination?.total || 0);
      } catch (err) {
        console.error('Failed to load explore blogs:', err);
      } finally {
        setIsLoading(false);
      }
    }

    searchBlogs();
  }, [query, currentCategory, currentSort, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchInput.trim()) {
        next.set('search', searchInput.trim());
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleCategorySelect = (catSlug: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (catSlug === currentCategory) {
        next.delete('category');
      } else {
        next.set('category', catSlug);
      }
      next.set('page', '1');
      return next;
    });
  };

  const handleSortChange = (sortVal: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', sortVal);
      next.set('page', '1');
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
          Explore Stories &amp; Ideas
        </h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          Discover insightful perspectives from independent creators across technology, science, startups, and creative writing.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-foreground-subtle" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, topics, keywords or author username..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl border border-border bg-background-surface text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white transition-colors"
          >
            Search
          </button>
        </form>

        {/* Categories Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors border ${
              !currentCategory
                ? 'bg-primary text-white border-primary'
                : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted'
            }`}
          >
            All Topics
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors border ${
                currentCategory === cat.slug
                  ? 'bg-primary text-white border-primary'
                  : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort & Results Count Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
          <span className="text-foreground-subtle font-mono">
            {isLoading ? 'Searching...' : `${totalCount} stories found`}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-foreground-subtle hidden sm:inline">Sort by:</span>
            <div className="flex rounded-lg border border-border p-0.5 bg-background-surface">
              {[
                { id: 'trending', label: 'Trending' },
                { id: 'latest', label: 'Latest' },
                { id: 'most_viewed', label: 'Most Viewed' },
                { id: 'most_liked', label: 'Most Liked' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSortChange(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    currentSort === s.id
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 font-semibold'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background-surface h-80 animate-pulse"
            />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-border bg-background-surface/40">
          <Compass className="w-10 h-10 text-foreground-subtle mx-auto mb-3 opacity-60" />
          <h3 className="font-serif text-xl font-bold mb-1">No matching stories found</h3>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto mb-5">
            Try adjusting your search query, selecting a different topic, or changing the sorting options.
          </p>
          <button
            onClick={() => {
              setSearchInput('');
              setSearchParams({});
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};
