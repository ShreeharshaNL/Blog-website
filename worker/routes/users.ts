import { Hono, Context } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const usersApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

function cleanUsername(raw: string | undefined): string {
  if (!raw) return '';
  return (raw.startsWith('@') ? raw.slice(1) : raw).toLowerCase();
}

async function handleUserProfile(c: Context<{ Bindings: Env; Variables: HonoVariables }>) {
  const username = cleanUsername(c.req.param('username'));
  const currentUser = c.get('user');

  // Query user info
  const user = await c.env.DB.prepare(
    `SELECT id, username, display_name, avatar_url, bio, role, status, points, level, created_at
     FROM users
     WHERE username = ? AND status != 'banned'`
  ).bind(username).first<any>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Aggregate stats: total published blogs, total verified views, total genuine likes
  const stats = await c.env.DB.prepare(
    `SELECT
       COUNT(id) as total_blogs,
       COALESCE(SUM(view_count), 0) as total_views,
       COALESCE(SUM(like_count), 0) as total_likes
     FROM blogs
     WHERE author_id = ? AND status = 'published'`
  ).bind(user.id).first<any>();

  // Followers & Following counts
  const followersCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`
  ).bind(user.id).first<{ count: number }>();

  const followingCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM followers WHERE follower_id = ?`
  ).bind(user.id).first<{ count: number }>();

  // Check if current user is following
  let isFollowing = false;
  if (currentUser && currentUser.id !== user.id) {
    const followCheck = await c.env.DB.prepare(
      `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`
    ).bind(currentUser.id, user.id).first();
    isFollowing = Boolean(followCheck);
  }

  // Fetch unlocked badges
  const { results: badges } = await c.env.DB.prepare(
    `SELECT a.id, a.code, a.name, a.description, a.icon, a.badge_points
     FROM achievements a
     JOIN user_achievements ua ON a.id = ua.achievement_id
     WHERE ua.user_id = ?
     ORDER BY ua.awarded_at DESC`
  ).bind(user.id).all<any>();

  // Fetch author's published blogs
  const { results: blogs } = await c.env.DB.prepare(
    `SELECT b.id, b.title, b.slug, b.description, b.cover_image, b.published_at,
            b.reading_time_minutes, b.view_count, b.like_count, b.is_editor_pick,
            c.id as category_id, c.name as category_name, c.slug as category_slug
     FROM blogs b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.author_id = ? AND b.status = 'published'
     ORDER BY b.published_at DESC
     LIMIT 20`
  ).bind(user.id).all<any>();

  const formattedBlogs = blogs.map(b => ({
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
    category: b.category_id ? { id: b.category_id, name: b.category_name, slug: b.category_slug } : null,
  }));

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      role: user.role,
      points: user.points,
      level: user.level,
      total_blogs: stats?.total_blogs || 0,
      total_views: stats?.total_views || 0,
      total_likes: stats?.total_likes || 0,
      followers_count: followersCount?.count || 0,
      following_count: followingCount?.count || 0,
      is_following: isFollowing,
      created_at: user.created_at,
      badges,
    },
    blogs: formattedBlogs,
  });
}

async function handleFollow(c: Context<{ Bindings: Env; Variables: HonoVariables }>) {
  const currentUser = requireAuth(c);
  const username = cleanUsername(c.req.param('username'));

  const targetUser = await c.env.DB.prepare(
    `SELECT id, username FROM users WHERE username = ?`
  ).bind(username).first<{ id: string; username: string }>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (targetUser.id === currentUser.id) {
    return c.json({ error: 'You cannot follow yourself' }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`
  ).bind(currentUser.id, targetUser.id).first();

  const now = Date.now();

  if (existing) {
    // Unfollow
    await c.env.DB.prepare(
      `DELETE FROM followers WHERE follower_id = ? AND following_id = ?`
    ).bind(currentUser.id, targetUser.id).run();

    return c.json({ is_following: false });
  } else {
    // Follow
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO followers (follower_id, following_id, created_at)
         VALUES (?, ?, ?)`
      ).bind(currentUser.id, targetUser.id, now),

      c.env.DB.prepare(
        `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, ?, 'follow', 'New Follower', ?, ?, 0, ?)`
      ).bind(
        'notif_' + crypto.randomUUID().slice(0, 16),
        targetUser.id,
        currentUser.id,
        `@${currentUser.username} started following you`,
        `/@${currentUser.username}`,
        now
      )
    ]);

    return c.json({ is_following: true });
  }
}

// User Profile (matches both /api/users/@username and /api/users/username)
usersApp.get('/:username', handleUserProfile);

// Toggle Follow (matches /api/users/@username/follow and /api/users/username/follow)
usersApp.post('/:username/follow', handleFollow);

// Followers list
usersApp.get('/:username/followers', async (c) => {
  const username = cleanUsername(c.req.param('username'));
  const targetUser = await c.env.DB.prepare(
    `SELECT id FROM users WHERE username = ?`
  ).bind(username).first<{ id: string }>();

  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.points, u.level
     FROM followers f
     JOIN users u ON f.follower_id = u.id
     WHERE f.following_id = ?
     ORDER BY f.created_at DESC`
  ).bind(targetUser.id).all();

  return c.json({ followers: results });
});

// Following list
usersApp.get('/:username/following', async (c) => {
  const username = cleanUsername(c.req.param('username'));
  const targetUser = await c.env.DB.prepare(
    `SELECT id FROM users WHERE username = ?`
  ).bind(username).first<{ id: string }>();

  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.points, u.level
     FROM followers f
     JOIN users u ON f.following_id = u.id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`
  ).bind(targetUser.id).all();

  return c.json({ following: results });
});

export default usersApp;
