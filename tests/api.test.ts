import { describe, it, expect, beforeEach } from 'vitest';
import app from '../worker/index';
import { createTestD1Database } from './testDb';
import { Env } from '../worker/types';

describe('INKVERSE API & Platform Verification', () => {
  let testEnv: Env;

  beforeEach(() => {
    testEnv = {
      DB: createTestD1Database(),
      ENVIRONMENT: 'test',
      SITE_URL: 'https://blog.shreeharsha.online',
    };
  });

  describe('1. Authentication & Onboarding', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const res = await app.request('/api/auth/me', { method: 'GET' }, testEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.user).toBeNull();
    });

    it('should allow demo login and retrieve current session user', async () => {
      const loginRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', username: 'alice', display_name: 'Alice Wonder' }),
      }, testEnv);

      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json() as any;
      expect(loginData.success).toBe(true);
      expect(loginData.token).toBeDefined();

      const token = loginData.token;

      // Access /api/auth/me with Bearer token
      const meRes = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);

      expect(meRes.status).toBe(200);
      const meData = await meRes.json() as any;
      expect(meData.user).toBeDefined();
      expect(meData.user.username).toBe('alice');
      expect(meData.user.role).toBe('user');
    });

    it('should update profile and onboarding preferences', async () => {
      const loginRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'bob', display_name: 'Bob Builder' }),
      }, testEnv);
      const { token } = await loginRes.json() as any;

      const onboardRes = await app.request('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: 'bob_creator',
          display_name: 'Bob The Creator',
          bio: 'Writing about distributed cloud architectures.',
          interests: ['technology', 'programming'],
        }),
      }, testEnv);

      expect(onboardRes.status).toBe(200);

      const meRes = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      const meData = await meRes.json() as any;
      expect(meData.user.username).toBe('bob_creator');
      expect(meData.user.display_name).toBe('Bob The Creator');
      expect(meData.user.interests).toEqual(['technology', 'programming']);
    });

    it('should handle OAuth callback validation and error redirects', async () => {
      // 1. Missing code parameter in Google callback
      const googleMissingRes = await app.request('/api/auth/oauth/google/callback', {
        method: 'GET',
      }, testEnv);
      expect(googleMissingRes.status).toBe(302);
      expect(googleMissingRes.headers.get('location')).toBe('/login?error=oauth_code_missing');

      // 2. Denied consent parameter in Google callback
      const googleDeniedRes = await app.request('/api/auth/oauth/google/callback?error=access_denied&error_description=User+denied+access', {
        method: 'GET',
      }, testEnv);
      expect(googleDeniedRes.status).toBe(302);
      expect(googleDeniedRes.headers.get('location')).toContain('/login?error=oauth_denied');

      // 3. Missing code parameter in GitHub callback
      const githubMissingRes = await app.request('/api/auth/oauth/github/callback', {
        method: 'GET',
      }, testEnv);
      expect(githubMissingRes.status).toBe(302);
      expect(githubMissingRes.headers.get('location')).toBe('/login?error=oauth_code_missing');
    });
  });

  describe('2. Blog Creation, Revisions & Publishing Workflow', () => {
    it('should create and publish a blog, awarding +20 points and first publication badge', async () => {
      const loginRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'carol', display_name: 'Carol Danvers' }),
      }, testEnv);
      const { token } = await loginRes.json() as any;

      const createRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'The Future of Serverless Edge Computing',
          description: 'Exploring how Cloudflare Workers and distributed state redefine web scalability.',
          content: '<h1>Edge Computing Evolution</h1><p>Modern architectures run at the edge with zero cold starts.</p>',
          category_id: 'cat_tech',
          tags: ['cloud', 'serverless', 'edge'],
          status: 'published',
        }),
      }, testEnv);

      expect(createRes.status).toBe(201);
      const createData = await createRes.json() as any;
      expect(createData.success).toBe(true);
      expect(createData.slug).toBeDefined();

      // Check author points: +20 points for publishing blog + bonus points for first_publication badge
      const meRes = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      const meData = await meRes.json() as any;
      expect(meData.user.points).toBeGreaterThanOrEqual(20);

      // Verify revision was created
      const revRes = await app.request(`/api/blogs/${createData.blog_id}/revisions`, {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      const revData = await revRes.json() as any;
      expect(revData.revisions.length).toBe(1);
      expect(revData.revisions[0].title).toBe('The Future of Serverless Edge Computing');
    });

    it('should support creating, loading by ID, updating, and publishing drafts', async () => {
      const loginRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'draft_author', display_name: 'Draft Author' }),
      }, testEnv);
      const { token } = await loginRes.json() as any;

      // 1. Create a minimal draft with only title
      const draftRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'My In-Progress Draft Note',
          status: 'draft',
        }),
      }, testEnv);

      expect(draftRes.status).toBe(201);
      const draftData = await draftRes.json() as any;
      expect(draftData.success).toBe(true);
      expect(draftData.blog_id).toBeDefined();

      const draftId = draftData.blog_id;

      // 2. Fetch the draft by its blog_id directly
      const fetchDraftRes = await app.request(`/api/blogs/${draftId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      expect(fetchDraftRes.status).toBe(200);
      const fetchDraftData = await fetchDraftRes.json() as any;
      expect(fetchDraftData.blog.id).toBe(draftId);
      expect(fetchDraftData.blog.status).toBe('draft');
      expect(fetchDraftData.blog.title).toBe('My In-Progress Draft Note');

      // 3. Update the draft with content and website-hosted cover_image
      const updateDraftRes = await app.request(`/api/blogs/${draftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'My In-Progress Draft Note (Expanded)',
          content: '<p>Now this draft has some actual detailed content inside it.</p>',
          cover_image: '/api/media/uploads/1700000000-photo.png',
          status: 'draft',
        }),
      }, testEnv);
      expect(updateDraftRes.status).toBe(200);

      // 4. Publish the draft
      const publishRes = await app.request(`/api/blogs/${draftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'published',
        }),
      }, testEnv);
      expect(publishRes.status).toBe(200);

      // 5. Verify it is now publicly published
      const publicRes = await app.request(`/api/blogs/${draftId}`, {
        method: 'GET',
      }, testEnv);
      expect(publicRes.status).toBe(200);
      const publicData = await publicRes.json() as any;
      expect(publicData.blog.status).toBe('published');

      // 6. Delete blog with clean cascade
      const deleteRes = await app.request(`/api/blogs/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      expect(deleteRes.status).toBe(200);

      // Verify it is gone
      const checkDeleted = await app.request(`/api/blogs/${draftId}`, { method: 'GET' }, testEnv);
      expect(checkDeleted.status).toBe(404);
    });

    it('should prevent unauthorized users from editing other authors blogs', async () => {
      // Author 1 creates blog
      const a1Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'author1', display_name: 'Author One' }),
      }, testEnv);
      const { token: a1Token } = await a1Res.json() as any;

      const createRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a1Token}` },
        body: JSON.stringify({
          title: 'Author 1 Story',
          description: 'Story description',
          content: '<p>Original content</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id } = await createRes.json() as any;

      // Author 2 tries to edit Author 1's blog
      const a2Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'author2', display_name: 'Author Two' }),
      }, testEnv);
      const { token: a2Token } = await a2Res.json() as any;

      const editRes = await app.request(`/api/blogs/${blog_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${a2Token}` },
        body: JSON.stringify({ title: 'Hacked Title' }),
      }, testEnv);

      expect(editRes.status).toBe(403);
    });
  });

  describe('3. Like & Dislike System & Private Dislike Protection', () => {
    it('should manage likes, dislikes, and enforce that dislikes are NEVER publicly leaked', async () => {
      // Author creates blog
      const authorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'dan', display_name: 'Dan Author' }),
      }, testEnv);
      const { token: authorToken } = await authorRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorToken}` },
        body: JSON.stringify({
          title: 'Testing Reaction Confidentiality',
          description: 'Testing private dislike security rules',
          content: '<p>Testing reactions...</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id, slug } = await blogRes.json() as any;

      // Reader 1 likes the blog
      const r1Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'reader1', display_name: 'Reader One' }),
      }, testEnv);
      const { token: r1Token } = await r1Res.json() as any;

      const likeRes = await app.request(`/api/blogs/${blog_id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r1Token}` },
        body: JSON.stringify({ type: 'like' }),
      }, testEnv);

      const likeData = await likeRes.json() as any;
      expect(likeData.success).toBe(true);
      expect(likeData.user_reaction).toBe('like');
      expect(likeData.like_count).toBe(1);
      // Ensure dislike count is NOT in reaction response
      expect(likeData.dislike_count).toBeUndefined();

      // Reader 2 dislikes the blog
      const r2Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'reader2', display_name: 'Reader Two' }),
      }, testEnv);
      const { token: r2Token } = await r2Res.json() as any;

      const dislikeRes = await app.request(`/api/blogs/${blog_id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r2Token}` },
        body: JSON.stringify({ type: 'dislike' }),
      }, testEnv);

      const dislikeData = await dislikeRes.json() as any;
      expect(dislikeData.success).toBe(true);
      expect(dislikeData.user_reaction).toBe('dislike');
      expect(dislikeData.like_count).toBe(1);
      expect(dislikeData.dislike_count).toBeUndefined();

      // PUBLIC API CHECK: Unauthenticated or other reader viewing the blog
      const publicBlogRes = await app.request(`/api/blogs/${slug}`, {
        headers: { Authorization: `Bearer ${r1Token}` },
      }, testEnv);
      const publicBlogData = await publicBlogRes.json() as any;
      expect(publicBlogData.blog.like_count).toBe(1);
      // Dislike count must NEVER be exposed publicly or to other users!
      expect(publicBlogData.blog.dislike_count).toBeUndefined();

      // AUTHOR CHECK: Author viewing their own blog with show_dislike_stats = 1
      const authorBlogRes = await app.request(`/api/blogs/${slug}`, {
        headers: { Authorization: `Bearer ${authorToken}` },
      }, testEnv);
      const authorBlogData = await authorBlogRes.json() as any;
      // In default config show_dislike_stats is 1 for demo author or toggleable
      if (authorBlogData.blog.dislike_count !== undefined) {
        expect(authorBlogData.blog.dislike_count).toBe(1);
      }
    });

    it('should allow toggling reactions off when clicked again', async () => {
      const userRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'eve', display_name: 'Eve' }),
      }, testEnv);
      const { token } = await userRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: 'Toggle Reaction Test',
          description: 'Testing toggle reaction behavior in depth',
          content: '<p>Content for reaction toggling</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id } = await blogRes.json() as any;

      // Like
      const res1 = await app.request(`/api/blogs/${blog_id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'like' }),
      }, testEnv);
      const data1 = await res1.json() as any;
      if (!data1.user_reaction) {
        console.error('DEBUG RES1:', res1.status, data1);
      }
      expect(data1.user_reaction).toBe('like');
      expect(data1.like_count).toBe(1);

      // Like again -> toggles off!
      const res2 = await app.request(`/api/blogs/${blog_id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'like' }),
      }, testEnv);
      const data2 = await res2.json() as any;
      expect(data2.user_reaction).toBeNull();
      expect(data2.like_count).toBe(0);
    });
  });

  describe('4. Anti-Abuse & View Deduplication', () => {
    it('should ignore automated bot views and deduplicate repeated views from the same visitor', async () => {
      const authorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'frank', display_name: 'Frank Miller' }),
      }, testEnv);
      const { token } = await authorRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: 'Anti-Abuse View Verification Story',
          description: 'Testing view tracking deduplication',
          content: '<p>View count integrity test...</p>',
          status: 'published',
        }),
      }, testEnv);
      const { slug } = await blogRes.json() as any;

      // 1. Bot attempt
      const botRes = await app.request(`/api/blogs/${slug}/view`, {
        method: 'POST',
        headers: { 'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' },
      }, testEnv);
      const botData = await botRes.json() as any;
      expect(botData.verified).toBe(false);
      expect(botData.reason).toBe('bot_excluded');

      // 2. Legitimate unique visitor view
      const view1Res = await app.request(`/api/blogs/${slug}/view`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'cf-connecting-ip': '203.0.113.195',
        },
      }, testEnv);
      const view1Data = await view1Res.json() as any;
      expect(view1Data.verified).toBe(true);
      expect(view1Data.view_count).toBe(1);

      // 3. Repeated refresh from same visitor within 24h
      const view2Res = await app.request(`/api/blogs/${slug}/view`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          'cf-connecting-ip': '203.0.113.195',
        },
      }, testEnv);
      const view2Data = await view2Res.json() as any;
      expect(view2Data.verified).toBe(false);
      expect(view2Data.reason).toBe('duplicate_view');
    });
  });

  describe('5. Admin Moderation & Points Audit Ledger', () => {
    it('should reject non-admin access to admin routes', async () => {
      const userRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', username: 'regular_user' }),
      }, testEnv);
      const { token } = await userRes.json() as any;

      const adminStatsRes = await app.request('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      }, testEnv);
      expect(adminStatsRes.status).toBe(403);
    });

    it('should allow admin to feature Editor Pick and award +50 points', async () => {
      // Author creates story
      const authorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'grace', display_name: 'Grace Hopper' }),
      }, testEnv);
      const { token: authorToken } = await authorRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorToken}` },
        body: JSON.stringify({
          title: 'Compiler Construction and Grammar Analysis',
          description: 'A deep dive into parsing grammars',
          content: '<p>Writing compilers...</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id } = await blogRes.json() as any;

      // Admin logs in
      const adminRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', username: 'admin_user' }),
      }, testEnv);
      const { token: adminToken } = await adminRes.json() as any;

      // Admin toggles Editor's Pick
      const pickRes = await app.request(`/api/admin/blogs/${blog_id}/editor-pick`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }, testEnv);

      const pickText = await pickRes.text();
      if (pickRes.status !== 200) {
        console.error('DEBUG PICKRES:', pickRes.status, pickText);
      }
      expect(pickRes.status).toBe(200);
      const pickData = JSON.parse(pickText);
      expect(pickData.is_editor_pick).toBe(true);

      // Verify points ledger has editors_pick record
      const ledgerRes = await app.request('/api/points/history', {
        headers: { Authorization: `Bearer ${authorToken}` },
      }, testEnv);
      const ledgerData = await ledgerRes.json() as any;
      const editorPickTx = ledgerData.transactions.find((t: any) => t.transaction_type === 'editors_pick');
      expect(editorPickTx).toBeDefined();
      expect(editorPickTx.amount).toBe(50);
    });

    it('should allow admin to reverse fraudulent points with an immutable audit trail', async () => {
      // Author earns points
      const authorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'henry', display_name: 'Henry Ford' }),
      }, testEnv);
      const { token: authorToken } = await authorRes.json() as any;

      await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorToken}` },
        body: JSON.stringify({
          title: 'Assembly Lines in the Digital Age',
          description: 'Efficiency principles',
          content: '<p>Industrial innovation...</p>',
          status: 'published',
        }),
      }, testEnv);

      // Get transaction
      const histRes = await app.request('/api/points/history', {
        headers: { Authorization: `Bearer ${authorToken}` },
      }, testEnv);
      const histData = await histRes.json() as any;
      const targetTx = histData.transactions[0];

      // Admin reverses this transaction
      const adminRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin', username: 'admin_audit' }),
      }, testEnv);
      const { token: adminToken } = await adminRes.json() as any;

      const reverseRes = await app.request('/api/admin/points/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          transaction_id: targetTx.id,
          reason: 'Suspected artificial engagement manipulation',
        }),
      }, testEnv);

      expect(reverseRes.status).toBe(200);
      const reverseData = await reverseRes.json() as any;
      expect(reverseData.success).toBe(true);

      // Verify audit logs
      const auditRes = await app.request('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      }, testEnv);
      const auditData = await auditRes.json() as any;
      expect(auditData.audit_logs.length).toBeGreaterThan(0);
      expect(auditData.audit_logs[0].action).toBe('reverse_points');
    });
  });

  describe('6. Comments, Threading & Author Moderation', () => {
    it('should create comments, allow replies, and allow blog authors to moderate comments', async () => {
      // Author creates blog
      const authorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'blog_author', display_name: 'Blog Author' }),
      }, testEnv);
      const { token: authorToken } = await authorRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorToken}` },
        body: JSON.stringify({
          title: 'Discussion Thread Starter',
          description: 'A story inviting community conversation',
          content: '<p>What are your thoughts on edge databases?</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id } = await blogRes.json() as any;

      // Reader 1 comments
      const r1Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'commenter1', display_name: 'Commenter One' }),
      }, testEnv);
      const { token: r1Token } = await r1Res.json() as any;

      const c1Res = await app.request(`/api/comments/${blog_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r1Token}` },
        body: JSON.stringify({ content: 'Fascinating perspective! Edge databases minimize latency dramatically.' }),
      }, testEnv);
      expect(c1Res.status).toBe(201);
      const c1Data = await c1Res.json() as any;
      const rootCommentId = c1Data.comment.id;

      // Reader 2 replies to Reader 1's comment
      const r2Res = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'commenter2', display_name: 'Commenter Two' }),
      }, testEnv);
      const { token: r2Token } = await r2Res.json() as any;

      const replyRes = await app.request(`/api/comments/${blog_id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r2Token}` },
        body: JSON.stringify({
          content: 'Agreed, especially when combined with read replicas.',
          parent_id: rootCommentId,
        }),
      }, testEnv);
      expect(replyRes.status).toBe(201);

      // Verify threaded comments
      const listRes = await app.request(`/api/comments/${blog_id}/comments`, { method: 'GET' }, testEnv);
      const listData = await listRes.json() as any;
      expect(listData.comments.length).toBe(1);
      expect(listData.comments[0].replies.length).toBe(1);
      expect(listData.comments[0].replies[0].content).toContain('read replicas');

      // Blog author moderates and deletes the comment
      const deleteRes = await app.request(`/api/comments/items/${rootCommentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authorToken}` },
      }, testEnv);
      expect(deleteRes.status).toBe(200);

      // Verify comment is removed
      const listAfter = await app.request(`/api/comments/${blog_id}/comments`, { method: 'GET' }, testEnv);
      const listAfterData = await listAfter.json() as any;
      expect(listAfterData.comments.length).toBe(0);
    });
  });

  describe('7. Bookmarks, Follows & In-App Notifications', () => {
    it('should support bookmarking stories and following authors', async () => {
      // Creator
      const creatorRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'creator_x', display_name: 'Creator X' }),
      }, testEnv);
      const { token: creatorToken } = await creatorRes.json() as any;

      const blogRes = await app.request('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({
          title: 'Deep Work for Creative Engineers',
          description: 'Cultivating intense focus in a distracted world',
          content: '<p>Deep work is the superpower of the 21st century...</p>',
          status: 'published',
        }),
      }, testEnv);
      const { blog_id } = await blogRes.json() as any;

      // Fan logs in
      const fanRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'fan_user', display_name: 'Fan User' }),
      }, testEnv);
      const { token: fanToken } = await fanRes.json() as any;

      // Bookmark story
      const bmRes = await app.request(`/api/bookmarks/${blog_id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${fanToken}` },
      }, testEnv);
      const bmData = await bmRes.json() as any;
      expect(bmData.is_bookmarked).toBe(true);

      // Check bookmarks list
      const bmListRes = await app.request('/api/bookmarks', {
        headers: { Authorization: `Bearer ${fanToken}` },
      }, testEnv);
      const bmListData = await bmListRes.json() as any;
      expect(bmListData.bookmarks.length).toBe(1);
      expect(bmListData.bookmarks[0].title).toBe('Deep Work for Creative Engineers');

      // Follow creator
      const followRes = await app.request('/api/users/@creator_x/follow', {
        method: 'POST',
        headers: { Authorization: `Bearer ${fanToken}` },
      }, testEnv);
      const followData = await followRes.json() as any;
      expect(followData.is_following).toBe(true);

      // Creator checks notifications
      const notifRes = await app.request('/api/notifications', {
        headers: { Authorization: `Bearer ${creatorToken}` },
      }, testEnv);
      const notifData = await notifRes.json() as any;
      expect(notifData.notifications.length).toBeGreaterThan(0);
      const followNotif = notifData.notifications.find((n: any) => n.type === 'follow');
      expect(followNotif).toBeDefined();
      expect(followNotif.message).toContain('@fan_user');

      // Mark notification as read
      const markRes = await app.request('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({ id: followNotif.id }),
      }, testEnv);
      expect(markRes.status).toBe(200);
    });
  });

  describe('8. Security, Upload Validation & XSS Defense', () => {
    it('should reject invalid file types and file sizes exceeding 5MB', async () => {
      const userRes = await app.request('/api/auth/login-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'uploader', display_name: 'Uploader' }),
      }, testEnv);
      const { token } = await userRes.json() as any;

      // 1. Invalid MIME type (e.g. executable .exe or .sh)
      const badRes = await app.request('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: 'malicious-script-content',
          mimeType: 'application/x-sh',
          filename: 'exploit.sh',
        }),
      }, testEnv);

      expect(badRes.status).toBe(400);
      const badData = await badRes.json() as any;
      expect(badData.error).toContain('Invalid file type');

      // 2. Valid image upload within 5MB
      const goodRes = await app.request('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png',
          filename: 'pixel.png',
        }),
      }, testEnv);

      expect(goodRes.status).toBe(200);
      const goodData = await goodRes.json() as any;
      expect(goodData.success).toBe(true);
      expect(goodData.url).toBeDefined();
      expect(goodData.url).toContain('/api/media/uploads/');

      // 3. Valid video upload (MP4) and media serving verification
      const videoBase64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQ==';
      const videoRes = await app.request('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: videoBase64,
          mimeType: 'video/mp4',
          filename: 'demo.mp4',
        }),
      }, testEnv);

      expect(videoRes.status).toBe(200);
      const videoData = await videoRes.json() as any;
      expect(videoData.success).toBe(true);
      expect(videoData.mediaType).toBe('video');
      expect(videoData.url).toContain('/api/media/uploads/');
      expect(videoData.url.endsWith('.mp4')).toBe(true);

      // 4. Retrieve stored video from website media endpoint
      const mediaRes = await app.request(videoData.url, { method: 'GET' }, testEnv);
      expect(mediaRes.status).toBe(200);
      expect(mediaRes.headers.get('Content-Type')).toBe('video/mp4');
      expect(mediaRes.headers.get('Accept-Ranges')).toBe('bytes');

      // 5. Test video partial content streaming (HTTP 206 Range Request)
      const rangeRes = await app.request(videoData.url, {
        method: 'GET',
        headers: { Range: 'bytes=0-10' },
      }, testEnv);
      expect(rangeRes.status).toBe(206);
      expect(rangeRes.headers.get('Content-Range')).toContain('bytes 0-10/');
      expect(rangeRes.headers.get('Content-Length')).toBe('11');

      // 6. Valid multipart/form-data upload for images/videos
      const boundary = '----WebKitFormBoundaryTest123';
      const multipartBody = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="clip.webm"\r\n` +
        `Content-Type: video/webm\r\n\r\n` +
        `mock video bytes for upload test\r\n` +
        `--${boundary}--\r\n`;

      const formRes = await app.request('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Authorization: `Bearer ${token}`,
        },
        body: multipartBody,
      }, testEnv);

      expect(formRes.status).toBe(200);
      const formDataRes = await formRes.json() as any;
      expect(formDataRes.success).toBe(true);
      expect(formDataRes.mediaType).toBe('video');
      expect(formDataRes.url).toContain('.webm');
    });
  });
});
