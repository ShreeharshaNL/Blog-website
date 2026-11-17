import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowRight, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, uploadMedia } from '../utils/api';
import { Category } from '../types';

export const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
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
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setDisplayName(user.display_name);
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
      setSelectedInterests(user.interests || []);
    }

    async function loadCategories() {
      try {
        const res = await apiRequest<{ categories: Category[] }>('/api/categories');
        setCategories(res.categories || []);
      } catch (err) {
        // Ignore
      }
    }
    loadCategories();
  }, [user]);

  const toggleInterest = (slug: string) => {
    if (selectedInterests.includes(slug)) {
      setSelectedInterests(selectedInterests.filter((s) => s !== slug));
    } else {
      setSelectedInterests([...selectedInterests, slug]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (displayName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim() || undefined,
          interests: selectedInterests,
        }),
      });
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="rounded-3xl border border-border bg-background-surface p-6 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Welcome to INKVERSE
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Let's configure your creator profile and personal interests.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Unique Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs font-mono text-foreground-subtle">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^\w-]/g, ''))}
                className="w-full text-xs font-mono pl-8 pr-3 py-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="your_handle"
              />
            </div>
            <p className="text-[11px] text-foreground-subtle mt-1 font-mono">
              Your profile URL: blog.shreeharsha.online/@{username || 'username'}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="e.g. Elena Rostova"
            />
          </div>

          {/* Short Bio */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Short Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
              placeholder="A sentence or two about what you write and think about..."
            />
          </div>

          {/* Avatar URL & Upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Profile Avatar (Stored on Website)
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingAvatar ? 'Uploading...' : 'Upload Avatar'}</span>
                </button>
                {avatarUrl && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Avatar attached
                  </span>
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
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Or paste image URL (e.g. https://...)"
            />
          </div>

          {/* Interests selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-2">
              Select Your Interests &amp; Preferred Topics
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedInterests.includes(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleInterest(cat.slug)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                        : 'border-border bg-background-elevated hover:bg-background-subtle text-foreground-muted'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Saving Profile...' : 'Complete Profile & Enter INKVERSE'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
