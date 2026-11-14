import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-background-surface/50 text-foreground transition-colors mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5">
                <img src="/logo.svg" alt="INKVERSE" className="w-full h-full rounded-[10px]" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                INKVERSE
              </span>
            </Link>
            <p className="text-sm text-foreground-muted max-w-md leading-relaxed">
              A modern, community-driven editorial blogging and gamified creator rewards platform. Write meaningful stories, share unique perspectives, build your audience, and earn reputation.
            </p>
            <div className="flex items-center gap-2 text-xs text-foreground-subtle">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Edge Architecture · Cloudflare Workers &amp; D1</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-foreground-muted">
              <li>
                <Link to="/explore" className="hover:text-purple-400 transition-colors">
                  Featured Stories
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-purple-400 transition-colors">
                  Topics &amp; Categories
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-purple-400 transition-colors">
                  Creator Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/write" className="hover:text-purple-400 transition-colors">
                  Start Writing
                </Link>
              </li>
            </ul>
          </div>

          {/* Gamification & Community */}
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-wider uppercase mb-4">
              Community &amp; Points
            </h4>
            <ul className="space-y-2.5 text-sm text-foreground-muted">
              <li>
                <Link to="/leaderboard" className="hover:text-purple-400 transition-colors flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Rewards Rules</span>
                </Link>
              </li>
              <li>
                <span className="text-xs text-foreground-subtle block">
                  +20 pts per published story
                </span>
                <span className="text-xs text-foreground-subtle block">
                  +5 pts per 100 verified readers
                </span>
                <span className="text-xs text-foreground-subtle block">
                  +5 pts per 10 genuine likes
                </span>
                <span className="text-xs text-foreground-subtle block">
                  +50 pts Editor's Choice
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-foreground-subtle">
          <p>© {new Date().getFullYear()} INKVERSE. All rights reserved. Subdomain: blog.shreeharsha.online</p>
          <p className="flex items-center gap-1">
            <span>Crafted for creators with</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>by Shree Harsha</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
