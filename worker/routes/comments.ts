import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const commentsApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/blogs/:id/comments - List comments for a blog
commentsApp.get('/:id/comments', async (c) => {
  const blogId = c.req.param('id');
  const currentUser = c.get('user');

  const query = `
    SELECT
      c.id, c.blog_id, c.author_id, c.parent_id, c.content, c.like_count,
      c.is_pinned, c.is_reported, c.created_at, c.updated_at,
      u.id as u_id, u.username as u_username, u.display_name as u_name,
      u.avatar_url as u_avatar, u.points as u_points, u.level as u_level
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE c.blog_id = ?
    ORDER BY c.is_pinned DESC, c.created_at ASC
  `;

  const { results } = await c.env.DB.prepare(query).bind(blogId).all<any>();

  // Fetch user reactions to comments if logged in
  let userReactions: Record<string, boolean> = {};
  if (currentUser && results.length > 0) {
    const commentIds = results.map(r => r.id);
    const placeholders = commentIds.map(() => '?').join(',');
    const reactions = await c.env.DB.prepare(
      `SELECT comment_id FROM comment_reactions WHERE user_id = ? AND comment_id IN (${placeholders})`
    ).bind(currentUser.id, ...commentIds).all<{ comment_id: string }>();

    for (const r of reactions.results) {
      userReactions[r.comment_id] = true;
    }
  }

  // Build threaded tree
  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  for (const row of results) {
    const formatted = {
      id: row.id,
      blog_id: row.blog_id,
      author_id: row.author_id,
      parent_id: row.parent_id,
      content: row.content,
      like_count: row.like_count,
      is_pinned: Boolean(row.is_pinned),
      is_reported: Boolean(row.is_reported),
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_reaction: userReactions[row.id] ? 'like' : null,
      author: {
        id: row.u_id,
        username: row.u_username,
        display_name: row.u_name,
        avatar_url: row.u_avatar,
        points: row.u_points,
        level: row.u_level,
      },
      replies: [],
    };
    commentMap.set(row.id, formatted);
  }

  for (const row of results) {
    const item = commentMap.get(row.id);
    if (row.parent_id && commentMap.has(row.parent_id)) {
      commentMap.get(row.parent_id).replies.push(item);
    } else {
      rootComments.push(item);
    }
  }

  return c.json({ comments: rootComments });
});

// POST /api/blogs/:id/comments - Add comment
const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: z.string().optional().nullable(),
});

commentsApp.post('/:id/comments', async (c) => {
  const user = requireAuth(c);
  const blogId = c.req.param('id');
  const body = await c.req.json();
  const parsed = addCommentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
  }

  // Verify blog exists
  const blog = await c.env.DB.prepare(
    `SELECT id, author_id, title FROM blogs WHERE id = ?`
  ).bind(blogId).first<{ id: string; author_id: string; title: string }>();

  if (!blog) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  const { content, parent_id } = parsed.data;
  const now = Date.now();
  const commentId = 'cmt_' + crypto.randomUUID().slice(0, 16);

  await c.env.DB.prepare(
    `INSERT INTO comments (id, blog_id, author_id, parent_id, content, like_count, is_pinned, is_reported, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`
  ).bind(commentId, blog.id, user.id, parent_id || null, content, now, now).run();

  // Notifications:
  if (parent_id) {
    // Reply notification to parent comment author
    const parentComment = await c.env.DB.prepare(
      `SELECT author_id FROM comments WHERE id = ?`
    ).bind(parent_id).first<{ author_id: string }>();

    if (parentComment && parentComment.author_id !== user.id) {
      await c.env.DB.prepare(
        `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, ?, 'reply', 'New Reply', ?, ?, 0, ?)`
      ).bind(
        'notif_' + crypto.randomUUID().slice(0, 16),
        parentComment.author_id,
        user.id,
        `@${user.username} replied to your comment`,
        `/blog/${blogId}#comment-${commentId}`,
        now
      ).run();
    }
  } else if (blog.author_id !== user.id) {
    // Comment notification to blog author
    await c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, 'comment', 'New Comment', ?, ?, 0, ?)`
    ).bind(
      'notif_' + crypto.randomUUID().slice(0, 16),
      blog.author_id,
      user.id,
      `@${user.username} commented on "${blog.title}"`,
      `/blog/${blogId}#comment-${commentId}`,
      now
    ).run();
  }

  return c.json({
    success: true,
    comment: {
      id: commentId,
      blog_id: blogId,
      author_id: user.id,
      parent_id: parent_id || null,
      content,
      like_count: 0,
      is_pinned: false,
      is_reported: false,
      created_at: now,
      updated_at: now,
      author: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        points: user.points,
        level: user.level,
      },
      replies: [],
    },
  }, 201);
});

