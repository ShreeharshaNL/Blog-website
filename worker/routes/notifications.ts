import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const notifApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/notifications
notifApp.get('/', async (c) => {
  const user = requireAuth(c);
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = 25;
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      n.id, n.user_id, n.actor_id, n.type, n.title, n.message, n.link, n.is_read, n.created_at,
      u.username as actor_username, u.display_name as actor_name, u.avatar_url as actor_avatar
    FROM notifications n
    LEFT JOIN users u ON n.actor_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const { results } = await c.env.DB.prepare(query).bind(user.id, limit, offset).all<any>();

  const notifications = results.map(n => ({
    id: n.id,
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    is_read: Boolean(n.is_read),
    created_at: n.created_at,
    actor: n.actor_id ? {
      id: n.actor_id,
      username: n.actor_username,
      display_name: n.actor_name,
      avatar_url: n.actor_avatar,
    } : null,
  }));

  const unreadCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`
  ).bind(user.id).first<{ count: number }>();

  return c.json({
    notifications,
    unread_count: unreadCount?.count || 0,
  });
});

// POST /api/notifications/mark-read
notifApp.post('/mark-read', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json().catch(() => ({}));
  const notifId = body.id;

  if (notifId) {
    await c.env.DB.prepare(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`
    ).bind(notifId, user.id).run();
  } else {
    // Mark all as read
    await c.env.DB.prepare(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`
    ).bind(user.id).run();
  }

  return c.json({ success: true });
});

export default notifApp;
