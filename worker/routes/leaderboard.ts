import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const leaderboardApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/leaderboard - Top writers & stories
leaderboardApp.get('/', async (c) => {
  const timeframe = c.req.query('timeframe') || 'all'; // 'weekly' | 'monthly' | 'all'

  let timeFilter = 0;
  if (timeframe === 'weekly') {
    timeFilter = Date.now() - 7 * 24 * 60 * 60 * 1000;
  } else if (timeframe === 'monthly') {
    timeFilter = Date.now() - 30 * 24 * 60 * 60 * 1000;
  }

  let writersQuery = '';
  let writersParams: any[] = [];

  if (timeFilter > 0) {
    // Ranked by points earned within timeframe from transactions ledger
    writersQuery = `
      SELECT
        u.id, u.username, u.display_name, u.avatar_url, u.level,
        COALESCE(SUM(pt.amount), 0) as period_points,
        u.points as total_points,
        COUNT(DISTINCT b.id) as total_blogs,
        COALESCE(SUM(b.view_count), 0) as total_views
      FROM users u
      LEFT JOIN points_transactions pt ON u.id = pt.user_id AND pt.created_at >= ? AND pt.is_reversed = 0
      LEFT JOIN blogs b ON u.id = b.author_id AND b.status = 'published'
      WHERE u.status = 'active'
      GROUP BY u.id
      ORDER BY period_points DESC, total_points DESC
      LIMIT 25
    `;
    writersParams = [timeFilter];
  } else {
    // All-time top writers by points
    writersQuery = `
      SELECT
        u.id, u.username, u.display_name, u.avatar_url, u.points as total_points, u.level,
        u.points as period_points,
        COUNT(DISTINCT b.id) as total_blogs,
        COALESCE(SUM(b.view_count), 0) as total_views
      FROM users u
      LEFT JOIN blogs b ON u.id = b.author_id AND b.status = 'published'
      WHERE u.status = 'active'
      GROUP BY u.id
      ORDER BY u.points DESC
      LIMIT 25
    `;
  }

  const { results: rawWriters } = await c.env.DB.prepare(writersQuery).bind(...writersParams).all<any>();

  // Fetch badges for top writers
  const writersWithBadges = await Promise.all(
    rawWriters.map(async (w, index) => {
      const { results: badges } = await c.env.DB.prepare(
        `SELECT a.id, a.code, a.name, a.icon, a.badge_points
         FROM achievements a
         JOIN user_achievements ua ON a.id = ua.achievement_id
         WHERE ua.user_id = ?
         LIMIT 4`
      ).bind(w.id).all();

      return {
        rank: index + 1,
        id: w.id,
        username: w.username,
        display_name: w.display_name,
        avatar_url: w.avatar_url,
        points: w.period_points,
        total_points: w.total_points,
        level: w.level,
        total_blogs: w.total_blogs || 0,
        total_views: w.total_views || 0,
        badges,
      };
    })
  );

  return c.json({
    writers: writersWithBadges,
    timeframe,
  });
});

// GET /api/points/history - User points ledger history
leaderboardApp.get('/history', async (c) => {
  const user = requireAuth(c);
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const query = `
    SELECT id, amount, transaction_type, reference_id, description, is_reversed, created_at
    FROM points_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM points_transactions WHERE user_id = ?
  `;

  const [txResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(user.id, limit, offset).all<any>(),
    c.env.DB.prepare(countQuery).bind(user.id).first<{ total: number }>(),
  ]);

  return c.json({
    transactions: txResult.results,
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
    },
  });
});

// GET /api/achievements - All achievements list & user unlocked
leaderboardApp.get('/achievements', async (c) => {
  const user = c.get('user');

  const { results: allAchievements } = await c.env.DB.prepare(
    `SELECT id, code, name, description, icon, badge_points FROM achievements ORDER BY badge_points ASC`
  ).all<any>();

  let unlockedIds: Set<string> = new Set();
  if (user) {
    const { results: userAchievements } = await c.env.DB.prepare(
      `SELECT achievement_id FROM user_achievements WHERE user_id = ?`
    ).bind(user.id).all<{ achievement_id: string }>();

    for (const ua of userAchievements) {
      unlockedIds.add(ua.achievement_id);
    }
  }

  const list = allAchievements.map(a => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
  }));

  return c.json({ achievements: list });
});

export default leaderboardApp;
