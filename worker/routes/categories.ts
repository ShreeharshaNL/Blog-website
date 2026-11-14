import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAdmin } from '../auth';

const categoriesApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/categories - List all categories with published blog counts
categoriesApp.get('/', async (c) => {
  const query = `
    SELECT
      c.id, c.name, c.slug, c.description, c.icon, c.color, c.is_featured, c.created_at,
      COUNT(b.id) as blog_count
    FROM categories c
    LEFT JOIN blogs b ON c.id = b.category_id AND b.status = 'published'
    GROUP BY c.id
    ORDER BY c.is_featured DESC, blog_count DESC, c.name ASC
  `;

  const { results } = await c.env.DB.prepare(query).all<any>();
  const categories = results.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    is_featured: Boolean(cat.is_featured),
    blog_count: cat.blog_count || 0,
    created_at: cat.created_at,
  }));

  return c.json({ categories });
});

// POST /api/categories - Add category (Admin only)
categoriesApp.post('/', async (c) => {
  requireAdmin(c);
  const body = await c.req.json();
  const parsed = z.object({
    name: z.string().min(2).max(50),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
    description: z.string().max(200).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    is_featured: z.boolean().default(false),
  }).safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
  }

  const data = parsed.data;
  const id = 'cat_' + data.slug.replace(/-/g, '_');

  await c.env.DB.prepare(
    `INSERT INTO categories (id, name, slug, description, icon, color, is_featured, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    data.name,
    data.slug,
    data.description || null,
    data.icon || 'Folder',
    data.color || 'from-purple-500 to-indigo-500',
    data.is_featured ? 1 : 0,
    Date.now()
  ).run();

  return c.json({ success: true, id }, 201);
});

export default categoriesApp;
