import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Compass } from 'lucide-react';
import { Blog } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BlogCard } from '../components/BlogCard';

export const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBookmarks() {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ bookmarks: Blog[] }>('/api/bookmarks');
        setBookmarks(res.bookmarks || []);
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) loadBookmarks();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Bookmark className="w-10 h-10 text-purple-400 mx-auto mb-4" />
        <h2 className="font-serif text-3xl font-bold mb-3">Sign in to View Bookmarks</h2>
        <p className="text-sm text-foreground-muted mb-6">
          Save interesting stories to your private reading list and return to them anytime.
        </p>
        <Link to="/" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 text-white">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Bookmark className="w-6 h-6 text-purple-400" />
          <span>Reading List ({bookmarks.length})</span>
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Stories you've bookmarked for careful reading.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-border bg-background-surface animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-border bg-background-surface/40">
          <Bookmark className="w-10 h-10 text-foreground-subtle mx-auto mb-3 opacity-60" />
          <h3 className="font-serif text-xl font-bold mb-1">Your reading list is empty</h3>
          <p className="text-xs text-foreground-muted max-w-sm mx-auto mb-5">
            Click the bookmark icon on any story to save it here for later.
          </p>
          <Link
            to="/explore"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
          >
            Explore Stories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};
