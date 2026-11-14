import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Save,
  Send,
  Eye,
  Edit3,
  Calendar,
  Image as ImageIcon,
  Tag as TagIcon,
  Globe,
  Settings,
  CheckCircle2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Category, Blog } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BlogEditor } from '../components/BlogEditor';

export const WritePage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'unlisted'>('published');
  const [scheduledDate, setScheduledDate] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load categories and existing blog if editing
  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await apiRequest<{ categories: Category[] }>('/api/categories');
        setCategories(catRes.categories || []);
        if (catRes.categories && catRes.categories.length > 0) {
          setCategoryId(catRes.categories[0].id);
        }

        if (id) {
          const blogData = await apiRequest<{ blog: Blog }>(`/api/blogs/${id}`);
          const b = blogData.blog;
          setTitle(b.title);
          setDescription(b.description);
          setContent(b.content);
          setCoverImage(b.cover_image || '');
          setCategoryId(b.category_id || '');
          setStatus(b.status);
          setCustomSlug(b.slug);
          setSeoTitle(b.seo_title || '');
          setSeoDescription(b.seo_description || '');
          if (b.tags) setTags(b.tags.map((t) => t.name));
        }
      } catch (err) {
        console.error('Failed to load blog for editing:', err);
      }
    }

    loadData();
  }, [id]);

  // Autosave draft locally
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim() && content.trim() && status === 'draft') {
        setLastSaved(new Date());
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [title, content, status]);

  // Word count & reading time stats
  const textWords = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean);
  const wordCount = textWords.length;
  const charCount = content.replace(/<[^>]*>/g, '').length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (clean && !tags.includes(clean) && tags.length < 5) {
        setTags([...tags, clean]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (targetStatus: 'draft' | 'published' | 'scheduled') => {
    if (!title.trim()) {
      alert('Please enter an article title.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      alert('Please write a brief article description (at least 5 characters).');
      return;
    }
    if (!content.trim() || content.trim().length < 10) {
      alert('Please write article content.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        content,
        cover_image: coverImage.trim() || undefined,
        category_id: categoryId || undefined,
        tags,
        status: targetStatus,
        slug: customSlug.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
        scheduled_at: targetStatus === 'scheduled' && scheduledDate ? new Date(scheduledDate).getTime() : undefined,
      };

      if (id) {
        await apiRequest(`/api/blogs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        navigate(`/blog/${customSlug || id}`);
      } else {
        const res = await apiRequest<{ success: boolean; blog_id: string; slug: string }>(
          '/api/blogs',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        if (targetStatus === 'published') {
          navigate(`/blog/${res.slug}`);
        } else {
          alert('Draft saved successfully!');
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      alert('Failed to save story: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Sparkles className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
        <h2 className="font-serif text-3xl font-bold mb-3">Sign in to Publish</h2>
        <p className="text-sm text-foreground-muted mb-6">
          You need an account to write and publish stories on INKVERSE.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Editor</span>
        </button>

        <div className="flex items-center gap-2.5">
          {lastSaved && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-foreground-subtle font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Autosaved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          )}

          {/* Toggle Preview / Edit */}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isPreview
                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/40'
                : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted'
            }`}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreview ? 'Back to Editor' : 'Preview'}</span>
          </button>

          {/* SEO & Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showSettings
                ? 'bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-500/40'
                : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted'
            }`}
            title="Publishing Settings & SEO"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-border bg-background-surface hover:bg-background-elevated text-foreground transition-colors disabled:opacity-40"
          >
            Save Draft
          </button>

          {/* Publish */}
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white shadow-md shadow-orange-950/30 transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Content or Preview Mode */}
      {isPreview ? (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          <div className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Preview Mode
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">{title || 'Untitled Article'}</h1>
            <p className="font-serif text-lg text-foreground-muted italic">{description}</p>
          </div>

          {coverImage && (
            <img src={coverImage} alt="Cover" className="w-full max-h-[450px] object-cover rounded-2xl" />
          )}

          <div
            className="prose-editorial"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of your story..."
            className="w-full font-serif text-3xl sm:text-5xl font-bold bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none tracking-tight"
          />

          {/* Subtitle / Description Input */}
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a clear, captivating sub-heading or description..."
            className="w-full font-serif text-base sm:text-lg bg-transparent text-foreground-muted placeholder:text-foreground-subtle focus:outline-none resize-none leading-relaxed italic"
          />

          {/* Cover Image Input */}
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background-surface">
            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="Paste cover image URL (or upload image in editor toolbar)..."
              className="w-full text-xs bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none"
            />
          </div>

          {/* Tiptap Rich Text Editor */}
          <BlogEditor
            initialContent={content}
            onChange={(html) => setContent(html)}
          />

          {/* Word Count & Read Stats Bar */}
          <div className="flex items-center justify-between text-xs text-foreground-subtle font-mono pt-2 border-t border-border/60">
            <span>
              {wordCount} words · {charCount} characters
            </span>
            <span>~{readingTime} min read</span>
          </div>
        </div>
      )}

      {/* Settings / Metadata Drawer */}
      {showSettings && (
        <div className="p-6 rounded-2xl border border-border bg-background-surface space-y-6 animate-slide-up">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <span>Publishing Configuration &amp; SEO</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                Primary Topic / Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Slug */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                Custom URL Slug (Optional)
              </label>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="e.g. edge-computing-evolution"
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Tag Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Tags (Up to 5 tags, press Enter to add)
            </label>
            <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl border border-border bg-background-elevated">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-orange-500/20 text-orange-600 dark:text-orange-300"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag..."
                  className="text-xs bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none p-1 font-mono"
                />
              )}
            </div>
          </div>

          {/* Scheduled Publishing */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
              Scheduled Publishing Date (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  if (e.target.value) setStatus('scheduled');
                }}
                className="text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
