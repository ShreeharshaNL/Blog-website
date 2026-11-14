import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';
import { isBot, generateViewerHash } from '../antiAbuse';
import { handleBookmarkToggle } from './bookmarks';
import {
  getRewardConfig,
  awardPoints,
  checkViewMilestones,
  awardAchievement,
  checkWritingStreak
} from '../gamification';

const blogsApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Helper: generate URL-friendly slug
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base || 'story'}-${randomSuffix}`;
}

// Helper: calculate reading time & word count
function calculateReadingStats(content: string): { wordCount: number; readingTimeMinutes: number } {
  // Strip HTML tags for word count
  const text = content.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  return { wordCount, readingTimeMinutes };
}

// GET /api/blogs - List blogs with filters
blogsApp.get('/', async (c) => {
  const categorySlug = c.req.query('category');
  const tagSlug = c.req.query('tag');
  const sort = c.req.query('sort') || 'latest'; // 'trending' | 'latest' | 'most_viewed' | 'most_liked'
  const search = c.req.query('search')?.trim();
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '12', 10)));
  const offset = (page - 1) * limit;

  let whereClauses: string[] = ["b.status = 'published'"];
  let params: any[] = [];

  if (categorySlug) {
    whereClauses.push('c.slug = ?');
    params.push(categorySlug);
  }

  if (tagSlug) {
    whereClauses.push('EXISTS (SELECT 1 FROM blog_tags bt JOIN tags t ON bt.tag_id = t.id WHERE bt.blog_id = b.id AND t.slug = ?)');
    params.push(tagSlug);
  }

  if (search) {
    whereClauses.push('(b.title LIKE ? OR b.description LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  let orderBy = 'b.published_at DESC';
  if (sort === 'most_viewed') {
    orderBy = 'b.view_count DESC, b.published_at DESC';
  } else if (sort === 'most_liked') {
    orderBy = 'b.like_count DESC, b.published_at DESC';
  } else if (sort === 'trending') {
    // Trending score = likes * 3 + views, weighted by recency
    orderBy = '(b.like_count * 3 + b.view_count) DESC, b.published_at DESC';
  }

  const query = `
    SELECT
      b.id, b.title, b.slug, b.description, b.cover_image, b.published_at,
      b.reading_time_minutes, b.word_count, b.view_count, b.like_count, b.is_editor_pick, b.is_featured,
      (SELECT COUNT(*) FROM comments cm WHERE cm.blog_id = b.id) as comment_count,
      u.id as author_id, u.username as author_username, u.display_name as author_name,
      u.avatar_url as author_avatar, u.points as author_points, u.level as author_level,
      c.id as category_id, c.name as category_name, c.slug as category_slug, c.color as category_color
    FROM blogs b
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(b.id) as total
    FROM blogs b
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE ${whereClauses.join(' AND ')}
  `;

  const [itemsResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params, limit, offset).all<any>(),
    c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>(),
  ]);

  const blogs = (itemsResult.results || []).map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    description: b.description,
    cover_image: b.cover_image,
    published_at: b.published_at,
    reading_time_minutes: b.reading_time_minutes,
    word_count: b.word_count,
    view_count: b.view_count,
    like_count: b.like_count,
    comment_count: b.comment_count || 0,
    is_editor_pick: Boolean(b.is_editor_pick),
    is_featured: Boolean(b.is_featured),
    author: {
      id: b.author_id,
      username: b.author_username,
      display_name: b.author_name,
      avatar_url: b.author_avatar,
      points: b.author_points,
      level: b.author_level,
    },
    category: b.category_id ? {
      id: b.category_id,
      name: b.category_name,
      slug: b.category_slug,
      color: b.category_color,
    } : null,
  }));

  const total = countResult?.total || 0;

  return c.json({
    blogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/blogs/trending - Top trending blogs
blogsApp.get('/trending', async (c) => {
  const query = `
    SELECT
      b.id, b.title, b.slug, b.description, b.cover_image, b.published_at,
      b.reading_time_minutes, b.view_count, b.like_count, b.is_editor_pick,
      u.id as author_id, u.username as author_username, u.display_name as author_name,
      u.avatar_url as author_avatar, u.level as author_level,
      c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM blogs b
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.status = 'published'
    ORDER BY (b.like_count * 4 + b.view_count) DESC, b.published_at DESC
    LIMIT 6
  `;

  const { results } = await c.env.DB.prepare(query).all<any>();
  const blogs = results.map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    description: b.description,
    cover_image: b.cover_image,
    published_at: b.published_at,
    reading_time_minutes: b.reading_time_minutes,
    view_count: b.view_count,
    like_count: b.like_count,
    comment_count: b.comment_count || 0,
    is_editor_pick: Boolean(b.is_editor_pick),
    author: {
      id: b.author_id,
      username: b.author_username,
      display_name: b.author_name,
      avatar_url: b.author_avatar,
      level: b.author_level,
    },
    category: b.category_id ? { id: b.category_id, name: b.category_name, slug: b.category_slug } : null,
  }));

  return c.json({ blogs });
});

// GET /api/blogs/editor-picks - Handpicked stories
blogsApp.get('/editor-picks', async (c) => {
  const query = `
    SELECT
      b.id, b.title, b.slug, b.description, b.cover_image, b.published_at,
      b.reading_time_minutes, b.view_count, b.like_count, b.is_editor_pick,
      u.id as author_id, u.username as author_username, u.display_name as author_name,
      u.avatar_url as author_avatar, u.level as author_level,
      c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM blogs b
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.status = 'published' AND b.is_editor_pick = 1
    ORDER BY b.published_at DESC
    LIMIT 6
  `;

  const { results } = await c.env.DB.prepare(query).all<any>();
  const blogs = results.map(b => ({
    id: b.id,
    title: b.title,
    slug: b.slug,
    description: b.description,
    cover_image: b.cover_image,
    published_at: b.published_at,
    reading_time_minutes: b.reading_time_minutes,
    view_count: b.view_count,
    like_count: b.like_count,
    is_editor_pick: true,
    author: {
      id: b.author_id,
      username: b.author_username,
      display_name: b.author_name,
      avatar_url: b.author_avatar,
      level: b.author_level,
    },
    category: b.category_id ? { id: b.category_id, name: b.category_name, slug: b.category_slug } : null,
  }));

  return c.json({ blogs });
});

// GET /api/blogs/:slug - Detailed Blog Reading View
blogsApp.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const currentUser = c.get('user');

  const query = `
    SELECT
      b.id, b.author_id, b.title, b.slug, b.description, b.content, b.cover_image,
      b.category_id, b.status, b.scheduled_at, b.published_at, b.reading_time_minutes,
      b.word_count, b.view_count, b.like_count, b.dislike_count, b.is_editor_pick,
      b.is_featured, b.seo_title, b.seo_description, b.created_at, b.updated_at,
      u.id as u_id, u.username as u_username, u.display_name as u_name,
      u.avatar_url as u_avatar, u.bio as u_bio, u.points as u_points, u.level as u_level,
      u.show_dislike_stats as u_show_dislike_stats,
      c.id as c_id, c.name as c_name, c.slug as c_slug, c.color as c_color
    FROM blogs b
    JOIN users u ON b.author_id = u.id
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.slug = ?
  `;

  const blog = await c.env.DB.prepare(query).bind(slug).first<any>();

  if (!blog) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  // If blog is draft or unlisted, only author or staff can view
  const isAuthor = currentUser?.id === blog.author_id;
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  if (blog.status !== 'published' && !isAuthor && !isStaff) {
    return c.json({ error: 'Article is not publicly available' }, 404);
  }

  // Fetch tags for this blog
  const { results: tags } = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.slug
     FROM tags t
     JOIN blog_tags bt ON t.id = bt.tag_id
     WHERE bt.blog_id = ?`
  ).bind(blog.id).all<any>();

  // Check current user reaction and bookmark
  let userReaction: 'like' | 'dislike' | null = null;
  let isBookmarked = false;

  if (currentUser) {
    const [reactionRow, bookmarkRow] = await Promise.all([
      c.env.DB.prepare(
        `SELECT type FROM reactions WHERE user_id = ? AND blog_id = ?`
      ).bind(currentUser.id, blog.id).first<{ type: 'like' | 'dislike' }>(),
      c.env.DB.prepare(
        `SELECT 1 FROM bookmarks WHERE user_id = ? AND blog_id = ?`
      ).bind(currentUser.id, blog.id).first(),
    ]);

    userReaction = reactionRow?.type || null;
    isBookmarked = Boolean(bookmarkRow);
  }

  // Fetch related articles
  let relatedBlogs: any[] = [];
  if (blog.category_id) {
    const { results } = await c.env.DB.prepare(
      `SELECT b.id, b.title, b.slug, b.description, b.cover_image, b.published_at, b.reading_time_minutes, b.view_count, b.like_count,
              u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
       FROM blogs b
       JOIN users u ON b.author_id = u.id
       WHERE b.category_id = ? AND b.id != ? AND b.status = 'published'
       ORDER BY b.published_at DESC
       LIMIT 3`
    ).bind(blog.category_id, blog.id).all();
    relatedBlogs = results;
  }

  // Fetch author other articles
  const { results: authorOtherBlogs } = await c.env.DB.prepare(
    `SELECT id, title, slug, cover_image, published_at, reading_time_minutes, view_count, like_count
     FROM blogs
     WHERE author_id = ? AND id != ? AND status = 'published'
     ORDER BY published_at DESC
     LIMIT 3`
  ).bind(blog.author_id, blog.id).all();

  // SECURITY REQUIREMENT:
  // Dislike count must NEVER be exposed publicly or to other users.
  // Only the blog author can see private dislike analytics, and only if author has enabled show_dislike_stats!
  let privateDislikeCount: number | undefined = undefined;
  if (isAuthor && Boolean(blog.u_show_dislike_stats)) {
    privateDislikeCount = blog.dislike_count;
  }

  return c.json({
    blog: {
      id: blog.id,
      author_id: blog.author_id,
      title: blog.title,
      slug: blog.slug,
      description: blog.description,
      content: blog.content,
      cover_image: blog.cover_image,
      category_id: blog.category_id,
      category: blog.c_id ? {
        id: blog.c_id,
        name: blog.c_name,
        slug: blog.c_slug,
        color: blog.c_color,
      } : null,
      tags,
      status: blog.status,
      published_at: blog.published_at,
      scheduled_at: blog.scheduled_at,
      reading_time_minutes: blog.reading_time_minutes,
      word_count: blog.word_count,
      view_count: blog.view_count,
      like_count: blog.like_count,
      ...(privateDislikeCount !== undefined ? { dislike_count: privateDislikeCount } : {}),
      is_editor_pick: Boolean(blog.is_editor_pick),
      is_featured: Boolean(blog.is_featured),
      seo_title: blog.seo_title,
      seo_description: blog.seo_description,
      created_at: blog.created_at,
      updated_at: blog.updated_at,
      author: {
        id: blog.u_id,
        username: blog.u_username,
        display_name: blog.u_name,
        avatar_url: blog.u_avatar,
        bio: blog.u_bio,
        points: blog.u_points,
        level: blog.u_level,
      },
      user_reaction: userReaction,
      is_bookmarked: isBookmarked,
    },
    related_blogs: relatedBlogs,
    author_other_blogs: authorOtherBlogs,
  });
});

