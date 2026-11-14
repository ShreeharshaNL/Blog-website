import React from 'react';
import {
  Feather,
  Eye,
  Flame,
  Heart,
  CalendarCheck,
  Star,
  Award,
  Zap,
  Sparkles,
  Trophy,
  ShieldCheck,
  Bookmark,
} from 'lucide-react';

interface BadgeIconProps {
  icon: string;
  className?: string;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({ icon, className = 'w-4 h-4' }) => {
  switch (icon.toLowerCase()) {
    case 'feather':
      return <Feather className={className} />;
    case 'eye':
      return <Eye className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'calendarcheck':
    case 'calendar':
      return <CalendarCheck className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'shieldcheck':
      return <ShieldCheck className={className} />;
    case 'bookmark':
      return <Bookmark className={className} />;
    default:
      return <Trophy className={className} />;
  }
};
