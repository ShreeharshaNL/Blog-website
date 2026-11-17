import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  Calendar,
  Eye,
  Heart,
  Sparkles,
  Settings,
  BookOpen,
  Award,
  Users,
  Upload,
} from 'lucide-react';
import { PublicUser, Blog } from '../types';
import { apiRequest, uploadMedia } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LevelBadge } from '../components/LevelBadge';
import { BadgeIcon } from '../components/BadgeIcon';
import { BlogCard } from '../components/BlogCard';
import { LoginModal } from '../components/LoginModal';

export const ProfilePage: React.FC = () => {
  const { username: rawUsername } = useParams<{ username: string }>();
  let resolvedUsername = rawUsername || '';
  try {
    resolvedUsername = decodeURIComponent(resolvedUsername);
  } catch {}
  const username = resolvedUsername.replace(/^(%40|@)+/i, '').trim();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const res = await uploadMedia(file);
      if (res.url) {
        setAvatarUrl(res.url);
      }
    } catch (err: any) {
      alert(`Avatar upload failed: ${err.message || 'Error uploading file'}`);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ user: PublicUser; blogs: Blog[] }>(`/api/users/@${username}`);
        setProfile(res.user);
        setBlogs(res.blogs || []);
        setIsFollowing(Boolean(res.user.is_following));
        setFollowersCount(res.user.followers_count || 0);

        setDisplayName(res.user.display_name);
        setBio(res.user.bio || '');
        setAvatarUrl(res.user.avatar_url || '');
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (username) {
      loadProfile();
    } else {
      setIsLoading(false);
    }
  }, [username]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    const prev = isFollowing;
    setIsFollowing(!prev);
    setFollowersCount((prevCount) => (prev ? prevCount - 1 : prevCount + 1));

    try {
      const res = await apiRequest<{ is_following: boolean }>(`/api/users/@${username}/follow`, {
        method: 'POST',
      });
      setIsFollowing(res.is_following);
    } catch {
      setIsFollowing(prev);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim() || undefined,
        }),
      });

      if (profile) {
        setProfile({
          ...profile,
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim() || null,
        });
      }
      setShowEditModal(false);
    } catch (err: any) {
      alert('Failed to update profile: ' + (err.message || 'Error'));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-6">
        <div className="h-40 bg-background-elevated rounded-2xl animate-pulse" />
        <div className="h-10 bg-background-elevated rounded-xl animate-pulse w-1/3" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-3xl font-bold mb-3">Author Not Found</h2>
        <p className="text-sm text-foreground-muted mb-6">
          The creator profile @{username} does not exist or has been removed.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username.toLowerCase() === profile.username.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Profile Header Banner Card */}
      <div className="rounded-3xl border border-border bg-background-surface overflow-hidden shadow-xl p-6 sm:p-10 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left w-full sm:w-auto">
            <img
              src={
                profile.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.username}`
              }
              alt={profile.display_name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-background-elevated shadow-lg shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-1">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {profile.display_name}
                </h1>
                <LevelBadge points={profile.points} level={profile.level} />
              </div>
              <p className="text-sm text-foreground-subtle font-mono mb-2">@{profile.username}</p>
              <p className="text-xs text-foreground-muted max-w-lg leading-relaxed">
                {profile.bio || 'Independent author sharing thoughtful writing on INKVERSE.'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 text-xs text-foreground-subtle font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-background-elevated hover:bg-background-subtle text-foreground transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isFollowing
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-rose-500/10 hover:text-rose-400'
                    : 'bg-primary hover:bg-orange-600 text-white shadow-md shadow-orange-900/30'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Aggregate Stats Counter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-8 pt-6 border-t border-border/60 text-center font-mono text-xs">
          <div>
            <p className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              {profile.total_blogs || 0}
            </p>
            <p className="text-[11px] text-foreground-subtle uppercase mt-0.5">Published Stories</p>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              {(profile.total_views || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-foreground-subtle uppercase mt-0.5">Verified Views</p>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl font-bold text-rose-400">
              {(profile.total_likes || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-foreground-subtle uppercase mt-0.5">Genuine Likes</p>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl font-bold text-amber-500 dark:text-amber-400">
              {profile.points}
            </p>
            <p className="text-[11px] text-foreground-subtle uppercase mt-0.5">Reputation Points</p>
          </div>
          <div>
            <p className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              {followersCount}
            </p>
            <p className="text-[11px] text-foreground-subtle uppercase mt-0.5">Followers</p>
          </div>
        </div>
      </div>

      {/* Achievement Badges Showcase */}
      {profile.badges && profile.badges.length > 0 && (
        <section className="p-6 rounded-2xl border border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-xl font-bold">Earned Badges</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile.badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs"
              >
                <BadgeIcon icon={b.icon} className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{b.name}</span>
                <span className="text-[10px] font-mono text-orange-600 dark:text-orange-300">+{b.badge_points} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Published Stories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span>Stories by {profile.display_name} ({blogs.length})</span>
          </h2>
        </div>

        {blogs.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-background-surface/40">
            <p className="text-xs text-foreground-muted">No published stories yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <BlogCard key={b.id} blog={{ ...b, author: profile }} />
            ))}
          </div>
        )}
      </section>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-background-surface border border-border rounded-2xl p-6 shadow-2xl text-foreground animate-slide-up">
            <h3 className="font-bold text-lg mb-4">Edit Profile Settings</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                  Bio / Tagline
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                  Profile Avatar
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`}
                    alt="Preview"
                    className="w-12 h-12 rounded-full object-cover border border-border"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-background-surface hover:bg-background-subtle border border-border text-foreground transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Avatar'}</span>
                    </button>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </div>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Or paste image URL (e.g. https://... or /api/media/...)"
                  className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-primary hover:bg-orange-600 text-white rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