// PUT /api/comments/:id - Edit comment
commentsApp.put('/items/:id', async (c) => {
  const user = requireAuth(c);
  const commentId = c.req.param('id');
  const body = await c.req.json();
  const parsed = z.object({ content: z.string().min(1).max(2000) }).safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed' }, 400);
  }

  const comment = await c.env.DB.prepare(
    `SELECT author_id FROM comments WHERE id = ?`
  ).bind(commentId).first<{ author_id: string }>();

  if (!comment) return c.json({ error: 'Comment not found' }, 404);
  if (comment.author_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Unauthorized to edit this comment' }, 403);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    `UPDATE comments SET content = ?, updated_at = ? WHERE id = ?`
  ).bind(parsed.data.content, now, commentId).run();

  return c.json({ success: true, message: 'Comment updated' });
});

// DELETE /api/comments/:id - Delete comment
// Allowed for: Comment author, Blog author (moderation), or Admin
commentsApp.delete('/items/:id', async (c) => {
  const user = requireAuth(c);
  const commentId = c.req.param('id');

  const comment = await c.env.DB.prepare(
    `SELECT c.author_id, b.author_id as blog_author_id
     FROM comments c
     JOIN blogs b ON c.blog_id = b.id
     WHERE c.id = ?`
  ).bind(commentId).first<{ author_id: string; blog_author_id: string }>();

  if (!comment) return c.json({ error: 'Comment not found' }, 404);

  const isAuthor = comment.author_id === user.id;
  const isBlogOwner = comment.blog_author_id === user.id;
  const isStaff = user.role === 'admin' || user.role === 'moderator';

  if (!isAuthor && !isBlogOwner && !isStaff) {
    return c.json({ error: 'Unauthorized to delete this comment' }, 403);
  }

  await c.env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(commentId).run();

  return c.json({ success: true, message: 'Comment deleted' });
});

// POST /api/comments/items/:id/like - Toggle like on comment
commentsApp.post('/items/:id/like', async (c) => {
  const user = requireAuth(c);
  const commentId = c.req.param('id');

  const comment = await c.env.DB.prepare(
    `SELECT id, like_count FROM comments WHERE id = ?`
  ).bind(commentId).first<{ id: string; like_count: number }>();

  if (!comment) return c.json({ error: 'Comment not found' }, 404);

  const existing = await c.env.DB.prepare(
    `SELECT id FROM comment_reactions WHERE user_id = ? AND comment_id = ?`
  ).bind(user.id, commentId).first();

  let isLiked = false;
  let newCount = comment.like_count;

  if (existing) {
    // Unlike
    newCount = Math.max(0, comment.like_count - 1);
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM comment_reactions WHERE id = ?`).bind(existing.id),
      c.env.DB.prepare(`UPDATE comments SET like_count = MAX(0, like_count - 1) WHERE id = ?`).bind(commentId),
    ]);
    isLiked = false;
  } else {
    // Like
    newCount = comment.like_count + 1;
    const reactId = 'creact_' + crypto.randomUUID().slice(0, 16);
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO comment_reactions (id, user_id, comment_id, type, created_at)
         VALUES (?, ?, ?, 'like', ?)`
      ).bind(reactId, user.id, commentId, Date.now()),
      c.env.DB.prepare(`UPDATE comments SET like_count = like_count + 1 WHERE id = ?`).bind(commentId),
    ]);
    isLiked = true;
  }

  return c.json({ success: true, is_liked: isLiked, like_count: newCount });
});

export default commentsApp;
