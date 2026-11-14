import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAdmin, requireStaff } from '../auth';
import { awardPoints } from '../gamification';

const adminApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Helper: record admin audit log
async function logAdminAction(
  db: D1Database,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: string,
  ip?: string
) {
  const logId = 'log_' + crypto.randomUUID().slice(0, 16);
  await db.prepare(
    `INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(logId, adminId, action, targetType, targetId, details || null, ip || null, Date.now()).run();
}

// GET /api/admin/stats - Platform Overview
adminApp.get('/stats', async (c) => {
  requireStaff(c);

  const [usersCount, blogsCount, viewsCount, reactionsCount] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM blogs WHERE status = 'published'`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COALESCE(SUM(view_count), 0) as count FROM blogs`).first<{ count: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as count FROM reactions`).first<{ count: number }>(),
  ]);

  // Active users in past 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeUsers = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE created_at >= ?`
  ).bind(oneDayAgo).first<{ count: number }>();

  // Category distribution
  const { results: popularCategories } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.slug, COUNT(b.id) as blog_count
     FROM categories c
     LEFT JOIN blogs b ON c.id = b.category_id AND b.status = 'published'
     GROUP BY c.id
     ORDER BY blog_count DESC`
  ).all();

  // Pending reports count
  const pendingReports = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`
  ).first<{ count: number }>();

  return c.json({
    stats: {
      total_users: usersCount?.count || 0,
      daily_active_users: activeUsers?.count || 0,
      total_blogs: blogsCount?.count || 0,
      total_views: viewsCount?.count || 0,
      total_reactions: reactionsCount?.count || 0,
      pending_reports: pendingReports?.count || 0,
    },
    popular_categories: popularCategories,
  });
});

// GET /api/admin/users - User Management
adminApp.get('/users', async (c) => {
  requireStaff(c);
  const search = c.req.query('search')?.trim();
  const role = c.req.query('role');
  const status = c.req.query('status');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  let whereClauses: string[] = ['1=1'];
  let params: any[] = [];

  if (search) {
    whereClauses.push('(username LIKE ? OR display_name LIKE ? OR email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (role) {
    whereClauses.push('role = ?');
    params.push(role);
  }
  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  const query = `
    SELECT id, email, username, display_name, avatar_url, role, status, points, level, created_at
    FROM users
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM users WHERE ${whereClauses.join(' AND ')}
  `;

  const [usersResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params, limit, offset).all<any>(),
    c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>(),
  ]);

  return c.json({
    users: usersResult.results,
    pagination: {
      page,
      limit,
      total: countResult?.total || 0,
    },
  });
});