// POST /api/blogs/:slug/view - Record verified unique view
blogsApp.post('/:slug/view', async (c) => {
  const slug = c.req.param('slug');
  const userAgent = c.req.header('User-Agent');

  // 1. Bot & Crawler Exclusion
  if (isBot(userAgent)) {
    return c.json({ success: true, verified: false, reason: 'bot_excluded' });
  }

  const blog = await c.env.DB.prepare(
    `SELECT id, author_id, view_count, status FROM blogs WHERE slug = ?`
  ).bind(slug).first<{ id: string; author_id: string; view_count: number; status: string }>();

  if (!blog || blog.status !== 'published') {
    return c.json({ error: 'Blog not found' }, 404);
  }

  const currentUser = c.get('user');
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  // 2. Anti-Abuse: Deduplication via privacy-preserving viewer hash
  const viewerHash = await generateViewerHash(currentUser?.id || null, ip, userAgent || null, blog.id);

  // Check if this viewer already viewed this blog today
  const existingView = await c.env.DB.prepare(
    `SELECT id FROM blog_views WHERE blog_id = ? AND viewer_hash = ?`
  ).bind(blog.id, viewerHash).first();

  if (existingView) {
    return c.json({ success: true, verified: false, reason: 'duplicate_view' });
  }

  const now = Date.now();
  const viewId = 'view_' + crypto.randomUUID().slice(0, 16);

  // Record view & increment view count atomically
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO blog_views (id, blog_id, viewer_hash, user_id, viewed_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(viewId, blog.id, viewerHash, currentUser?.id || null, now),

    c.env.DB.prepare(
      `UPDATE blogs SET view_count = view_count + 1 WHERE id = ?`
    ).bind(blog.id)
  ]);

  const newViewCount = blog.view_count + 1;

  // 3. Milestone Rewards Check: author earns +5 points per 100 views
  // Anti-abuse: do not reward self views
  if (!currentUser || currentUser.id !== blog.author_id) {
    await checkViewMilestones(c.env.DB, blog.id, blog.author_id, newViewCount);
  }

  return c.json({ success: true, verified: true, view_count: newViewCount });
});

