import { Hono } from 'hono';
import { z } from 'zod';
import { Env, HonoVariables } from '../types';
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  requireAuth
} from '../auth';

const authApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/auth/me
authApp.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ user: null });
  }

  // Get full user row
  const fullUser = await c.env.DB.prepare(
    `SELECT id, email, username, display_name, avatar_url, bio, role, status, points, level, interests, show_dislike_stats, created_at, updated_at
     FROM users WHERE id = ?`
  ).bind(user.id).first<any>();

  if (!fullUser) {
    return c.json({ user: null });
  }

  // Get unread notification count
  const unreadResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0`
  ).bind(user.id).first<{ unread: number }>();

  let interests: string[] = [];
  try {
    interests = JSON.parse(fullUser.interests || '[]');
  } catch {
    interests = [];
  }

  return c.json({
    user: {
      ...fullUser,
      show_dislike_stats: Boolean(fullUser.show_dislike_stats),
      interests,
    },
    unread_notifications: unreadResult?.unread || 0,
  });
});

// POST /api/auth/logout
authApp.post('/logout', async (c) => {
  const token = c.get('sessionToken');
  if (token) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(token).run();
  }
  clearSessionCookie(c);
  return c.json({ success: true });
});

// Schema for media URLs (supports full URLs http/https, relative site paths /api/media/..., data URIs, or empty/null)
const mediaUrlSchema = z.string().max(2048).refine(
  (val) => !val || val === '' || val.startsWith('/') || /^https?:\/\//i.test(val) || val.startsWith('data:'),
  { message: 'Invalid URL or media path' }
).optional().nullable();

// POST /api/auth/onboarding
const onboardingSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
  display_name: z.string().min(2).max(50),
  bio: z.string().max(300).optional(),
  avatar_url: mediaUrlSchema,
  interests: z.array(z.string()).optional(),
});

authApp.post('/onboarding', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return c.json({ error: `Validation failed: ${errorDetails}`, details: parsed.error.issues }, 400);
  }

  const { username, display_name, bio, avatar_url, interests } = parsed.data;

  // Check username uniqueness if changed
  const existing = await c.env.DB.prepare(
    `SELECT id FROM users WHERE username = ? AND id != ?`
  ).bind(username.toLowerCase(), user.id).first();

  if (existing) {
    return c.json({ error: 'Username is already taken' }, 409);
  }

  const now = Date.now();
  await c.env.DB.prepare(
    `UPDATE users
     SET username = ?, display_name = ?, bio = ?, avatar_url = ?, interests = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    username.toLowerCase(),
    display_name,
    bio || null,
    avatar_url || null,
    JSON.stringify(interests || []),
    now,
    user.id
  ).run();

  return c.json({ success: true, message: 'Onboarding completed' });
});

// PUT /api/auth/profile
const profileSchema = z.object({
  display_name: z.string().min(2).max(50).optional(),
  bio: z.string().max(300).optional(),
  avatar_url: mediaUrlSchema,
  interests: z.array(z.string()).optional(),
  show_dislike_stats: z.boolean().optional(),
});

authApp.put('/profile', async (c) => {
  const user = requireAuth(c);
  const body = await c.req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return c.json({ error: `Validation failed: ${errorDetails}`, details: parsed.error.issues }, 400);
  }

  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [Date.now()];

  if (parsed.data.display_name !== undefined) {
    updates.push('display_name = ?');
    params.push(parsed.data.display_name);
  }
  if (parsed.data.bio !== undefined) {
    updates.push('bio = ?');
    params.push(parsed.data.bio);
  }
  if (parsed.data.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    params.push(parsed.data.avatar_url);
  }
  if (parsed.data.interests !== undefined) {
    updates.push('interests = ?');
    params.push(JSON.stringify(parsed.data.interests));
  }
  if (parsed.data.show_dislike_stats !== undefined) {
    updates.push('show_dislike_stats = ?');
    params.push(parsed.data.show_dislike_stats ? 1 : 0);
  }

  params.push(user.id);

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  return c.json({ success: true, message: 'Profile updated' });
});

