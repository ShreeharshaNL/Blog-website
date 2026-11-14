import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid, Compass, ArrowRight } from 'lucide-react';
import { Category } from '../types';
import { apiRequest } from '../utils/api';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest<{ categories: Category[] }>('/api/categories');
        setCategories(res.categories || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-amber-500 dark:text-amber-400 mb-3">
          <Grid className="w-3.5 h-3.5" />
          <span>Knowledge Spectrum</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
          Topics &amp; Categories
        </h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          Browse our curated taxonomy of editorial subjects. Discover perspectives on technology, systems, craft, and human growth.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/categories/${cat.slug}`}
            className="group relative rounded-2xl border border-border bg-background-surface hover:bg-background-elevated hover:border-orange-500/40 p-6 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-orange-950/20"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-semibold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  {cat.blog_count || 0} stories
                </span>
              </div>

              <h3 className="font-serif text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                {cat.name}
              </h3>
              <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                {cat.description || `Read thoughtful articles and analytical perspectives about ${cat.name.toLowerCase()}.`}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary group-hover:text-orange-500">
              <span>Explore category</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
