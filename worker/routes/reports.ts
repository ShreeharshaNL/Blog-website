import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const reportsApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const reportSchema = z.object({
  target_type: z.enum(['blog', 'comment', 'user']),
  target_id: z.string().min(1),
  reason: z.string().min(3).max(100),
  details: z.string().max(500).optional(),
});

// POST /api/reports - Submit a report
reportsApp.post('/', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const parsed = reportSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
  }

  const { target_type, target_id, reason, details } = parsed.data;

  // Verify target existence
  if (target_type === 'blog') {
    const blog = await c.env.DB.prepare(`SELECT id FROM blogs WHERE id = ?`).bind(target_id).first();
    if (!blog) return c.json({ error: 'Target blog not found' }, 404);
  } else if (target_type === 'comment') {
    const comment = await c.env.DB.prepare(`SELECT id FROM comments WHERE id = ?`).bind(target_id).first();
    if (!comment) return c.json({ error: 'Target comment not found' }, 404);
  }

  const reportId = 'rep_' + crypto.randomUUID().slice(0, 16);
  const now = Date.now();

  await c.env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(reportId, user.id, target_type, target_id, reason, details || null, now).run();

  return c.json({ success: true, message: 'Report submitted. Our moderation team will review it.' }, 201);
});

export default reportsApp;
