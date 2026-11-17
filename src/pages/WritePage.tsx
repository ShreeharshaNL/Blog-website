import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Save,
  Send,
  Eye,
  Edit3,
  Calendar,
  Image as ImageIcon,
  Settings,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RotateCcw,
  AlertCircle,
  Upload,
  X,
  Link2,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Category, Blog } from '../types';
import { apiRequest, uploadMedia } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BlogEditor } from '../components/BlogEditor';

export const WritePage: React.FC = () => {
  const { id: paramId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentBlogId, setCurrentBlogId] = useState<string | null>(paramId || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled' | 'unlisted'>('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasRestoredLocal, setHasRestoredLocal] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showUrlCoverInput, setShowUrlCoverInput] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const res = await uploadMedia(file);
      if (res.url) {
        setCoverImage(res.url);
      }
    } catch (err: any) {
      alert(`Cover upload failed: ${err.message || 'Error uploading cover image'}`);
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const localDraftKey = `inkverse_draft_${currentBlogId || 'new'}`;

  // 1. Load categories and existing blog if editing
  useEffect(() => {
    async function loadData() {
      try {
        const catRes = await apiRequest<{ categories: Category[] }>('/api/categories');
        setCategories(catRes.categories || []);
        if (catRes.categories && catRes.categories.length > 0 && !categoryId) {
          setCategoryId(catRes.categories[0].id);
        }

        if (paramId) {
          setCurrentBlogId(paramId);
          const blogData = await apiRequest<{ blog: Blog }>(`/api/blogs/${paramId}`);
          const b = blogData.blog;
          if (b) {
            setTitle(b.title || '');
            setDescription(b.description || '');
            setContent(b.content || '');
            setCoverImage(b.cover_image || '');
            setCategoryId(b.category_id || (catRes.categories?.[0]?.id || ''));
            setStatus(b.status || 'draft');
            setCustomSlug(b.slug || '');
            setSeoTitle(b.seo_title || '');
            setSeoDescription(b.seo_description || '');
            if (b.tags) setTags(b.tags.map((t) => t.name));
            setLastSaved(new Date(b.updated_at || Date.now()));
          }
        } else {
          // Check local draft for new articles
          const savedLocal = localStorage.getItem('inkverse_draft_new');
          if (savedLocal) {
            try {
              const parsed = JSON.parse(savedLocal);
              if (parsed.title || parsed.content) {
                setTitle(parsed.title || '');
                setDescription(parsed.description || '');
                setContent(parsed.content || '');
                setCoverImage(parsed.coverImage || '');
                if (parsed.categoryId) setCategoryId(parsed.categoryId);
                if (parsed.tags) setTags(parsed.tags);
                setHasRestoredLocal(true);
              }
            } catch {
              // Ignore corrupt local storage
            }
          }
        }
      } catch (err) {
        console.error('Failed to load blog for editing:', err);
      }
    }

    loadData();
  }, [paramId]);

  // 2. Autosave to local storage (debounced by 1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.trim() || content.trim()) {
        try {
          const draftPayload = {
            title,
            description,
            content,
            coverImage,
            categoryId,
            tags,
            savedAt: Date.now(),
          };
          localStorage.setItem(localDraftKey, JSON.stringify(draftPayload));
          setLastSaved(new Date());
        } catch {
          // Ignore local storage quota errors
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, description, content, coverImage, categoryId, tags, localDraftKey]);

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

  const discardLocalDraft = () => {
    localStorage.removeItem('inkverse_draft_new');
    setTitle('');
    setDescription('');
    setContent('');
    setCoverImage('');
    setTags([]);
    setHasRestoredLocal(false);
  };

  // 3. Save / Publish Handler
  const handleSave = async (targetStatus: 'draft' | 'published' | 'scheduled') => {
    const cleanTitle = title.trim();

    // Validation for published posts
    if (targetStatus === 'published') {
      if (!cleanTitle) {
        alert('Please enter an article title before publishing.');
        return;
      }
      if (!content.trim() || content.replace(/<[^>]*>/g, '').trim().length < 10) {
        alert('Please write article content (at least 10 characters) before publishing.');
        return;
      }
    }

    // For drafts, require at least something
    if (targetStatus === 'draft' && !cleanTitle && !content.trim()) {
      alert('Please enter a title or write some content before saving draft.');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Auto-extract description from content if omitted
      const plainContent = content.replace(/<[^>]*>/g, ' ').trim();
      const finalDesc = description.trim() ||
        (plainContent.length > 0 ? plainContent.slice(0, 160) : '') ||
        'Draft story in progress.';

      const payload = {
        title: cleanTitle || 'Untitled Draft',
        description: finalDesc,
        content: content || '',
        cover_image: coverImage.trim() || null,
        category_id: categoryId || null,
        tags,
        status: targetStatus,
        slug: customSlug.trim() || undefined,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
        scheduled_at: targetStatus === 'scheduled' && scheduledDate ? new Date(scheduledDate).getTime() : null,
      };

      if (currentBlogId) {
        // Update existing story/draft
        await apiRequest(`/api/blogs/${currentBlogId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setStatus(targetStatus);
        setLastSaved(new Date());

        if (targetStatus === 'published') {
          // Clear local cache
          localStorage.removeItem(`inkverse_draft_${currentBlogId}`);
          navigate(`/blog/${customSlug || currentBlogId}`);
        } else {
          setSaveMessage('Draft saved successfully!');
          setTimeout(() => setSaveMessage(null), 3000);
        }
      } else {
        // Create new story/draft
        const res = await apiRequest<{ success: boolean; blog_id: string; slug: string }>(
          '/api/blogs',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );

        setCurrentBlogId(res.blog_id);
        setStatus(targetStatus);
        setLastSaved(new Date());
        localStorage.removeItem('inkverse_draft_new');

        if (targetStatus === 'published') {
          navigate(`/blog/${res.slug}`);
        } else {
          // Replace URL to /write/:id so subsequent saves update the record
          navigate(`/write/${res.blog_id}`, { replace: true });
          setSaveMessage('Draft created and saved!');
          setTimeout(() => setSaveMessage(null), 3000);
        }
      }
    } catch (err: any) {
      alert('Failed to save story: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="font-serif text-3xl font-bold mb-3">Sign in to Write</h2>
        <p className="text-sm text-foreground-muted mb-6">
          You need an account to write and publish stories on INKVERSE.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Restored Local Draft Banner */}
      {hasRestoredLocal && (
        <div className="p-3 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Restored your unsaved draft from local storage.</span>
          </div>
          <button
            onClick={discardLocalDraft}
            className="flex items-center gap-1 font-semibold hover:underline text-rose-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Status Badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              status === 'published'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
            }`}
          >
            {status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Message or Last Saved */}
          {saveMessage ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMessage}</span>
            </span>
          ) : lastSaved ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-foreground-subtle font-mono">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          ) : null}

          {/* Toggle Preview / Edit */}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              isPreview
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted'
            }`}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreview ? 'Editor' : 'Preview'}</span>
          </button>

          {/* SEO & Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showSettings
                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/25'
                : 'border-border bg-background-surface hover:bg-background-elevated text-foreground-muted hover:text-foreground'
            }`}
            title="Publishing Settings & SEO"
          >
            <Settings className={`w-3.5 h-3.5 transition-transform ${showSettings ? 'rotate-90 text-white' : ''}`} />
            <span>Settings</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-border bg-background-surface hover:bg-background-elevated text-foreground transition-colors disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving && status === 'draft' ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {/* Publish / Update */}
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSaving && status === 'published'
                ? 'Publishing...'
                : status === 'published'
                ? 'Update Story'
                : 'Publish'}
            </span>
          </button>
        </div>
      </div>

      {/* Settings / Metadata Panel - Placed right below the top action bar for instant access */}
      {showSettings && (
        <div className="p-6 rounded-2xl border border-primary/30 bg-background-surface space-y-6 animate-slide-up shadow-xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <Settings className="w-4 h-4 text-primary" />
              <span>Publishing Configuration &amp; SEO</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                Primary Topic / Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                placeholder="e.g. what-is-omarchy"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-primary/20 text-primary"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-400 ml-1 cursor-pointer"
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
                className="text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none font-mono cursor-pointer"
              />
            </div>
          </div>

          {/* SEO Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                SEO Meta Title (Optional)
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Custom title for Google search..."
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                SEO Meta Description (Optional)
              </label>
              <input
                type="text"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Brief summary for search engines..."
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Editor Main Content or Preview Mode */}
      {isPreview ? (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Preview Mode
              </span>
              {categories.find((c) => c.id === categoryId) && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  {categories.find((c) => c.id === categoryId)?.name}
                </span>
              )}
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">{title || 'Untitled Article'}</h1>
            {description && (
              <p className="font-serif text-lg text-foreground-muted italic">{description}</p>
            )}
          </div>

          {coverImage && (
            <img src={coverImage} alt="Cover" className="w-full max-h-[450px] object-cover rounded-2xl" />
          )}

          <div
            className="prose-editorial"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(content, {
                ADD_TAGS: ['video', 'source'],
                ADD_ATTR: [
                  'controls',
                  'autoplay',
                  'loop',
                  'muted',
                  'poster',
                  'preload',
                  'playsinline',
                  'target',
                  'id',
                  'class',
                ],
              }),
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category Quick Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-background-surface">
            <div className="flex items-center gap-2">
              <label
                htmlFor="category-select"
                className="text-xs font-semibold uppercase tracking-wider text-foreground-subtle"
              >
                Category:
              </label>
              <select
                id="category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-primary hover:border-primary/50 transition-colors cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-orange-600 font-semibold cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showSettings ? 'Hide Advanced SEO & Slug' : 'Advanced SEO & Slug Settings'}</span>
            </button>
          </div>

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
            placeholder="Write a clear sub-heading or description (optional for drafts)..."
            className="w-full font-serif text-base sm:text-lg bg-transparent text-foreground-muted placeholder:text-foreground-subtle focus:outline-none resize-none leading-relaxed italic"
          />

          {/* Cover Image Upload / Selection */}
          <div className="rounded-2xl border border-border bg-background-surface p-4 transition-all">
            {coverImage ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-border max-h-[300px] group bg-black/5">
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-100 transition-colors shadow-lg cursor-pointer"
                    >
                      Change Cover Image
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverImage('')}
                      className="p-1.5 rounded-lg text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-lg cursor-pointer"
                      title="Remove Cover Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {coverImage.startsWith('/api/media/') ? 'Cover stored on website' : 'Cover image linked'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Remove Cover
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 border border-dashed border-border rounded-xl bg-background-elevated/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Upload Cover Image</p>
                      <p className="text-[11px] text-foreground-muted">Directly stored on website (PNG, JPG, WebP, GIF)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCover ? 'Uploading...' : 'Choose File'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrlCoverInput(!showUrlCoverInput)}
                      className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors cursor-pointer"
                      title="Paste image link instead"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showUrlCoverInput && (
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background-elevated animate-fade-in">
                    <ImageIcon className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Or paste external image URL..."
                      className="w-full text-xs bg-transparent text-foreground placeholder:text-foreground-subtle focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
              className="hidden"
              onChange={handleCoverUpload}
              disabled={isUploadingCover}
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
    </div>
  );
};
