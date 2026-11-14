import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  PenTool,
  Compass,
  Trophy,
  Grid,
  Bookmark,
  LayoutDashboard,
  Shield,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';
import { LevelBadge } from './LevelBadge';
import { LoginModal } from './LoginModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/85 border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-stone-900 flex items-center justify-center">
              <img src="/logo.svg" alt="INKVERSE" className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-lg tracking-tight text-foreground">
                INKVERSE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/explore"
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/explore')
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </Link>
            <Link
              to="/categories"
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/categories')
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Categories</span>
            </Link>
            <Link
              to="/leaderboard"
              className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                isActive('/leaderboard')
                  ? 'text-primary bg-primary/10'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {user ? (
              <>
                {/* Write Button */}
                <Link
                  to="/write"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-primary hover:bg-orange-600 text-white shadow-sm shadow-orange-950/30 transition-all hover:shadow-orange-600/30"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Write</span>
                </Link>

                {/* Notifications */}
                <NotificationDropdown />

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1 rounded-full border border-border hover:border-orange-500/40 transition-colors focus:outline-none"
                    aria-label="User menu"
                  >
                    <img
                      src={user.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                      alt={user.display_name}
                      className="w-8 h-8 rounded-full object-cover bg-background-elevated"
                    />
                  </button>

                  {isProfileOpen && (
                    <div
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-background-surface border border-border shadow-2xl p-2 z-50 animate-slide-up"
                      onMouseLeave={() => setIsProfileOpen(false)}
                    >
                      {/* User Header */}
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="font-semibold text-sm truncate">{user.display_name}</p>
                        <p className="text-xs text-foreground-muted truncate">@{user.username}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <LevelBadge points={user.points} level={user.level} />
                          <span className="text-xs font-mono font-semibold text-amber-500 dark:text-amber-400">
                            {user.points} pts
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        <span>Author Dashboard</span>
                      </Link>

                      <Link
                        to={`/@${user.username}`}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>My Public Profile</span>
                      </Link>

                      <Link
                        to="/bookmarks"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        <span>Saved Bookmarks</span>
                      </Link>

                      <Link
                        to="/dashboard/points"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        <span>Points &amp; Rewards Ledger</span>
                      </Link>

                      {(user.role === 'admin' || user.role === 'moderator') && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-orange-500 dark:text-orange-400 hover:text-orange-300 hover:bg-orange-950/20 transition-colors font-medium"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}

                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-400 hover:bg-rose-950/20 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-primary hover:bg-orange-600 text-white transition-all shadow-sm shadow-orange-900/30"
                >
                  <span>Start Writing</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Sheet */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background-surface px-4 py-4 space-y-2 animate-fade-in">
            <Link
              to="/explore"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-background-elevated"
            >
              <Compass className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              <span>Explore Stories</span>
            </Link>
            <Link
              to="/categories"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-background-elevated"
            >
              <Grid className="w-4 h-4 text-amber-500" />
              <span>Categories</span>
            </Link>
            <Link
              to="/leaderboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-background-elevated"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </Link>
            {user && (
              <>
                <Link
                  to="/write"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-600/10 text-orange-500 dark:text-orange-400"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Write a Story</span>
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-background-elevated"
                >
                  <LayoutDashboard className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span>Author Dashboard</span>
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};
