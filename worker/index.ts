import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { Env, HonoVariables } from './types';
import { authMiddleware } from './auth';

import authApp from './routes/auth';
import usersApp from './routes/users';
import blogsApp from './routes/blogs';
import reactionsApp from './routes/reactions';
import commentsApp from './routes/comments';
import dashboardApp from './routes/dashboard';
import leaderboardApp from './routes/leaderboard';
import adminApp from './routes/admin';
import categoriesApp from './routes/categories';
import bookmarksApp from './routes/bookmarks';
import notifApp from './routes/notifications';
import reportsApp from './routes/reports';
import uploadApp from './routes/upload';
import { getMedia } from './mediaStorage';

const app = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Enable CORS
app.use('*', cors({
  origin: (origin) => {
    // Allow local development and production domain
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('blog.shreeharsha.online')) {
      return origin || '*';
    }
    return 'https://blog.shreeharsha.online';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-admin-password', 'X-Admin-Password'],
}));

// Apply authentication session context to all requests
app.use('*', authMiddleware);

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    platform: 'INKVERSE',
    timestamp: new Date().toISOString(),
  });
});

// Mount Subrouters
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/blogs', reactionsApp);
app.route('/api/blogs', commentsApp);
app.route('/api/blogs', bookmarksApp);
app.route('/api/blogs', blogsApp);
app.route('/api/comments', commentsApp);
app.route('/api/dashboard', dashboardApp);
app.route('/api/leaderboard', leaderboardApp);
app.route('/api/points', leaderboardApp);
app.route('/api/admin', adminApp);
app.route('/api/categories', categoriesApp);
app.route('/api/bookmarks', bookmarksApp);
app.route('/api/notifications', notifApp);
app.route('/api/reports', reportsApp);
app.route('/api/upload', uploadApp);

// Media serving endpoint (R2 Bucket & Fallback Media Storage with Range Streaming)
app.get('/api/media/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const rangeHeader = c.req.header('range');
  const response = await getMedia(c.env, key, rangeHeader);
  if (!response) {
    return c.text('File not found', 404);
  }
  return response;
});

// Central Error Handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error('App Error:', err);
  if (err instanceof Response) {
    return err;
  }
  return c.json({
    error: err.message || 'Internal Server Error',
  }, 500);
});

export default app;
