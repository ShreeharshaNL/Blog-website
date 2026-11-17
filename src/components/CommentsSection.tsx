import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, Reply, Trash2, Edit2, Flag, Send } from 'lucide-react';
import { Comment, PublicUser } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ReportModal } from './ReportModal';

interface CommentsSectionProps {
  blogId: string;
  blogAuthorId: string;
  initialComments: Comment[];
  onOpenLogin: () => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  blogId,
  blogAuthorId,
  initialComments,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reportTarget, setReportTarget] = useState<{ id: string; text: string } | null>(null);

  // Fetch comments on mount and when blogId changes
  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      if (!blogId) return;
      setIsLoadingComments(true);
      try {
        const res = await apiRequest<{ comments: Comment[] }>(`/api/comments/${blogId}/comments`);
        if (isMounted && res.comments) {
          setComments(res.comments);
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    }
    loadComments();
    return () => {
      isMounted = false;
    };
  }, [blogId]);

  // Submit root comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLogin();
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiRequest<{ success: boolean; comment: Comment }>(
        `/api/comments/${blogId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content: newComment.trim() }),
        }
      );
      if (res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setNewComment('');
      }
    } catch (err: any) {
      alert('Failed to post comment: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit reply
  const handleReplySubmit = async (parentId: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    if (!replyText.trim()) return;

    try {
      const res = await apiRequest<{ success: boolean; comment: Comment }>(
        `/api/comments/${blogId}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content: replyText.trim(), parent_id: parentId }),
        }
      );
      if (res.comment) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), res.comment] };
            }
            return c;
          })
        );
        setReplyingTo(null);
        setReplyText('');
      }
    } catch (err: any) {
      alert('Failed to post reply: ' + (err.message || 'Error'));
    }
  };

  // Like comment
  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      onOpenLogin();
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; is_liked: boolean; like_count: number }>(
        `/api/comments/items/${commentId}/like`,
        { method: 'POST' }
      );

      const updateLike = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              like_count: res.like_count,
              user_reaction: res.is_liked ? 'like' : null,
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateLike(c.replies) };
          }
          return c;
        });

      setComments((prev) => updateLike(prev));
    } catch (err) {
      // Ignore
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await apiRequest(`/api/comments/items/${commentId}`, { method: 'DELETE' });

      const removeComment = (list: Comment[]): Comment[] =>
        list
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? removeComment(c.replies) : [],
          }));

      setComments((prev) => removeComment(prev));
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || 'Error'));
    }
  };

  // Save edited comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      await apiRequest(`/api/comments/items/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editText.trim() }),
      });

      const updateContent = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: editText.trim() };
          }
          if (c.replies) {
            return { ...c, replies: updateContent(c.replies) };
          }
          return c;
        });

      setComments((prev) => updateContent(prev));
      setEditingId(null);
      setEditText('');
    } catch (err: any) {
      alert('Update failed: ' + (err.message || 'Error'));
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user?.id === comment.author_id;
    const isBlogAuthor = user?.id === blogAuthorId;
    const canModerate = isOwner || isBlogAuthor || user?.role === 'admin';

    return (
      <div
        key={comment.id}
        id={`comment-${comment.id}`}
        className={`group/comment text-sm transition-all ${
          isReply
            ? 'ml-3 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-primary/30 mt-3 pt-1'
            : 'p-4 sm:p-5 rounded-2xl bg-background-elevated/40 border border-border/80 hover:border-primary/40 mt-3 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <Link to={`/@${comment.author.username}`} className="shrink-0 hover:opacity-85 transition-opacity">
              <img
                src={
                  comment.author.avatar_url ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${comment.author.username}`
                }
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/@${comment.author.username}`}
                  className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary transition-colors"
                >
                  {comment.author.display_name}
                </Link>
                {comment.author_id === blogAuthorId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    Author
                  </span>
                )}
              </div>
              <span className="text-[11px] text-foreground-subtle font-mono">
                {new Date(comment.created_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Comment Actions */}
          <div className="flex items-center gap-1 opacity-80 group-hover/comment:opacity-100 transition-opacity">
            {canModerate && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="p-1.5 text-foreground-subtle hover:text-rose-400 transition-colors"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => {
                  setEditingId(comment.id);
                  setEditText(comment.content);
                }}
                className="p-1.5 text-foreground-subtle hover:text-primary transition-colors"
                title="Edit comment"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setReportTarget({ id: comment.id, text: comment.content })}
              className="p-1.5 text-foreground-subtle hover:text-amber-400 transition-colors"
              title="Report comment"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Comment Body */}
        {editingId === comment.id ? (
          <div className="space-y-2 mt-2">
            <textarea
              rows={2}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-primary bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-1 text-xs text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(comment.id)}
                className="px-3.5 py-1 text-xs font-semibold bg-primary hover:bg-orange-600 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap pl-0 sm:pl-10 mt-1">
            {comment.content}
          </p>
        )}

        {/* Bottom bar: Like & Reply button */}
        <div className="flex items-center gap-4 mt-3 pl-0 sm:pl-10 text-xs text-foreground-subtle">
          <button
            onClick={() => handleLikeComment(comment.id)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all ${
              comment.user_reaction === 'like'
                ? 'text-rose-500 font-bold bg-rose-500/10'
                : 'hover:text-rose-400 hover:bg-background-elevated'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform ${
                comment.user_reaction === 'like' ? 'fill-rose-500 text-rose-500 scale-110' : ''
              }`}
            />
            <span>{comment.like_count > 0 ? comment.like_count : ''} Like</span>
          </button>

          {!isReply && (
            <button
              onClick={() => {
                if (!user) {
                  onOpenLogin();
                  return;
                }
                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                setReplyText('');
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:text-primary hover:bg-background-elevated transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Reply Input Box */}
        {replyingTo === comment.id && (
          <div className="mt-3 ml-0 sm:ml-10 p-3.5 rounded-xl bg-background-elevated/70 border border-primary/30 space-y-2">
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Replying to @${comment.author.username}...`}
              className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-border bg-background-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReplyingTo(null)}
                className="px-2.5 py-1 text-xs text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReplySubmit(comment.id)}
                className="px-3.5 py-1 text-xs font-semibold bg-primary hover:bg-orange-600 text-white rounded-lg shadow-sm shadow-primary/20"
              >
                Post Reply
              </button>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="pt-8 sm:pt-10 mt-8 sm:mt-12">
      {/* Highlighted Discussion Card */}
      <div className="rounded-3xl border border-primary/25 bg-background-surface/90 backdrop-blur-md p-5 sm:p-8 shadow-xl shadow-black/10 space-y-6">
        {/* Header with pill badge and prominent counts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
                Community Discussion
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary text-white shadow-sm shadow-primary/25">
                {comments.length} {comments.length === 1 ? 'Response' : 'Responses'}
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Reader Perspectives</span>
            </h3>
          </div>
          <p className="text-xs text-foreground-muted sm:text-right max-w-xs">
            Join the conversation. Thoughtful feedback elevates every story.
          </p>
        </div>

        {/* Main Comment Input */}
        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-2">
            <div className="p-3.5 rounded-2xl bg-background-elevated/50 border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 shadow-sm transition-all">
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="What are your thoughts on this story? Share your perspective..."
                className="w-full text-xs sm:text-sm bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between pt-2.5 border-t border-border/50 mt-2">
                <div className="flex items-center gap-2">
                  <img
                    src={
                      user.avatar_url ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`
                    }
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-foreground-muted font-medium">@{user.username}</span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white transition-all shadow-sm shadow-primary/25 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : 'Respond'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 text-center">
            <p className="text-sm font-semibold mb-1 text-foreground">Join the conversation</p>
            <p className="text-xs text-foreground-muted mb-4 max-w-sm mx-auto">
              Sign in to share your thoughts, engage with the author, and connect with other readers.
            </p>
            <button
              onClick={onOpenLogin}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white transition-colors shadow-md shadow-primary/20 cursor-pointer"
            >
              Sign in to Comment
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3 pt-2">
          {isLoadingComments ? (
            <div className="space-y-4 py-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-border/60 bg-background-elevated/30 space-y-2 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-border" />
                    <div className="w-32 h-3.5 bg-border rounded" />
                  </div>
                  <div className="w-full h-8 bg-border/40 rounded-xl" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-background-elevated/20">
              <MessageSquare className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-40" />
              <p className="text-xs sm:text-sm font-medium text-foreground">No responses yet</p>
              <p className="text-xs text-foreground-muted mt-0.5">Be the first to share your perspective on this story!</p>
            </div>
          ) : (
            comments.map((c) => renderComment(c))
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType="comment"
          targetId={reportTarget.id}
          targetTitle={reportTarget.text}
        />
      )}
    </section>
  );
};