// POST /api/blogs - Create new blog
const createBlogSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(500),
  content: z.string().min(10),
  cover_image: z.string().url().optional().or(z.literal('')),
  category_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'unlisted']).default('published'),
  scheduled_at: z.number().optional().nullable(),
  seo_title: z.string().max(100).optional(),
  seo_description: z.string().max(200).optional(),
  slug: z.string().optional(),
});

blogsApp.post('/', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const parsed = createBlogSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
  }

  const data = parsed.data;
  const now = Date.now();
  const blogId = 'blog_' + crypto.randomUUID().slice(0, 16);
  const slug = data.slug ? data.slug.toLowerCase().trim().replace(/[^\w-]/g, '') : generateSlug(data.title);

  // Check slug uniqueness
  const slugExists = await c.env.DB.prepare(
    `SELECT id FROM blogs WHERE slug = ?`
  ).bind(slug).first();

  const finalSlug = slugExists ? `${slug}-${Math.floor(100 + Math.random() * 900)}` : slug;
  const { wordCount, readingTimeMinutes } = calculateReadingStats(data.content);

  const publishedAt = data.status === 'published' ? now : null;

  await c.env.DB.prepare(
    `INSERT INTO blogs (
      id, author_id, title, slug, description, content, cover_image, category_id,
      status, scheduled_at, published_at, reading_time_minutes, word_count,
      view_count, like_count, dislike_count, is_editor_pick, is_featured,
      seo_title, seo_description, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      0, 0, 0, 0, 0,
      ?, ?, ?, ?
    )`
  ).bind(
    blogId,
    user.id,
    data.title,
    finalSlug,
    data.description,
    data.content,
    data.cover_image || null,
    data.category_id || null,
    data.status,
    data.scheduled_at || null,
    publishedAt,
    readingTimeMinutes,
    wordCount,
    data.seo_title || data.title,
    data.seo_description || data.description,
    now,
    now
  ).run();

  // Save tags
  if (data.tags && data.tags.length > 0) {
    for (const tagName of data.tags.slice(0, 5)) {
      const cleanTag = tagName.trim().toLowerCase();
      if (!cleanTag) continue;
      const tagSlug = cleanTag.replace(/[^\w-]/g, '-');
      let tag = await c.env.DB.prepare(`SELECT id FROM tags WHERE slug = ?`).bind(tagSlug).first<{ id: string }>();
      let tagId = tag?.id;
      if (!tagId) {
        tagId = 'tag_' + crypto.randomUUID().slice(0, 12);
        await c.env.DB.prepare(
          `INSERT INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)`
        ).bind(tagId, cleanTag, tagSlug, now).run();
      }
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)`
      ).bind(blogId, tagId).run();
    }
  }

  // Initial revision
  await c.env.DB.prepare(
    `INSERT INTO blog_revisions (id, blog_id, title, description, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind('rev_' + crypto.randomUUID().slice(0, 16), blogId, data.title, data.description, data.content, now).run();

  // If published, award points & check achievements
  if (data.status === 'published') {
    const config = await getRewardConfig(c.env.DB);
    await awardPoints(
      c.env.DB,
      user.id,
      config.reward_publish_blog,
      'blog_published',
      `Published story "${data.title}"`,
      blogId
    );

    // Check First Publication badge
    await awardAchievement(c.env.DB, user.id, 'first_publication');
    // Check writing streak
    await checkWritingStreak(c.env.DB, user.id);
  }

  return c.json({
    success: true,
    blog_id: blogId,
    slug: finalSlug,
  }, 201);
});

