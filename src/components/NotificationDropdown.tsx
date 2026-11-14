import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Heart, MessageSquare, UserPlus, Sparkles, Award } from 'lucide-react';
import { NotificationItem } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const NotificationDropdown: React.FC = () => {
  const { unreadNotifications, setUnreadNotifications } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<{ notifications: NotificationItem[]; unread_count: number }>(
        '/api/notifications'
      );
      setNotifications(data.notifications);
      setUnreadNotifications(data.unread_count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/notifications/mark-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />;
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'badge':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'points':
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full border border-border bg-background-surface hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotifications > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-purple-600 rounded-full border-2 border-background animate-pulse-subtle">
            {unreadNotifications > 99 ? '99+' : unreadNotifications}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-background-surface border border-border shadow-2xl z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-elevated/50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadNotifications > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-foreground-muted">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-foreground-subtle mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-foreground-muted mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  to={notif.link || '#'}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-background-elevated transition-colors ${
                    !notif.is_read ? 'bg-purple-950/10' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-2 rounded-lg bg-background-subtle">
                    {renderIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">{notif.message}</p>
                    <span className="text-[10px] text-foreground-subtle mt-1 block">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
