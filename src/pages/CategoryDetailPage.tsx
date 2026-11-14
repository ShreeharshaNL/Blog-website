import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { Blog, Category } from '../types';
import { apiRequest } from '../utils/api';
import { BlogCard } from '../components/BlogCard';

export const CategoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryStories() {
      setIsLoading(true);
      try {
        const [catList, storiesRes] = await Promise.all([
          apiRequest<{ categories: Category[] }>('/api/categories'),
          apiRequest<{ blogs: Blog[] }>(`/api/blogs?category=${slug}&limit=20`),
        ]);

        const current = catList.categories?.find((c) => c.slug === slug);
        setCategory(current || null);
        setBlogs(storiesRes.blogs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) loadCategoryStories();
  }, [slug]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <Link
        to="/categories"
        className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Categories</span>
      </Link>

      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-3 capitalize">
          {category ? category.name : slug?.replace(/-/g, ' ')}
        </h1>
        <p className="text-sm text-foreground-muted">
          {category?.description || `Curated publications exploring ${slug?.replace(/-/g, ' ')}.`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl border border-border bg-background-surface animate-pulse" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-background-surface/40">
          <Compass className="w-10 h-10 text-foreground-subtle mx-auto mb-2 opacity-60" />
          <h3 className="font-serif text-xl font-bold mb-1">No stories yet in this topic</h3>
          <p className="text-xs text-foreground-muted mb-4">
            Be the very first writer to share insights in this category!
          </p>
          <Link
            to="/write"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white"
          >
            Write the First Story
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};
