import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import {
  Heart,
  ThumbsDown,
  Bookmark,
  Share2,
  Clock,
  Eye,
  Calendar,
  Award,
  Flag,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { Blog } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LevelBadge } from '../components/LevelBadge';
import { ReadingProgressBar } from '../components/ReadingProgressBar';
import { TableOfContents } from '../components/TableOfContents';
import { ShareModal } from '../components/ShareModal';
import { ReportModal } from '../components/ReportModal';
import { CommentsSection } from '../components/CommentsSection';
import { LoginModal } from '../components/LoginModal';
import { BlogCard } from '../components/BlogCard';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [authorOtherBlogs, setAuthorOtherBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlog() {
      setIsLoading(true);
      try {
        const data = await apiRequest<{
          blog: Blog;
          related_blogs: Blog[];
          author_other_blogs: Blog[];
        }>(`/api/blogs/${slug}`);

        setBlog(data.blog);
        setRelatedBlogs(data.related_blogs || []);
        setAuthorOtherBlogs(data.author_other_blogs || []);
        setUserReaction(data.blog.user_reaction || null);
        setLikeCount(data.blog.like_count);
        setIsBookmarked(Boolean(data.blog.is_bookmarked));

        // Record verified view
        apiRequest(`/api/blogs/${slug}/view`, { method: 'POST' }).catch(() => {});

        // Check if following author
        if (user && data.blog.author && user.id !== data.blog.author_id) {
          apiRequest<{ user: { is_following: boolean } }>(`/api/users/@${data.blog.author.username}`)
            .then(res => setIsFollowing(Boolean(res.user?.is_following)))
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Failed to load blog:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) loadBlog();
  }, [slug, user]);

  // Handle Reaction: Like / Dislike
  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!blog) return;

    // Optimistic update
    const previousReaction = userReaction;
    const previousLikes = likeCount;

    let nextReaction: 'like' | 'dislike' | null = type;
    let nextLikes = likeCount;

    if (previousReaction === type) {
      nextReaction = null;
      if (type === 'like') nextLikes = Math.max(0, likeCount - 1);
    } else {
      if (type === 'like') {
        nextLikes = likeCount + 1;
      } else if (previousReaction === 'like') {
        nextLikes = Math.max(0, likeCount - 1);
      }
    }

    setUserReaction(nextReaction);
    setLikeCount(nextLikes);

    try {
      const res = await apiRequest<{
        success: boolean;
        user_reaction: 'like' | 'dislike' | null;
        like_count: number;
      }>(`/api/blogs/${blog.id}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      setUserReaction(res.user_reaction);
      setLikeCount(res.like_count);
    } catch (err) {
      // Rollback on error
      setUserReaction(previousReaction);
      setLikeCount(previousLikes);
    }
  };

  // Handle Bookmark
  const handleBookmark = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!blog) return;

    const previous = isBookmarked;
    setIsBookmarked(!previous);

    try {
      const res = await apiRequest<{ success: boolean; is_bookmarked: boolean }>(
        `/api/blogs/${blog.id}/bookmark`,
        { method: 'POST' }
      );
      setIsBookmarked(res.is_bookmarked);
    } catch {
      setIsBookmarked(previous);
    }
  };

  // Handle Follow
  const handleFollowToggle = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!blog?.author) return;

    const previous = isFollowing;
    setIsFollowing(!previous);

    try {
      const res = await apiRequest<{ is_following: boolean }>(
        `/api/users/@${blog.author.username}/follow`,
        { method: 'POST' }
      );
      setIsFollowing(res.is_following);
    } catch {
      setIsFollowing(previous);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-6">
        <div className="h-10 bg-background-elevated rounded-xl animate-pulse w-3/4" />
        <div className="h-6 bg-background-elevated rounded-lg animate-pulse w-1/2" />
        <div className="h-80 bg-background-elevated rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-3xl font-bold mb-3">Story Not Found</h2>
        <p className="text-sm text-foreground-muted mb-6">
          The publication you are looking for may have been removed or is currently a private draft.
        </p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Other Stories</span>
        </Link>
      </div>
    );
  }

  const isAuthor = user?.id === blog.author_id;
  const sanitizedContent = DOMPurify.sanitize(blog.content, {
    ADD_TAGS: ['video', 'source'],
    ADD_ATTR: [
      'target',
      'id',
      'controls',
      'autoplay',
      'loop',
      'muted',
      'poster',
      'preload',
      'playsinline',
      'class',
      'src',
      'type',
    ],
  });

  return (
    <>
      <ReadingProgressBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-primary font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Stories</span>
          </Link>
          {blog.category && (
            <Link
              to={`/categories/${blog.category.slug}`}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
            >
              {blog.category.name}
            </Link>
          )}
        </div>

        {/* Article Header */}
        <header className="space-y-6">
          {blog.is_editor_pick && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-950/30">
              <Award className="w-3.5 h-3.5" />
              <span>Editor's Pick</span>
            </div>
          )}

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.15]">
            {blog.title}
          </h1>

          <p className="font-serif text-lg sm:text-xl text-foreground-muted leading-relaxed italic">
            {blog.description}
          </p>

          {/* Author Card & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-border/80">
            <div className="flex items-center gap-3.5">
              <Link to={`/@${blog.author?.username}`}>
                <img
                  src={
                    blog.author?.avatar_url ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author?.username}`
                  }
                  alt={blog.author?.display_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-border hover:border-orange-500 transition-colors"
                />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/@${blog.author?.username}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors"
                  >
                    {blog.author?.display_name}
                  </Link>
                  <LevelBadge level={blog.author?.level} />
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground-subtle font-mono mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {blog.published_at
                        ? new Date(blog.published_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Draft'}
                    </span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{blog.reading_time_minutes} min read</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Follow / Edit Button */}
            <div className="flex items-center gap-2">
              {isAuthor ? (
                <Link
                  to={`/write/${blog.id}`}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-background-elevated hover:bg-background-subtle border border-border text-foreground transition-colors"
                >
                  Edit Article
                </Link>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isFollowing
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30'
                      : 'bg-primary hover:bg-orange-600 text-white'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {blog.cover_image && (
          <div
            className="rounded-2xl overflow-hidden border border-border shadow-xl bg-background-subtle cursor-pointer group"
            onClick={() => setLightboxImg(blog.cover_image || null)}
          >
            <img
              src={blog.cover_image}
              alt={blog.title}
              className="w-full max-h-[500px] object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
        )}

        {/* Content & Floating Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Editorial Text */}
          <div className="lg:col-span-8 space-y-8">
            <div
              className="article-body prose-editorial"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="pt-6 border-t border-border flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/explore?search=${tag.slug}`}
                    className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-background-elevated hover:bg-orange-500/20 hover:text-orange-600 dark:hover:text-orange-300 text-foreground-muted border border-border transition-colors"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Engagement Action Bar */}
            <div className="sticky bottom-4 z-30 p-2.5 sm:p-4 rounded-2xl bg-background-surface/90 backdrop-blur-md border border-border shadow-2xl flex items-center justify-between gap-2">
              {/* Reactions: Like & Dislike */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Like Button */}
                <button
                  onClick={() => handleReaction('like')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                    userReaction === 'like'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-950/20'
                      : 'border-border hover:bg-background-elevated text-foreground-muted hover:text-foreground'
                  }`}
                  title="Like story"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      userReaction === 'like' ? 'fill-rose-400 text-rose-400' : ''
                    }`}
                  />
                  <span className="font-mono">{likeCount}</span>
                </button>

                {/* Dislike Button (NO PUBLIC COUNT EVER DISPLAYED!) */}
                <button
                  onClick={() => handleReaction('dislike')}
                  className={`p-2 rounded-xl text-xs border transition-all shrink-0 ${
                    userReaction === 'dislike'
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/40'
                      : 'border-border hover:bg-background-elevated text-foreground-muted hover:text-foreground'
                  }`}
                  title="Dislike (Feedback is strictly private to author)"
                >
                  <ThumbsDown
                    className={`w-4 h-4 ${
                      userReaction === 'dislike' ? 'fill-current' : ''
                    }`}
                  />
                </button>

                {/* Private Dislike Stats Indicator (ONLY FOR AUTHOR WHEN ENABLED) */}
                {isAuthor && blog.dislike_count !== undefined && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-orange-950/30 border border-orange-500/30 text-orange-300 shrink-0"
                    title="Private dislike analytics visible only to you as author"
                  >
                    <Lock className="w-3 h-3 text-orange-400" />
                    <span>Private dislikes: {blog.dislike_count}</span>
                  </span>
                )}
              </div>

              {/* Share, Bookmark & Report */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-xl border transition-colors shrink-0 ${
                    isBookmarked
                      ? 'bg-primary text-white border-primary'
                      : 'border-border hover:bg-background-elevated text-foreground-muted hover:text-foreground'
                  }`}
                  title={isBookmarked ? 'Saved to bookmarks' : 'Bookmark story'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle text-xs font-semibold text-foreground transition-colors shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Share</span>
                </button>

                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="p-2 rounded-xl text-foreground-subtle hover:text-amber-400 transition-colors shrink-0"
                  title="Report story"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Author Profile Card */}
            {blog.author && (
              <div className="p-6 rounded-2xl border border-border bg-background-surface/80 flex items-start gap-4">
                <img
                  src={
                    blog.author.avatar_url ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${blog.author.username}`
                  }
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-border shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      to={`/@${blog.author.username}`}
                      className="font-bold text-base hover:text-primary transition-colors"
                    >
                      Written by {blog.author.display_name}
                    </Link>
                    <LevelBadge level={blog.author.level} />
                  </div>
                  <p className="text-xs text-foreground-muted mb-3 leading-relaxed">
                    {blog.author.bio || 'Author on INKVERSE.'}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-foreground-subtle">
                    <span>{blog.author.points} reputation points</span>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <CommentsSection
              blogId={blog.id}
              blogAuthorId={blog.author_id}
              initialComments={[]}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          </div>

          {/* Sidebar (TOC & Stats) */}
          <aside className="lg:col-span-4 sticky top-24 space-y-6">
            <TableOfContents contentHtml={sanitizedContent} />

            {/* Story Metrics */}
            <div className="p-5 rounded-2xl bg-background-surface border border-border space-y-3 text-xs">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Story Metrics
              </h4>
              <div className="flex items-center justify-between text-foreground-muted py-1 border-b border-border/50">
                <span>Verified Readers</span>
                <span className="font-mono font-bold text-foreground">
                  {blog.view_count.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-foreground-muted py-1 border-b border-border/50">
                <span>Genuine Likes</span>
                <span className="font-mono font-bold text-rose-400">
                  {likeCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-foreground-muted py-1 border-b border-border/50">
                <span>Estimated Reading Time</span>
                <span className="font-mono">{blog.reading_time_minutes} minutes</span>
              </div>
              <div className="flex items-center justify-between text-foreground-muted py-1">
                <span>Word Count</span>
                <span className="font-mono">{blog.word_count} words</span>
              </div>
            </div>
          </aside>
        </div>

        {/* More Stories from Author / Related */}
        {authorOtherBlogs.length > 0 && (
          <section className="pt-10 border-t border-border">
            <h3 className="font-serif text-2xl font-bold mb-6">
              More from {blog.author?.display_name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {authorOtherBlogs.map((b) => (
                <BlogCard key={b.id} blog={b} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 cursor-zoom-out animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Modals */}
      <ShareModal
        blog={blog}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetType="blog"
        targetId={blog.id}
        targetTitle={blog.title}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
};
