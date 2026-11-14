import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Clock, Award, Bookmark } from 'lucide-react';
import { Blog } from '../types';
import { LevelBadge } from './LevelBadge';

interface BlogCardProps {
  blog: Blog;
  variant?: 'standard' | 'compact' | 'featured';
  onBookmarkToggle?: (blogId: string) => void;
  isBookmarked?: boolean;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  blog,
  variant = 'standard',
  onBookmarkToggle,
  isBookmarked = false,
}) => {
  const publishedDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Draft';

  const defaultCover =
    blog.cover_image ||
    `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80`;

  if (variant === 'compact') {
    return (
      <article className="group flex items-start gap-4 p-3 rounded-xl border border-transparent hover:border-border hover:bg-background-elevated/50 transition-all duration-200">
        <Link to={`/blog/${blog.slug}`} className="shrink-0 w-24 h-20 rounded-lg overflow-hidden bg-background-subtle">
          <img
            src={defaultCover}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {blog.category && (
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                {blog.category.name}
              </span>
            )}
            <span className="text-[11px] text-foreground-subtle font-mono">
              · {blog.reading_time_minutes}m read
            </span>
          </div>
          <Link to={`/blog/${blog.slug}`}>
            <h4 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-purple-400 transition-colors">
              {blog.title}
            </h4>
          </Link>
          <div className="flex items-center gap-2 mt-2 text-xs text-foreground-muted">
            <span>@{blog.author?.username}</span>
            <span>·</span>
            <span className="flex items-center gap-1 font-mono">
              <Heart className="w-3 h-3 text-rose-400" /> {blog.like_count}
            </span>
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'featured') {
    return (
      <article className="group relative rounded-2xl overflow-hidden border border-border bg-background-surface hover:border-purple-500/40 transition-all duration-300 shadow-xl hover:shadow-purple-950/20 grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-7 relative aspect-[16/10] md:aspect-auto overflow-hidden bg-background-subtle">
          <img
            src={defaultCover}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent md:hidden" />
          {blog.is_editor_pick && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-600/90 text-white backdrop-blur-md shadow-lg shadow-purple-900/40">
              <Award className="w-3.5 h-3.5" />
              <span>Editor's Pick</span>
            </div>
          )}
        </div>

        <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              {blog.category && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {blog.category.name}
                </span>
              )}
              <div className="flex items-center gap-1 text-xs text-foreground-subtle font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{blog.reading_time_minutes} min read</span>
              </div>
            </div>

            <Link to={`/blog/${blog.slug}`}>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground group-hover:text-purple-300 transition-colors mb-3 leading-snug">
                {blog.title}
              </h3>
            </Link>

            <p className="text-sm text-foreground-muted line-clamp-3 mb-6 leading-relaxed">
              {blog.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Link
                to={`/@${blog.author?.username}`}
                className="flex items-center gap-3 group/author"
              >
                <img
                  src={
                    blog.author?.avatar_url ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author?.username}`
                  }
                  alt={blog.author?.display_name}
                  className="w-9 h-9 rounded-full object-cover border border-border group-hover/author:border-purple-400"
                />
                <div>
                  <p className="text-xs font-semibold group-hover/author:text-purple-400 transition-colors">
                    {blog.author?.display_name}
                  </p>
                  <p className="text-[11px] text-foreground-subtle font-mono">{publishedDate}</p>
                </div>
              </Link>

              <div className="flex items-center gap-3 text-xs text-foreground-muted font-mono">
                <span className="flex items-center gap-1" title="Views">
                  <Eye className="w-3.5 h-3.5 text-foreground-subtle" />
                  <span>{blog.view_count.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1 text-rose-400 font-semibold" title="Likes">
                  <Heart className="w-3.5 h-3.5 fill-rose-400/20" />
                  <span>{blog.like_count.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Standard Card
  return (
    <article className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-background-surface hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-purple-950/20">
      {/* Cover Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-background-subtle">
        <Link to={`/blog/${blog.slug}`}>
          <img
            src={defaultCover}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </Link>
        {blog.is_editor_pick && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-600/90 text-white backdrop-blur-md shadow-md">
            <Award className="w-3 h-3" />
            <span>Editor's Pick</span>
          </div>
        )}
        {blog.category && (
          <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-background/80 backdrop-blur-md text-foreground border border-border">
            {blog.category.name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-foreground-subtle mb-2 font-mono">
            <span>{publishedDate}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{blog.reading_time_minutes} min read</span>
            </span>
          </div>

          <Link to={`/blog/${blog.slug}`}>
            <h3 className="font-serif font-bold text-lg leading-snug text-foreground group-hover:text-purple-400 transition-colors line-clamp-2 mb-2">
              {blog.title}
            </h3>
          </Link>

          <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed mb-4">
            {blog.description}
          </p>
        </div>

        {/* Footer info: author & reactions */}
        <div className="pt-3 border-t border-border/70 flex items-center justify-between">
          <Link
            to={`/@${blog.author?.username}`}
            className="flex items-center gap-2 group/author min-w-0"
          >
            <img
              src={
                blog.author?.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author?.username}`
              }
              alt={blog.author?.display_name}
              className="w-7 h-7 rounded-full object-cover border border-border group-hover/author:border-purple-400 shrink-0"
            />
            <span className="text-xs font-medium text-foreground truncate group-hover/author:text-purple-400 transition-colors">
              {blog.author?.display_name}
            </span>
          </Link>

          <div className="flex items-center gap-2.5 text-xs text-foreground-muted font-mono shrink-0">
            <span className="flex items-center gap-1" title="Views">
              <Eye className="w-3 h-3 text-foreground-subtle" />
              <span>{blog.view_count.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1 text-rose-400" title="Likes">
              <Heart className="w-3 h-3 fill-rose-400/20" />
              <span>{blog.like_count}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