// POST /api/auth/login-demo
// Supports instant developer / demo login in development or test only
authApp.post('/login-demo', async (c) => {
  if (c.env.ENVIRONMENT === 'production') {
    return c.json({ error: 'Demo logins are disabled in production. Please sign in with Google or GitHub.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const role = body.role === 'admin' ? 'admin' : body.role === 'moderator' ? 'moderator' : 'user';
  const username = body.username || (role === 'admin' ? 'shreeharsha' : 'elena_writes');
  const email = body.email || `${username}@inkverse.online`;

  const now = Date.now();
  let user = await c.env.DB.prepare(
    `SELECT id, username, role FROM users WHERE email = ?`
  ).bind(email).first<any>();

  if (!user) {
    const userId = 'usr_' + crypto.randomUUID().slice(0, 16);
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, username, display_name, avatar_url, bio, role, status, points, level, interests, show_dislike_stats, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, '["technology","programming","ai"]', 1, ?, ?)`
    ).bind(
      userId,
      email,
      username.toLowerCase(),
      body.display_name || (role === 'admin' ? 'Shree Harsha' : 'Elena Rostova'),
      body.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      role === 'admin' ? 'Platform Creator & Chief Editor at INKVERSE.' : 'Staff Software Engineer & Distributed Systems Enthusiast.',
      role,
      role === 'admin' ? 3500 : 850,
      role === 'admin' ? 7 : 5,
      now,
      now
    ).run();

    user = { id: userId, username, role };
  }

  const token = await createSession(c.env.DB, user.id);
  setSessionCookie(c, token);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

// OAuth: Google Auth Redirect & Callback
authApp.get('/oauth/google', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'Google OAuth not configured. Please provide GOOGLE_CLIENT_ID.' }, 400);
  }
  const redirectUri = `${c.env.SITE_URL || 'https://blog.shreeharsha.online'}/api/auth/oauth/google/callback`;
  const state = crypto.randomUUID();
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}&access_type=offline&prompt=consent`;

  return c.redirect(url);
});

authApp.get('/oauth/google/callback', async (c) => {
  const errorParam = c.req.query('error');
  if (errorParam) {
    const errorDesc = c.req.query('error_description') || errorParam;
    return c.redirect(`/login?error=oauth_denied&details=${encodeURIComponent(errorDesc)}`);
  }

  const code = c.req.query('code');
  if (!code) {
    return c.redirect('/login?error=oauth_code_missing');
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${c.env.SITE_URL || 'https://blog.shreeharsha.online'}/api/auth/oauth/google/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      const msg = tokenData.error_description || tokenData.error || 'No access token';
      return c.redirect(`/login?error=oauth_token_exchange_failed&details=${encodeURIComponent(msg)}`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json() as any;

    if (!profile.email) {
      return c.redirect('/login?error=email_not_provided');
    }

    const googleUserId = String(profile.id || profile.sub || '');
    if (!googleUserId) {
      return c.redirect('/login?error=profile_id_missing');
    }

    const token = await handleOAuthUser(c.env.DB, 'google', googleUserId, profile.email, profile.name, profile.picture);
    setSessionCookie(c, token);
    return c.redirect('/');
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return c.redirect(`/login?error=oauth_failed&details=${encodeURIComponent(err?.message || 'unknown')}`);
  }
});

// OAuth: GitHub Auth Redirect & Callback
authApp.get('/oauth/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: 'GitHub OAuth not configured. Please provide GITHUB_CLIENT_ID.' }, 400);
  }
  const redirectUri = `${c.env.SITE_URL || 'https://blog.shreeharsha.online'}/api/auth/oauth/github/callback`;
  const state = crypto.randomUUID();
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;

  return c.redirect(url);
});

authApp.get('/oauth/github/callback', async (c) => {
  const errorParam = c.req.query('error');
  if (errorParam) {
    const errorDesc = c.req.query('error_description') || errorParam;
    return c.redirect(`/login?error=oauth_denied&details=${encodeURIComponent(errorDesc)}`);
  }

  const code = c.req.query('code');
  if (!code) {
    return c.redirect('/login?error=oauth_code_missing');
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) {
      console.error('GitHub token exchange error:', tokenData);
      const msg = tokenData.error_description || tokenData.error || 'No access token';
      return c.redirect(`/login?error=github_token_failed&details=${encodeURIComponent(msg)}`);
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'INKVERSE-App',
      },
    });
    const profile = await userRes.json() as any;

    // Fetch primary email if not public in profile
    let email = profile.email;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'INKVERSE-App',
        },
      });
      const emails = await emailRes.json() as any[];
      if (Array.isArray(emails)) {
        const primary = emails.find(e => e.primary && e.verified) || emails.find(e => e.primary) || emails[0];
        email = primary?.email;
      }
    }

    if (!email) {
      return c.redirect('/login?error=github_email_not_found');
    }

    const githubUserId = String(profile.id || '');
    if (!githubUserId) {
      return c.redirect('/login?error=profile_id_missing');
    }

    const token = await handleOAuthUser(c.env.DB, 'github', githubUserId, email, profile.name || profile.login, profile.avatar_url);
    setSessionCookie(c, token);
    return c.redirect('/');
  } catch (err: any) {
    console.error('GitHub OAuth error:', err);
    return c.redirect(`/login?error=oauth_failed&details=${encodeURIComponent(err?.message || 'unknown')}`);
  }
});

