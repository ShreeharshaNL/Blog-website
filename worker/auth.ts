import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Env, SessionUser, HonoVariables } from './types';
import { UserRole, UserStatus } from '../src/types';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSessionToken(c: Context<{ Bindings: Env; Variables: HonoVariables }>): string | null {
  // Check Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Check Cookie header
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = cookie.match(/inkverse_session=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

export async function getUserFromSession(
  db: D1Database,
  token: string | null
): Promise<SessionUser | null> {
  if (!token) return null;

  const now = Date.now();
  const session = await db.prepare(
    `SELECT s.id, s.user_id, s.expires_at,
            u.id, u.email, u.username, u.display_name, u.avatar_url,
            u.role, u.status, u.points, u.level, u.show_dislike_stats
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > ? AND u.status != 'banned'`
  ).bind(token, now).first<any>();

  if (!session) return null;

  return {
    id: session.user_id,
    email: session.email,
    username: session.username,
    display_name: session.display_name,
    avatar_url: session.avatar_url,
    role: session.role as UserRole,
    status: session.status as UserStatus,
    points: session.points,
    level: session.level,
    show_dislike_stats: Boolean(session.show_dislike_stats),
  };
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = 'ses_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(token, userId, expiresAt, now).run();

  return token;
}

export function setSessionCookie(c: Context, token: string) {
  const isProd = c.env?.ENVIRONMENT === 'production';
  const cookieStr = `inkverse_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isProd ? '; Secure' : ''}`;
  c.header('Set-Cookie', cookieStr);
}

export function clearSessionCookie(c: Context) {
  c.header('Set-Cookie', 'inkverse_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

/**
 * Middleware: populates c.var.user and c.var.sessionToken
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: HonoVariables }>,
  next: () => Promise<void>
) {
  let token = getSessionToken(c);
  let user: SessionUser | null = null;

  if (token) {
    user = await getUserFromSession(c.env.DB, token);
  }

  // Fallback to cookie if Authorization header token was invalid or expired
  if (!user) {
    const cookie = c.req.header('Cookie');
    if (cookie) {
      const match = cookie.match(/inkverse_session=([^;]+)/);
      if (match && match[1] !== token) {
        const cookieToken = match[1];
        user = await getUserFromSession(c.env.DB, cookieToken);
        if (user) {
          token = cookieToken;
        }
      }
    }
  }

  c.set('sessionToken', user ? token : null);
  c.set('user', user);

  await next();
}

/**
 * Guard: Requires user to be authenticated
 */
export function requireAuth(c: Context<{ Bindings: Env; Variables: HonoVariables }>): SessionUser {
  const user = c.get('user');
  if (!user) {
    throw new HTTPException(401, {
      res: new Response(JSON.stringify({ error: 'Unauthorized: Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }
  if (user.status === 'suspended') {
    throw new HTTPException(403, {
      res: new Response(JSON.stringify({ error: 'Forbidden: Account is currently suspended' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }
  return user;
}

/**
 * Guard: Requires Admin or Moderator role
 */
export function requireStaff(c: Context<{ Bindings: Env; Variables: HonoVariables }>): SessionUser {
  const user = requireAuth(c);
  if (user.role !== 'admin' && user.role !== 'moderator') {
    throw new HTTPException(403, {
      res: new Response(JSON.stringify({ error: 'Forbidden: Staff access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }
  return user;
}

/**
 * Guard: Requires Admin role
 */
export function requireAdmin(c: Context<{ Bindings: Env; Variables: HonoVariables }>): SessionUser {
  const user = requireAuth(c);
  if (user.role !== 'admin') {
    throw new HTTPException(403, {
      res: new Response(JSON.stringify({ error: 'Forbidden: Administrator privileges required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    });
  }
  return user;
}
