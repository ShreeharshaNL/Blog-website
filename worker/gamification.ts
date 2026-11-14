import { calculateLevel } from '../src/utils/gamification';

export interface RewardConfig {
  reward_publish_blog: number;
  reward_100_views: number;
  reward_10_likes: number;
  reward_editor_pick: number;
  reward_quality_badge: number;
  reward_streak_7days: number;
}

export async function getRewardConfig(db: D1Database): Promise<RewardConfig> {
  const defaults: RewardConfig = {
    reward_publish_blog: 20,
    reward_100_views: 5,
    reward_10_likes: 5,
    reward_editor_pick: 50,
    reward_quality_badge: 30,
    reward_streak_7days: 25,
  };

  try {
    const { results } = await db.prepare(
      `SELECT key, value FROM platform_settings WHERE key LIKE 'reward_%'`
    ).all<{ key: string; value: string }>();

    for (const row of results) {
      if (row.key in defaults) {
        (defaults as any)[row.key] = parseInt(row.value, 10) || (defaults as any)[row.key];
      }
    }
  } catch (err) {
    console.error('Error fetching reward settings:', err);
  }

  return defaults;
}

/**
 * Executes a point grant within an immutable transaction ledger.
 * Updates user total points, recalculates level, and creates notification.
 */
export async function awardPoints(
  db: D1Database,
  userId: string,
  amount: number,
  transactionType: string,
  description: string,
  referenceId?: string | null
): Promise<{ newPoints: number; newLevel: number } | null> {
  if (amount <= 0) return null;

  const now = Date.now();
  const txId = 'ptx_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  // 1. Fetch current user
  const user = await db.prepare(
    `SELECT points, level FROM users WHERE id = ?`
  ).bind(userId).first<{ points: number; level: number }>();

  if (!user) return null;

  const newPoints = user.points + amount;
  const levelInfo = calculateLevel(newPoints);
  const newLevel = levelInfo.level;

  // 2. Batch update: insert ledger record, update user points and level
  const batchStatements = [
    db.prepare(
      `INSERT INTO points_transactions (id, user_id, amount, transaction_type, reference_id, description, is_reversed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(txId, userId, amount, transactionType, referenceId || null, description, now),

    db.prepare(
      `UPDATE users SET points = ?, level = ?, updated_at = ? WHERE id = ?`
    ).bind(newPoints, newLevel, now, userId),

    db.prepare(
      `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, NULL, 'points', ?, ?, ?, 0, ?)`
    ).bind(
      'notif_' + crypto.randomUUID().slice(0, 16),
      userId,
      `+${amount} Points Earned!`,
      description,
      '/dashboard/points',
      now
    )
  ];

  // If level increased, add a level-up notification
  if (newLevel > user.level) {
    batchStatements.push(
      db.prepare(
        `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, NULL, 'badge', ?, ?, ?, 0, ?)`
      ).bind(
        'notif_' + crypto.randomUUID().slice(0, 16),
        userId,
        `Level Up! You reached Level ${newLevel}: ${levelInfo.name}`,
        `Congratulations on reaching ${levelInfo.name} with ${newPoints} total points!`,
        '/dashboard/points',
        now
      )
    );
  }

  await db.batch(batchStatements);

  return { newPoints, newLevel };
}

/**
 * Check and award view milestone points for a blog (+5 points per 100 views)
 */
export async function checkViewMilestones(
  db: D1Database,
  blogId: string,
  authorId: string,
  currentViews: number
) {
  if (currentViews < 100) return;

  const milestoneNumber = Math.floor(currentViews / 100) * 100;
  const refKey = `${blogId}_views_${milestoneNumber}`;

  // Check if already awarded
  const existing = await db.prepare(
    `SELECT id FROM points_transactions WHERE reference_id = ? AND transaction_type = 'views_milestone'`
  ).bind(refKey).first();

  if (!existing) {
    const config = await getRewardConfig(db);
    await awardPoints(
      db,
      authorId,
      config.reward_100_views,
      'views_milestone',
      `Reached ${milestoneNumber.toLocaleString()} verified readers on your blog`,
      refKey
    );
  }

  // Check author total views for 1K / 10K views achievements
  await checkAuthorViewAchievements(db, authorId);
}

/**
 * Check and award like milestone points for a blog (+5 points per 10 likes)
 */
export async function checkLikeMilestones(
  db: D1Database,
  blogId: string,
  authorId: string,
  currentLikes: number
) {
  if (currentLikes < 10) return;

  const milestoneNumber = Math.floor(currentLikes / 10) * 10;
  const refKey = `${blogId}_likes_${milestoneNumber}`;

  // Check if already awarded
  const existing = await db.prepare(
    `SELECT id FROM points_transactions WHERE reference_id = ? AND transaction_type = 'likes_milestone'`
  ).bind(refKey).first();

  if (!existing) {
    const config = await getRewardConfig(db);
    await awardPoints(
      db,
      authorId,
      config.reward_10_likes,
      'likes_milestone',
      `Reached ${milestoneNumber} genuine likes on your blog`,
      refKey
    );
  }

  // Check author total likes for 100 likes achievement
  await checkAuthorLikeAchievements(db, authorId);
}

/**
 * Check and award achievements
 */
export async function awardAchievement(
  db: D1Database,
  userId: string,
  achievementCode: string
) {
  const achievement = await db.prepare(
    `SELECT id, name, badge_points FROM achievements WHERE code = ?`
  ).bind(achievementCode).first<{ id: string; name: string; badge_points: number }>();

  if (!achievement) return;

  // Check if already awarded
  const existing = await db.prepare(
    `SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?`
  ).bind(userId, achievement.id).first();

  if (existing) return;

  const now = Date.now();
  const userAchId = 'uach_' + crypto.randomUUID().slice(0, 16);

  await db.batch([
    db.prepare(
      `INSERT INTO user_achievements (id, user_id, achievement_id, awarded_at)
       VALUES (?, ?, ?, ?)`
    ).bind(userAchId, userId, achievement.id, now),

    db.prepare(
      `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, NULL, 'badge', ?, ?, ?, 0, ?)`
    ).bind(
      'notif_' + crypto.randomUUID().slice(0, 16),
      userId,
      `New Badge Unlocked: ${achievement.name}!`,
      `You earned the ${achievement.name} achievement badge and +${achievement.badge_points} bonus points!`,
      '/dashboard/points',
      now
    )
  ]);

  // Award badge bonus points
  await awardPoints(
    db,
    userId,
    achievement.badge_points,
    'badge_earned',
    `Unlocked badge: ${achievement.name}`,
    achievement.id
  );
}

async function checkAuthorViewAchievements(db: D1Database, authorId: string) {
  const stats = await db.prepare(
    `SELECT SUM(view_count) as total_views FROM blogs WHERE author_id = ? AND status = 'published'`
  ).bind(authorId).first<{ total_views: number }>();

  const total = stats?.total_views || 0;
  if (total >= 1000) {
    await awardAchievement(db, authorId, 'views_1k');
  }
  if (total >= 10000) {
    await awardAchievement(db, authorId, 'views_10k');
  }
}

async function checkAuthorLikeAchievements(db: D1Database, authorId: string) {
  const stats = await db.prepare(
    `SELECT SUM(like_count) as total_likes FROM blogs WHERE author_id = ? AND status = 'published'`
  ).bind(authorId).first<{ total_likes: number }>();

  const total = stats?.total_likes || 0;
  if (total >= 100) {
    await awardAchievement(db, authorId, 'likes_100');
  }
}

/**
 * Check 7-day writing streak
 */
export async function checkWritingStreak(db: D1Database, userId: string) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentBlogs = await db.prepare(
    `SELECT COUNT(DISTINCT strftime('%Y-%m-%d', published_at / 1000, 'unixepoch')) as active_days
     FROM blogs
     WHERE author_id = ? AND status = 'published' AND published_at >= ?`
  ).bind(userId, sevenDaysAgo).first<{ active_days: number }>();

  if ((recentBlogs?.active_days || 0) >= 7) {
    await awardAchievement(db, userId, 'consistent_writer');
  }
}
