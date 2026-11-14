import { UserRole, UserStatus } from '../src/types';

export interface Env {
  DB: D1Database;
  MEDIA_BUCKET?: R2Bucket;
  KV?: KVNamespace;
  ENVIRONMENT?: string;
  SITE_URL?: string;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  points: number;
  level: number;
  show_dislike_stats: boolean;
}

export interface HonoVariables {
  user: SessionUser | null;
  sessionToken: string | null;
}
