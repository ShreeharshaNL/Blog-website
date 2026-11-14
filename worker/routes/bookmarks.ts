import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const bookmarksApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/bookmarks - User's saved reading list
bookmarksApp.get('/', async (c) => {
  const user = requireAuth(c);

  const query = `
    SELECT
      b.id, b.title, b.slug, b.description, b.cover_image, b.published_at,
      b.reading_time_minutes, b.view_count, b.like_count, b.is_editor_pick,
      u.id as author_id, u.username as author_username, u.display_name as author_name,
      u.avatar_url as author_avatar,
      c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM bookmarks bm
    JOIN blogs b ON bm.blog_id = b.id
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE bm.user_id = ?
    ORDER BY bm.created_at DESC
  `;

  const { results } = await c.env.DB.prepare(query).bind(user.id).all<any>();

  const bookmarks = results.map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    description: b.description,
    cover_image: b.cover_image,
    published_at: b.published_at,
    reading_time_minutes: b.reading_time_minutes,
    view_count: b.view_count,
    like_count: b.like_count,
    is_editor_pick: Boolean(b.is_editor_pick),
    author: {
      id: b.author_id,
      username: b.author_username,
      display_name: b.author_name,
      avatar_url: b.author_avatar,
    },
    category: b.category_id ? { id: b.category_id, name: b.category_name, slug: b.category_slug } : null,
  }));

  return c.json({ bookmarks });
});

// POST /api/bookmarks/:id/toggle - Toggle bookmark
async function handleBookmarkToggle(c: any) {
  const user = requireAuth(c);
  const blogId = c.req.param('id');

  const existing = await c.env.DB.prepare(
    `SELECT 1 FROM bookmarks WHERE user_id = ? AND blog_id = ?`
  ).bind(user.id, blogId).first();

  if (existing) {
    await c.env.DB.prepare(
      `DELETE FROM bookmarks WHERE user_id = ? AND blog_id = ?`
    ).bind(user.id, blogId).run();
    return c.json({ success: true, is_bookmarked: false });
  } else {
    await c.env.DB.prepare(
      `INSERT INTO bookmarks (user_id, blog_id, created_at) VALUES (?, ?, ?)`
    ).bind(user.id, blogId, Date.now()).run();
    return c.json({ success: true, is_bookmarked: true });
  }
}

bookmarksApp.post('/:id/toggle', handleBookmarkToggle);
bookmarksApp.post('/:id/bookmark', handleBookmarkToggle);

export default bookmarksApp;
