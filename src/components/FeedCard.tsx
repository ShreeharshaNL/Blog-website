import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Bookmark, Share2, Eye, Clock, Award } from 'lucide-react';
import { Blog } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { ShareModal } from './ShareModal';

interface FeedCardProps {
  blog: Blog;
  onRequireAuth: () => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({ blog, onRequireAuth }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(blog.like_count || 0);
  const [isLiked, setIsLiked] = useState(blog.user_reaction === 'like');
  const [isBookmarked, setIsBookmarked] = useState(Boolean(blog.is_bookmarked));
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const timeDisplay = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  const defaultCover =
    blog.cover_image ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (isLiking) return;

    const previousLiked = isLiked;
    const previousLikes = likes;
    setIsLiked(!previousLiked);
    setLikes(previousLiked ? Math.max(0, likes - 1) : likes + 1);
    setIsLiking(true);

    try {
      await apiRequest(`/api/blogs/${blog.id}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ type: 'like' }),
      });
    } catch (err) {
      setIsLiked(previousLiked);
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (isBookmarking) return;

    const previous = isBookmarked;
    setIsBookmarked(!previous);
    setIsBookmarking(true);

    try {
      await apiRequest(`/api/bookmarks/${blog.id}`, { method: 'POST' });
    } catch (err) {
      setIsBookmarked(previous);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareOpen(true);
  };

  return (
    <>
      <article className="group bg-background-surface/90 backdrop-blur-sm border border-border/80 rounded-xl hover:border-stone-500/50 dark:hover:border-stone-600/60 transition-colors duration-200 overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Author Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link to={`/@${blog.author?.username}`} className="shrink-0">
                <img
                  src={
                    blog.author?.avatar_url ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author?.username}`
                  }
                  alt={blog.author?.display_name}
                  className="w-8 h-8 rounded-full object-cover border border-border"
                  loading="lazy"
                />
              </Link>
              <div className="flex items-center gap-1.5 text-xs truncate">
                <Link
                  to={`/@${blog.author?.username}`}
                  className="font-medium text-foreground hover:underline truncate"
                >
                  {blog.author?.display_name}
                </Link>
                <span className="text-foreground-subtle">·</span>
                <span className="text-foreground-subtle whitespace-nowrap">{timeDisplay}</span>
                <span className="text-foreground-subtle">·</span>
                <span className="text-foreground-subtle whitespace-nowrap">{blog.reading_time_minutes} min read</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {blog.category && (
                <Link
                  to={`/categories/${blog.category.slug}`}
                  className="text-[11px] font-medium text-primary hover:underline px-2 py-0.5 rounded bg-primary/10 border border-primary/20"
                >
                  {blog.category.name}
                </Link>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <Link to={`/blog/${blog.slug}`} className="block">
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors leading-snug">
                {blog.title}
              </h2>
            </Link>
            <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2">
              {blog.description}
            </p>
          </div>

          {/* Cover Image */}
          {blog.cover_image && (
            <Link
              to={`/blog/${blog.slug}`}
              className="block relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-background-subtle border border-border/50"
            >
              <img
                src={defaultCover}
                alt={blog.title}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            </Link>
          )}

          {/* Minimal hairline action bar */}
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-subtle">
            <div className="flex items-center gap-5">
              {/* Like */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 py-1 px-1.5 rounded transition-colors ${
                  isLiked ? 'text-primary font-semibold' : 'hover:text-foreground'
                }`}
                title="Like story"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-primary text-primary' : ''}`} />
                <span className="font-mono text-xs">{likes}</span>
              </button>

              {/* Comments */}
              <Link
                to={`/blog/${blog.slug}#comments`}
                className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:text-foreground transition-colors"
                title="View discussion"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-mono text-xs">{blog.comment_count || 0}</span>
              </Link>

              {/* Views */}
              <span className="flex items-center gap-1.5 py-1 px-1.5 font-mono">
                <Eye className="w-3.5 h-3.5" />
                <span>{blog.view_count.toLocaleString()}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Bookmark */}
              <button
                onClick={handleBookmark}
                className={`p-1.5 rounded hover:text-foreground transition-colors ${
                  isBookmarked ? 'text-primary' : ''
                }`}
                title={isBookmarked ? 'Saved in reading list' : 'Save for later'}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-primary' : ''}`} />
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="p-1.5 rounded hover:text-foreground transition-colors"
                title="Share this story"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        blog={blog}
      />
    </>
  );
};
