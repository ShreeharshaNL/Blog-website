export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'unlisted';
export type ReactionType = 'like' | 'dislike';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: UserRole;
  status: UserStatus;
  points: number;
  level: number;
  interests: string[];
  show_dislike_stats: boolean;
  created_at: number;
  updated_at: number;
}

export interface PublicUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: UserRole;
  points: number;
  level: number;
  badges?: Achievement[];
  total_blogs?: number;
  total_views?: number;
  total_likes?: number;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_featured: boolean;
  blog_count?: number;
  created_at: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Blog {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  cover_image?: string | null;
  category_id?: string | null;
  category?: Category | null;
  tags?: Tag[];
  status: BlogStatus;
  scheduled_at?: number | null;
  published_at?: number | null;
  reading_time_minutes: number;
  word_count: number;
  view_count: number;
  like_count: number;
  comment_count?: number;
  dislike_count?: number; // Only returned if request is by blog author AND author has show_dislike_stats=true
  is_editor_pick: boolean;
  is_featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  author?: PublicUser;
  user_reaction?: ReactionType | null;
  is_bookmarked?: boolean;
  created_at: number;
  updated_at: number;
}

export interface BlogRevision {
  id: string;
  blog_id: string;
  title: string;
  description?: string | null;
  content: string;
  created_at: number;
}

export interface Comment {
  id: string;
  blog_id: string;
  author_id: string;
  parent_id?: string | null;
  content: string;
  like_count: number;
  is_pinned: boolean;
  is_reported: boolean;
  created_at: number;
  updated_at: number;
  author: PublicUser;
  user_reaction?: 'like' | null;
  replies?: Comment[];
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reference_id?: string | null;
  description: string;
  is_reversed: boolean;
  created_at: number;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  badge_points: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  awarded_at: number;
  achievement: Achievement;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: number;
  actor?: PublicUser | null;
}

export interface AuthorAnalytics {
  overview: {
    total_blogs: number;
    total_views: number;
    total_likes: number;
    private_dislike_count: number | null; // null if author has dislikes disabled
    show_dislike_stats: boolean;
    total_points: number;
    level: number;
    followers: number;
    engagement_rate: number;
  };
  views_timeline: { date: string; views: number }[];
  likes_timeline: { date: string; likes: number }[];
  top_blogs: Blog[];
}

export interface LeaderboardItem {
  rank: number;
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  points: number;
  level: number;
  total_blogs: number;
  total_views: number;
  badges: Achievement[];
}

export interface PlatformSettings {
  reward_publish_blog: number;
  reward_100_views: number;
  reward_10_likes: number;
  reward_editor_pick: number;
  reward_quality_badge: number;
  reward_streak_7days: number;
  moderation_mode: boolean;
}

export interface ReportItem {
  id: string;
  reporter_id: string;
  reporter?: PublicUser;
  target_type: 'blog' | 'comment' | 'user';
  target_id: string;
  reason: string;
  details?: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: number;
  resolved_at?: number | null;
  target_title?: string;
  target_author?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_username?: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: string | null;
  ip_address?: string | null;
  created_at: number;
}
