import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, Bookmark, Share2, Eye, Clock, Award, Check } from 'lucide-react';
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

  // Time display
  const timeDisplay = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  const defaultCover =
    blog.cover_image ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80';

  // Toggle Like reaction inline
  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (isLiking) return;

    // Optimistic UI update
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
      // Revert if request fails
      setIsLiked(previousLiked);
      setLikes(previousLikes);
    } finally {
      setIsLiking(false);
    }
  };

  // Toggle Bookmark inline
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
      <article className="group relative rounded-2xl sm:rounded-3xl border border-border/80 bg-background-surface/85 backdrop-blur-md hover:border-orange-500/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-orange-950/15 overflow-hidden">
        <div className="p-5 sm:p-7 space-y-4">
          {/* 1. AUTHOR & POST CONTEXT HEADER */}
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/@${blog.author?.username}`}
              className="flex items-center gap-3 group/author min-w-0"
            >
              <img
                src={
                  blog.author?.avatar_url ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author?.username}`
                }
                alt={blog.author?.display_name}
                className="w-10 h-10 rounded-full object-cover border border-border group-hover/author:border-orange-500 transition-colors shrink-0"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-foreground group-hover/author:text-primary transition-colors truncate">
                    {blog.author?.display_name}
                  </span>
                  <span className="text-xs text-foreground-subtle font-mono truncate">
                    @{blog.author?.username}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-foreground-subtle font-mono">
                  <span>{timeDisplay}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{blog.reading_time_minutes}m read</span>
                  </span>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {blog.category && (
                <Link
                  to={`/categories/${blog.category.slug}`}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                >
                  {blog.category.name}
                </Link>
              )}
              {blog.is_editor_pick && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm">
                  <Award className="w-3 h-3" />
                  <span>Editor's Pick</span>
                </span>
              )}
            </div>
          </div>

          {/* 2. TITLE & EXCERPT */}
          <div className="space-y-2">
            <Link to={`/blog/${blog.slug}`} className="block group/title">
              <h2 className="font-serif text-xl sm:text-2xl md:text-[26px] font-bold leading-snug tracking-tight text-foreground group-hover/title:text-primary transition-colors">
                {blog.title}
              </h2>
            </Link>
            <p className="text-sm text-foreground-muted leading-relaxed line-clamp-3 font-sans">
              {blog.description}
            </p>
          </div>

          {/* 3. COVER IMAGE */}
          {blog.cover_image && (
            <Link
              to={`/blog/${blog.slug}`}
              className="block relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-background-subtle group/img"
            >
              <img
                src={defaultCover}
                alt={blog.title}
                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
            </Link>
          )}

          {/* 4. INLINE ENGAGEMENT ACTION BAR (Instagram / Reddit style) */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-foreground-muted">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl transition-all duration-200 ${
                  isLiked
                    ? 'text-rose-500 bg-rose-500/10 font-semibold'
                    : 'hover:text-rose-400 hover:bg-background-elevated'
                }`}
                title="Like story"
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isLiked ? 'fill-rose-500 scale-110' : ''
                  }`}
                />
                <span className="font-mono text-xs">{likes}</span>
              </button>

              {/* Comments Button */}
              <Link
                to={`/blog/${blog.slug}#comments`}
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:text-primary hover:bg-background-elevated transition-colors"
                title="View discussion"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-mono text-xs">{blog.comment_count || 0}</span>
              </Link>

              {/* View Count */}
              <span className="hidden sm:flex items-center gap-1.5 py-1.5 px-2 text-foreground-subtle">
                <Eye className="w-4 h-4" />
                <span className="font-mono text-xs">{blog.view_count.toLocaleString()}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Bookmark Button */}
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-xl transition-colors ${
                  isBookmarked
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-foreground-subtle hover:text-foreground hover:bg-background-elevated'
                }`}
                title={isBookmarked ? 'Saved in reading list' : 'Save for later'}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="p-2 rounded-xl text-foreground-subtle hover:text-foreground hover:bg-background-elevated transition-colors"
                title="Share this story"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        blog={blog}
      />
    </>
  );
};
