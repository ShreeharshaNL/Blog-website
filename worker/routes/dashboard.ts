import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const dashboardApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/dashboard/overview - Author stats & metrics
dashboardApp.get('/overview', async (c) => {
  const user = requireAuth(c);

  // Fetch full user state including show_dislike_stats preference
  const fullUser = await c.env.DB.prepare(
    `SELECT points, level, show_dislike_stats FROM users WHERE id = ?`
  ).bind(user.id).first<{ points: number; level: number; show_dislike_stats: number }>();

  // Aggregate stats across published blogs
  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(id) as total_blogs,
       COALESCE(SUM(view_count), 0) as total_views,
       COALESCE(SUM(like_count), 0) as total_likes,
       COALESCE(SUM(dislike_count), 0) as total_dislikes
     FROM blogs
     WHERE author_id = ? AND status = 'published'`
  ).bind(user.id).first<any>();

  // Total comments received
  const commentsCount = await c.env.DB.prepare(
    `SELECT COUNT(c.id) as count
     FROM comments c
     JOIN blogs b ON c.blog_id = b.id
     WHERE b.author_id = ?`
  ).bind(user.id).first<{ count: number }>();

  // Followers count
  const followersCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`
  ).bind(user.id).first<{ count: number }>();

  const totalViews = stats?.total_views || 0;
  const totalLikes = stats?.total_likes || 0;
  const totalComments = commentsCount?.count || 0;
  const totalDislikes = stats?.total_dislikes || 0;
  const showDislikes = Boolean(fullUser?.show_dislike_stats);

  // Engagement rate: (likes + comments) / views * 100
  const engagementRate = totalViews > 0
    ? Number((((totalLikes + totalComments) / totalViews) * 100).toFixed(1))
    : 0;

  // Views timeline for past 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const { results: viewRecords } = await c.env.DB.prepare(
    `SELECT
       strftime('%Y-%m-%d', bv.viewed_at / 1000, 'unixepoch') as view_date,
       COUNT(bv.id) as views
     FROM blog_views bv
     JOIN blogs b ON bv.blog_id = b.id
     WHERE b.author_id = ? AND bv.viewed_at >= ?
     GROUP BY view_date
     ORDER BY view_date ASC`
  ).bind(user.id, thirtyDaysAgo).all<{ view_date: string; views: number }>();

  // Top 5 blogs
  const { results: topBlogs } = await c.env.DB.prepare(
    `SELECT id, title, slug, cover_image, view_count, like_count, dislike_count, published_at
     FROM blogs
     WHERE author_id = ? AND status = 'published'
     ORDER BY view_count DESC, like_count DESC
     LIMIT 5`
  ).bind(user.id).all<any>();

  const sanitizedTopBlogs = topBlogs.map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    cover_image: b.cover_image,
    view_count: b.view_count,
    like_count: b.like_count,
    published_at: b.published_at,
    // Only include private dislike count if author enabled it
    ...(showDislikes ? { dislike_count: b.dislike_count } : {}),
  }));

  return c.json({
    overview: {
      total_blogs: stats?.total_blogs || 0,
      total_views: totalViews,
      total_likes: totalLikes,
      private_dislike_count: showDislikes ? totalDislikes : null,
      show_dislike_stats: showDislikes,
      total_points: fullUser?.points || 0,
      level: fullUser?.level || 1,
      followers: followersCount?.count || 0,
      engagement_rate: engagementRate,
    },
    views_timeline: viewRecords.map(r => ({ date: r.view_date, views: r.views })),
    top_blogs: sanitizedTopBlogs,
  });
});

// GET /api/dashboard/blogs - Manage author's blogs
dashboardApp.get('/blogs', async (c) => {
  const user = requireAuth(c);
  const status = c.req.query('status'); // 'published' | 'draft' | 'scheduled' | 'unlisted'

  let query = `
    SELECT
      b.id, b.title, b.slug, b.description, b.cover_image, b.status,
      b.scheduled_at, b.published_at, b.reading_time_minutes, b.word_count,
      b.view_count, b.like_count, b.dislike_count, b.is_editor_pick,
      b.created_at, b.updated_at,
      c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM blogs b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.author_id = ?
  `;
  const params: any[] = [user.id];

  if (status) {
    query += ` AND b.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY b.updated_at DESC`;

  const [blogsResult, userRow] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<any>(),
    c.env.DB.prepare(`SELECT show_dislike_stats FROM users WHERE id = ?`).bind(user.id).first<{ show_dislike_stats: number }>(),
  ]);

  const showDislikes = Boolean(userRow?.show_dislike_stats);

  const blogs = blogsResult.results.map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    description: b.description,
    cover_image: b.cover_image,
    status: b.status,
    scheduled_at: b.scheduled_at,
    published_at: b.published_at,
    reading_time_minutes: b.reading_time_minutes,
    word_count: b.word_count,
    view_count: b.view_count,
    like_count: b.like_count,
    is_editor_pick: Boolean(b.is_editor_pick),
    created_at: b.created_at,
    updated_at: b.updated_at,
    category: b.category_id ? { id: b.category_id, name: b.category_name, slug: b.category_slug } : null,
    // Private dislike count visible only if author enabled it
    ...(showDislikes ? { dislike_count: b.dislike_count } : {}),
  }));

  return c.json({ blogs, show_dislike_stats: showDislikes });
});

export default dashboardApp;