// PUT /api/blogs/:id - Update existing blog
blogsApp.put('/:id', async (c) => {
  const user = requireAuth(c);
  const blogId = c.req.param('id');
  const body = await c.req.json();
  const parsed = createBlogSchema.partial().safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400);
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, author_id, status, title, description, content, published_at FROM blogs WHERE id = ?`
  ).bind(blogId).first<any>();

  if (!existing) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  if (existing.author_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Unauthorized to edit this blog' }, 403);
  }

  const data = parsed.data;
  const now = Date.now();

  // Save current state into revision history
  await c.env.DB.prepare(
    `INSERT INTO blog_revisions (id, blog_id, title, description, content, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    'rev_' + crypto.randomUUID().slice(0, 16),
    blogId,
    existing.title,
    existing.description,
    existing.content,
    now
  ).run();

  let { wordCount, readingTimeMinutes } = { wordCount: 0, readingTimeMinutes: 1 };
  if (data.content) {
    const stats = calculateReadingStats(data.content);
    wordCount = stats.wordCount;
    readingTimeMinutes = stats.readingTimeMinutes;
  }

  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (data.title !== undefined) {
    updates.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.content !== undefined) {
    updates.push('content = ?', 'word_count = ?', 'reading_time_minutes = ?');
    params.push(data.content, wordCount, readingTimeMinutes);
  }
  if (data.cover_image !== undefined) {
    updates.push('cover_image = ?');
    params.push(data.cover_image || null);
  }
  if (data.category_id !== undefined) {
    updates.push('category_id = ?');
    params.push(data.category_id || null);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
    if (data.status === 'published' && !existing.published_at) {
      updates.push('published_at = ?');
      params.push(now);
    }
  }
  if (data.scheduled_at !== undefined) {
    updates.push('scheduled_at = ?');
    params.push(data.scheduled_at);
  }
  if (data.seo_title !== undefined) {
    updates.push('seo_title = ?');
    params.push(data.seo_title);
  }
  if (data.seo_description !== undefined) {
    updates.push('seo_description = ?');
    params.push(data.seo_description);
  }

  params.push(blogId);

  await c.env.DB.prepare(
    `UPDATE blogs SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  // If status changed to published for the first time, award points
  if (data.status === 'published' && existing.status !== 'published') {
    const config = await getRewardConfig(c.env.DB);
    await awardPoints(
      c.env.DB,
      existing.author_id,
      config.reward_publish_blog,
      'blog_published',
      `Published story "${data.title || existing.title}"`,
      blogId
    );
    await awardAchievement(c.env.DB, existing.author_id, 'first_publication');
    await checkWritingStreak(c.env.DB, existing.author_id);
  }

  return c.json({ success: true, message: 'Blog updated' });
});

// DELETE /api/blogs/:id - Delete blog
blogsApp.delete('/:id', async (c) => {
  const user = requireAuth(c);
  const blogId = c.req.param('id');

  const existing = await c.env.DB.prepare(
    `SELECT author_id FROM blogs WHERE id = ?`
  ).bind(blogId).first<{ author_id: string }>();

  if (!existing) {
    return c.json({ error: 'Blog not found' }, 404);
  }

  if (existing.author_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Unauthorized to delete this blog' }, 403);
  }

  await c.env.DB.prepare(`DELETE FROM blogs WHERE id = ?`).bind(blogId).run();

  return c.json({ success: true, message: 'Blog deleted' });
});

// GET /api/blogs/:id/revisions - Revisions history
blogsApp.get('/:id/revisions', async (c) => {
  const user = requireAuth(c);
  const blogId = c.req.param('id');

  const blog = await c.env.DB.prepare(
    `SELECT author_id FROM blogs WHERE id = ?`
  ).bind(blogId).first<{ author_id: string }>();

  if (!blog) return c.json({ error: 'Blog not found' }, 404);
  if (blog.author_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, title, description, content, created_at
     FROM blog_revisions
     WHERE blog_id = ?
     ORDER BY created_at DESC
     LIMIT 20`
  ).bind(blogId).all();

  return c.json({ revisions: results });
});

// Bookmark toggle alias
blogsApp.post('/:id/bookmark', handleBookmarkToggle);

export default blogsApp;