// PATCH /api/admin/users/:id - Update Role / Suspend / Ban / Restore
adminApp.patch('/users/:id', async (c) => {
  const admin = requireAdmin(c);
  const targetId = c.req.param('id');
  const body = await c.req.json();
  const parsed = z.object({
    role: z.enum(['user', 'moderator', 'admin']).optional(),
    status: z.enum(['active', 'suspended', 'banned']).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed' }, 400);
  }

  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [Date.now()];

  if (parsed.data.role) {
    updates.push('role = ?');
    params.push(parsed.data.role);
  }
  if (parsed.data.status) {
    updates.push('status = ?');
    params.push(parsed.data.status);
    // If banned, invalidate sessions immediately
    if (parsed.data.status === 'banned') {
      await c.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(targetId).run();
    }
  }

  params.push(targetId);

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  await logAdminAction(
    c.env.DB,
    admin.id,
    'update_user',
    'user',
    targetId,
    JSON.stringify(parsed.data),
    c.req.header('cf-connecting-ip')
  );

  return c.json({ success: true, message: 'User updated' });
});

// GET /api/admin/reports - Content Moderation Reports
adminApp.get('/reports', async (c) => {
  requireStaff(c);
  const status = c.req.query('status') || 'pending';

  const query = `
    SELECT
      r.id, r.reporter_id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
      u.username as reporter_username, u.display_name as reporter_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    WHERE r.status = ?
    ORDER BY r.created_at DESC
  `;

  const { results } = await c.env.DB.prepare(query).bind(status).all<any>();
  return c.json({ reports: results });
});

// POST /api/admin/reports/:id/resolve - Resolve / Dismiss Report
adminApp.post('/reports/:id/resolve', async (c) => {
  const admin = requireStaff(c);
  const reportId = c.req.param('id');
  const body = await c.req.json();
  const parsed = z.object({
    action: z.enum(['resolved', 'dismissed']),
    delete_target: z.boolean().optional(),
  }).safeParse(body);

  if (!parsed.success) return c.json({ error: 'Validation failed' }, 400);

  const report = await c.env.DB.prepare(
    `SELECT target_type, target_id FROM reports WHERE id = ?`
  ).bind(reportId).first<{ target_type: string; target_id: string }>();

  if (!report) return c.json({ error: 'Report not found' }, 404);

  const now = Date.now();

  // If action is resolved and delete_target is true, delete the offending item
  if (parsed.data.action === 'resolved' && parsed.data.delete_target) {
    if (report.target_type === 'blog') {
      await c.env.DB.prepare(`DELETE FROM blogs WHERE id = ?`).bind(report.target_id).run();
    } else if (report.target_type === 'comment') {
      await c.env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(report.target_id).run();
    }
  }

  await c.env.DB.prepare(
    `UPDATE reports SET status = ?, resolved_by = ?, resolved_at = ? WHERE id = ?`
  ).bind(parsed.data.action, admin.id, now, reportId).run();

  await logAdminAction(
    c.env.DB,
    admin.id,
    'resolve_report',
    report.target_type,
    report.target_id,
    `Status: ${parsed.data.action}, Deleted: ${Boolean(parsed.data.delete_target)}`
  );

  return c.json({ success: true, message: 'Report handled' });
});

// POST /api/admin/blogs/:id/editor-pick - Toggle Editor's Pick
adminApp.post('/blogs/:id/editor-pick', async (c) => {
  const admin = requireStaff(c);
  const blogId = c.req.param('id');

  const blog = await c.env.DB.prepare(
    `SELECT id, author_id, title, is_editor_pick FROM blogs WHERE id = ?`
  ).bind(blogId).first<{ id: string; author_id: string; title: string; is_editor_pick: number }>();

  if (!blog) return c.json({ error: 'Blog not found' }, 404);

  const newStatus = blog.is_editor_pick ? 0 : 1;

  await c.env.DB.prepare(
    `UPDATE blogs SET is_editor_pick = ? WHERE id = ?`
  ).bind(newStatus, blogId).run();

  // If marked as editor pick, award +50 points!
  if (newStatus === 1) {
    const pickRef = `editor_pick_${blogId}`;
    const alreadyAwarded = await c.env.DB.prepare(
      `SELECT id FROM points_transactions WHERE reference_id = ? AND transaction_type = 'editors_pick'`
    ).bind(pickRef).first();

    if (!alreadyAwarded) {
      const config = await c.env.DB.prepare(
        `SELECT value FROM platform_settings WHERE key = 'reward_editor_pick'`
      ).first<{ value: string }>();
      const points = parseInt(config?.value || '50', 10);

      await awardPoints(
        c.env.DB,
        blog.author_id,
        points,
        'editors_pick',
        `Story "${blog.title}" featured as Editor's Pick!`,
        pickRef
      );
    }
  }

  await logAdminAction(
    c.env.DB,
    admin.id,
    'toggle_editor_pick',
    'blog',
    blogId,
    `New status: ${newStatus === 1 ? 'selected' : 'unselected'}`
  );

  return c.json({ success: true, is_editor_pick: newStatus === 1 });
});

// GET /api/admin/settings - Platform Settings
adminApp.get('/settings', async (c) => {
  requireStaff(c);
  const { results } = await c.env.DB.prepare(`SELECT key, value, description FROM platform_settings`).all();
  return c.json({ settings: results });
});

// PUT /api/admin/settings - Update Platform Settings
adminApp.put('/settings', async (c) => {
  const admin = requireAdmin(c);
  const body = await c.req.json();
  const parsed = z.record(z.string(), z.string()).safeParse(body);

  if (!parsed.success) return c.json({ error: 'Invalid settings format' }, 400);

  const now = Date.now();
  for (const [key, val] of Object.entries(parsed.data)) {
    await c.env.DB.prepare(
      `INSERT INTO platform_settings (key, value, description, updated_at)
       VALUES (?, ?, '', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(key, val, now).run();
  }

  await logAdminAction(
    c.env.DB,
    admin.id,
    'update_platform_settings',
    'platform_settings',
    'global',
    JSON.stringify(parsed.data)
  );

  return c.json({ success: true, message: 'Settings updated' });
});

// POST /api/admin/points/reverse - Reverse fraudulent point transaction with audit trail
adminApp.post('/points/reverse', async (c) => {
  const admin = requireAdmin(c);
  const body = await c.req.json();
  const parsed = z.object({
    transaction_id: z.string(),
    reason: z.string().min(5),
  }).safeParse(body);

  if (!parsed.success) return c.json({ error: 'Validation failed' }, 400);

  const tx = await c.env.DB.prepare(
    `SELECT id, user_id, amount, is_reversed, description FROM points_transactions WHERE id = ?`
  ).bind(parsed.data.transaction_id).first<{ id: string; user_id: string; amount: number; is_reversed: number; description: string }>();

  if (!tx) return c.json({ error: 'Transaction not found' }, 404);
  if (tx.is_reversed) return c.json({ error: 'Transaction has already been reversed' }, 400);

  const now = Date.now();
  const reversalId = 'ptx_rev_' + crypto.randomUUID().slice(0, 14);

  // Reverse points: subtract amount from user
  const user = await c.env.DB.prepare(`SELECT points FROM users WHERE id = ?`).bind(tx.user_id).first<{ points: number }>();
  const newPoints = Math.max(0, (user?.points || 0) - tx.amount);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE points_transactions SET is_reversed = 1 WHERE id = ?`
    ).bind(tx.id),

    c.env.DB.prepare(
      `INSERT INTO points_transactions (id, user_id, amount, transaction_type, reference_id, description, is_reversed, created_at)
       VALUES (?, ?, ?, 'admin_reversal', ?, ?, 0, ?)`
    ).bind(reversalId, tx.user_id, -tx.amount, tx.id, `Reversal by Admin: ${parsed.data.reason}`, now),

    c.env.DB.prepare(
      `UPDATE users SET points = ?, updated_at = ? WHERE id = ?`
    ).bind(newPoints, now, tx.user_id),

    c.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, 'points', 'Points Adjustment Notice', ?, '/dashboard/points', 0, ?)`
    ).bind(
      'notif_' + crypto.randomUUID().slice(0, 16),
      tx.user_id,
      admin.id,
      `Your points were adjusted by -${tx.amount} points. Reason: ${parsed.data.reason}`,
      now
    ),
  ]);

  await logAdminAction(
    c.env.DB,
    admin.id,
    'reverse_points',
    'points_transaction',
    tx.id,
    `User: ${tx.user_id}, Amount: -${tx.amount}, Reason: ${parsed.data.reason}`
  );

  return c.json({ success: true, message: 'Points reversed', new_points: newPoints });
});

// GET /api/admin/audit-logs - View audit trail
adminApp.get('/audit-logs', async (c) => {
  requireAdmin(c);
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = 25;
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      l.id, l.admin_id, l.action, l.target_type, l.target_id, l.details, l.ip_address, l.created_at,
      u.username as admin_username, u.display_name as admin_name
    FROM admin_audit_logs l
    JOIN users u ON l.admin_id = u.id
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const { results } = await c.env.DB.prepare(query).bind(limit, offset).all<any>();
  return c.json({ audit_logs: results });
});

export default adminApp;
