-- INKVERSE Initial Database Schema
-- Cloudflare D1 (SQLite) Migration 0001

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'banned')),
    points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    interests TEXT DEFAULT '[]',
    show_dislike_stats INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. OAuth Accounts
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'github')),
    provider_user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- 3. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 5. Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- 6. Blogs
CREATE TABLE IF NOT EXISTS blogs (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'scheduled', 'unlisted')),
    scheduled_at INTEGER,
    published_at INTEGER,
    reading_time_minutes INTEGER NOT NULL DEFAULT 1,
    word_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    dislike_count INTEGER NOT NULL DEFAULT 0,
    is_editor_pick INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_category_id ON blogs(category_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status_published_at ON blogs(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_view_count ON blogs(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_like_count ON blogs(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_editor_pick ON blogs(is_editor_pick);

-- 7. Blog Tags Join
CREATE TABLE IF NOT EXISTS blog_tags (
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY(blog_id, tag_id)
);

-- 8. Blog Revisions
CREATE TABLE IF NOT EXISTS blog_revisions (
    id TEXT PRIMARY KEY,
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_revisions_blog_id ON blog_revisions(blog_id);

-- 9. Reactions (1 reaction per user per blog)
CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('like', 'dislike')),
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, blog_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_blog_id ON reactions(blog_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_blog ON reactions(user_id, blog_id);

-- 10. Blog Views (Anti-abuse / deduplication)
CREATE TABLE IF NOT EXISTS blog_views (
    id TEXT PRIMARY KEY,
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    viewer_hash TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    viewed_at INTEGER NOT NULL,
    UNIQUE(blog_id, viewer_hash)
);

CREATE INDEX IF NOT EXISTS idx_blog_views_blog_time ON blog_views(blog_id, viewed_at);

-- 11. Points Transactions (Immutable ledger)
CREATE TABLE IF NOT EXISTS points_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    reference_id TEXT,
    description TEXT NOT NULL,
    is_reversed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_ref ON points_transactions(reference_id, transaction_type);

-- 12. Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    badge_points INTEGER NOT NULL DEFAULT 30,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);

-- 13. User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    awarded_at INTEGER NOT NULL,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- 14. Followers
CREATE TABLE IF NOT EXISTS followers (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- 15. Comments
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    like_count INTEGER NOT NULL DEFAULT 0,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_reported INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_blog ON comments(blog_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 16. Comment Reactions
CREATE TABLE IF NOT EXISTS comment_reactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'like',
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, comment_id)
);

-- 17. Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, blog_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- 19. Reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('blog', 'comment', 'user')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed')),
    resolved_by TEXT REFERENCES users(id),
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

-- 20. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- 21. Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at INTEGER NOT NULL
);

-- Seed initial categories, achievements and settings
INSERT OR IGNORE INTO platform_settings (key, value, description, updated_at) VALUES
('reward_publish_blog', '20', 'Points awarded when author publishes a blog', 1700000000000),
('reward_100_views', '5', 'Points awarded per 100 unique verified views', 1700000000000),
('reward_10_likes', '5', 'Points awarded per 10 genuine likes', 1700000000000),
('reward_editor_pick', '50', 'Points awarded when blog is selected as Editor Pick', 1700000000000),
('reward_quality_badge', '30', 'Points awarded upon receiving a quality badge', 1700000000000),
('reward_streak_7days', '25', 'Points awarded for completing 7-day writing streak', 1700000000000),
('moderation_mode', 'false', 'Require approval before public display', 1700000000000);

INSERT OR IGNORE INTO categories (id, name, slug, description, icon, color, is_featured, created_at) VALUES
('cat_tech', 'Technology', 'technology', 'Deep dives into modern computing, hardware, and engineering.', 'Cpu', 'from-blue-500 to-cyan-500', 1, 1700000000000),
('cat_prog', 'Programming', 'programming', 'Languages, frameworks, architecture, and coding craftsmanship.', 'Code2', 'from-purple-500 to-indigo-500', 1, 1700000000000),
('cat_ai', 'Artificial Intelligence', 'artificial-intelligence', 'Machine learning, LLMs, neural networks, and future AI.', 'Sparkles', 'from-violet-500 to-fuchsia-500', 1, 1700000000000),
('cat_science', 'Science', 'science', 'Discoveries in physics, biology, space exploration and more.', 'Atom', 'from-emerald-500 to-teal-500', 1, 1700000000000),
('cat_biz', 'Business', 'business', 'Market economics, strategy, leadership, and finance.', 'TrendingUp', 'from-amber-500 to-orange-500', 0, 1700000000000),
('cat_startups', 'Startups', 'startups', 'Zero to one stories, venture building, and product lessons.', 'Rocket', 'from-rose-500 to-pink-500', 1, 1700000000000),
('cat_lifestyle', 'Lifestyle', 'lifestyle', 'Productivity, intentional living, work-life balance, and habits.', 'Coffee', 'from-teal-500 to-cyan-500', 0, 1700000000000),
('cat_dev', 'Personal Development', 'personal-development', 'Mental models, growth mindset, and lifelong mastery.', 'Compass', 'from-indigo-500 to-blue-500', 0, 1700000000000),
('cat_travel', 'Travel', 'travel', 'Explorations, cultural narratives, and dispatch from the road.', 'MapPin', 'from-green-500 to-emerald-500', 0, 1700000000000),
('cat_gaming', 'Gaming', 'gaming', 'Game design, industry analysis, reviews and interactive media.', 'Gamepad2', 'from-red-500 to-rose-500', 0, 1700000000000);

INSERT OR IGNORE INTO achievements (id, code, name, description, icon, badge_points, created_at) VALUES
('ach_first_pub', 'first_publication', 'First Publication', 'Published your very first story on INKVERSE', 'Feather', 20, 1700000000000),
('ach_views_1k', 'views_1k', '1K Views', 'Accumulated 1,000 verified readers across your stories', 'Eye', 30, 1700000000000),
('ach_views_10k', 'views_10k', '10K Views', 'Reached a massive milestone of 10,000 verified readers', 'Flame', 50, 1700000000000),
('ach_likes_100', 'likes_100', '100 Likes', 'Received 100 genuine likes from appreciative readers', 'Heart', 30, 1700000000000),
('ach_consistent', 'consistent_writer', 'Consistent Writer', 'Maintained a 7-day active publishing or writing streak', 'CalendarCheck', 40, 1700000000000),
('ach_community_fav', 'community_favorite', 'Community Favorite', 'Earned widespread community praise and bookmark saves', 'Star', 35, 1700000000000),
('ach_editors_choice', 'editors_choice', 'Editor''s Choice', 'Handpicked by INKVERSE curators for editorial excellence', 'Award', 50, 1700000000000),
('ach_rising_star', 'rising_star', 'Rising Star', 'One of the fastest-growing writers on the weekly leaderboard', 'Zap', 30, 1700000000000);