async function handleOAuthUser(
  db: D1Database,
  provider: 'google' | 'github',
  providerUserId: string,
  email: string,
  name?: string,
  avatarUrl?: string
): Promise<string> {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();
  const safeProviderUserId = String(providerUserId);

  // 1. Check if OAuth link exists
  const existingLink = await db.prepare(
    `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`
  ).bind(provider, safeProviderUserId).first<{ user_id: string }>();

  if (existingLink) {
    return createSession(db, existingLink.user_id);
  }

  // 2. Check if user with same email exists
  let existingUser = await db.prepare(
    `SELECT id, role FROM users WHERE LOWER(email) = ?`
  ).bind(normalizedEmail).first<{ id: string; role: string }>();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 3. Create new user
    userId = 'usr_' + crypto.randomUUID().slice(0, 16);
    let baseUsername = (name || normalizedEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 20);

    if (baseUsername.length < 3) {
      baseUsername = `user_${baseUsername || 'ink'}_${Math.floor(100 + Math.random() * 900)}`;
    }

    // Ensure username is unique
    let candidateUsername = baseUsername;
    let attempts = 0;
    while (attempts < 5) {
      const userConflict = await db.prepare(
        `SELECT id FROM users WHERE username = ?`
      ).bind(candidateUsername).first();

      if (!userConflict) {
        break;
      }
      attempts++;
      candidateUsername = `${baseUsername.slice(0, 15)}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const isAdmin = normalizedEmail === 'shreeharshanl05@gmail.com' || normalizedEmail === 'shreeharsha2027@gmail.com' || normalizedEmail.startsWith('shreeharsha');
    const role = isAdmin ? 'admin' : 'user';
    const initialPoints = 0;
    const initialLevel = 1;

    await db.prepare(
      `INSERT INTO users (id, email, username, display_name, avatar_url, bio, role, status, points, level, interests, show_dislike_stats, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, '[]', 1, ?, ?)`
    ).bind(
      userId,
      normalizedEmail,
      candidateUsername,
      name || candidateUsername,
      avatarUrl || null,
      'Inkverse community writer and reader.',
      role,
      initialPoints,
      initialLevel,
      now,
      now
    ).run();
  }

  // 4. Link OAuth account (using ON CONFLICT DO UPDATE to ensure idempotency)
  await db.prepare(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_user_id) DO UPDATE SET user_id = excluded.user_id`
  ).bind(
    'oa_' + crypto.randomUUID().slice(0, 16),
    userId,
    provider,
    safeProviderUserId,
    now
  ).run();

  return createSession(db, userId);
}

export default authApp;
