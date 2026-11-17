import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';
import { checkLikeMilestones } from '../gamification';

const reactionsApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const reactionSchema = z.object({
  type: z.enum(['like', 'dislike']),
});

// POST /api/blogs/:id/reaction
reactionsApp.post('/:id/reaction', async (c) => {
  const user = requireAuth(c);
  const blogId = c.req.param('id');
  const body = await c.req.json();
  const parsed = reactionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid reaction type. Must be "like" or "dislike"' }, 400);
  }

  const requestedType = parsed.data.type;
  const now = Date.now();

  // Check blog exists (supports either blog ID or slug)
  const blog = await c.env.DB.prepare(
    `SELECT id, author_id, like_count, dislike_count FROM blogs WHERE id = ? OR slug = ?`
  ).bind(blogId, blogId).first<{ id: string; author_id: string; like_count: number; dislike_count: number }>();

  if (!blog) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  // Check existing reaction by this user
  const existing = await c.env.DB.prepare(
    `SELECT id, type FROM reactions WHERE user_id = ? AND blog_id = ?`
  ).bind(user.id, blog.id).first<{ id: string; type: 'like' | 'dislike' }>();

  let newReaction: 'like' | 'dislike' | null = null;
  let newLikeCount = blog.like_count;

  if (!existing) {
    // 1. New reaction
    newReaction = requestedType;
    const reactionId = 'react_' + crypto.randomUUID().slice(0, 16);

    if (requestedType === 'like') {
      newLikeCount = blog.like_count + 1;
      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO reactions (id, user_id, blog_id, type, created_at)
           VALUES (?, ?, ?, 'like', ?)`
        ).bind(reactionId, user.id, blog.id, now),
        c.env.DB.prepare(
          `UPDATE blogs SET like_count = like_count + 1 WHERE id = ?`
        ).bind(blog.id),
      ]);

      // If reactor is not the author, notify author & check like milestones
      if (user.id !== blog.author_id) {
        await c.env.DB.prepare(
          `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
           VALUES (?, ?, ?, 'like', 'New Like', ?, ?, 0, ?)`
        ).bind(
          'notif_' + crypto.randomUUID().slice(0, 16),
          blog.author_id,
          user.id,
          `@${user.username} liked your story`,
          `/blog/${blogId}`,
          now
        ).run();

        await checkLikeMilestones(c.env.DB, blog.id, blog.author_id, newLikeCount);
      }
    } else {
      // Dislike: increment private dislike counter
      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO reactions (id, user_id, blog_id, type, created_at)
           VALUES (?, ?, ?, 'dislike', ?)`
        ).bind(reactionId, user.id, blog.id, now),
        c.env.DB.prepare(
          `UPDATE blogs SET dislike_count = dislike_count + 1 WHERE id = ?`
        ).bind(blog.id),
      ]);
    }
  } else if (existing.type === requestedType) {
    // 2. Toggle off: user clicked the same active reaction -> remove it
    newReaction = null;

    if (requestedType === 'like') {
      newLikeCount = Math.max(0, blog.like_count - 1);
      await c.env.DB.batch([
        c.env.DB.prepare(
          `DELETE FROM reactions WHERE id = ?`
        ).bind(existing.id),
        c.env.DB.prepare(
          `UPDATE blogs SET like_count = MAX(0, like_count - 1) WHERE id = ?`
        ).bind(blog.id),
      ]);
    } else {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `DELETE FROM reactions WHERE id = ?`
        ).bind(existing.id),
        c.env.DB.prepare(
          `UPDATE blogs SET dislike_count = MAX(0, dislike_count - 1) WHERE id = ?`
        ).bind(blog.id),
      ]);
    }
  } else {
    // 3. Switch reaction (e.g. from dislike to like, or like to dislike)
    newReaction = requestedType;

    if (requestedType === 'like') {
      // Switched from dislike to like
      newLikeCount = blog.like_count + 1;
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE reactions SET type = 'like', created_at = ? WHERE id = ?`
        ).bind(now, existing.id),
        c.env.DB.prepare(
          `UPDATE blogs SET like_count = like_count + 1, dislike_count = MAX(0, dislike_count - 1) WHERE id = ?`
        ).bind(blog.id),
      ]);

      if (user.id !== blog.author_id) {
        await checkLikeMilestones(c.env.DB, blog.id, blog.author_id, newLikeCount);
      }
    } else {
      // Switched from like to dislike
      newLikeCount = Math.max(0, blog.like_count - 1);
      await c.env.DB.batch([
        c.env.DB.prepare(
          `UPDATE reactions SET type = 'dislike', created_at = ? WHERE id = ?`
        ).bind(now, existing.id),
        c.env.DB.prepare(
          `UPDATE blogs SET like_count = MAX(0, like_count - 1), dislike_count = dislike_count + 1 WHERE id = ?`
        ).bind(blog.id),
      ]);
    }
  }

  // CRITICAL SECURITY ENFORCEMENT:
  // Public response only returns public like_count and the user's active reaction.
  // Never expose dislike counts!
  return c.json({
    success: true,
    user_reaction: newReaction,
    like_count: newLikeCount,
  });
});

export default reactionsApp;
