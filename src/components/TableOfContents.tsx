import React, { useEffect, useState } from 'react';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const TableOfContents: React.FC<{ contentHtml: string }> = ({ contentHtml }) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Parse headings from the rendered article in DOM
    const article = document.querySelector('.article-body');
    if (!article) return;

    const headingElements = article.querySelectorAll('h1, h2, h3');
    const items: TocItem[] = [];

    headingElements.forEach((el, index) => {
      const text = el.textContent || '';
      if (!text.trim()) return;

      let id = el.id;
      if (!id) {
        id = `heading-${index}-${text.toLowerCase().replace(/[^\w-]/g, '-')}`;
        el.id = id;
      }

      const level = parseInt(el.tagName.substring(1), 10);
      items.push({ id, text, level });
    });

    setHeadings(items);

    // Scrollspy
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      for (let i = items.length - 1; i >= 0; i--) {
        const el = document.getElementById(items[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(items[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [contentHtml]);

  if (headings.length < 2) return null;

  return (
    <div className="p-4 rounded-2xl bg-background-surface border border-border">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        <List className="w-4 h-4 text-orange-500 dark:text-orange-400" />
        <span>Table of Contents</span>
      </div>
      <nav className="space-y-1.5 text-xs">
        {headings.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) {
                window.scrollTo({
                  top: el.offsetTop - 90,
                  behavior: 'smooth',
                });
              }
            }}
            className={`block py-1 line-clamp-1 transition-colors ${
              item.level === 3 ? 'pl-4' : item.level === 2 ? 'pl-2' : ''
            } ${
              activeId === item.id
                ? 'text-orange-500 dark:text-orange-400 font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
};
