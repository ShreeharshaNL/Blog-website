import React from 'react';
import { calculateLevel, LEVEL_COLORS } from '../utils/gamification';

interface LevelBadgeProps {
  points?: number;
  level?: number;
  showPoints?: boolean;
  className?: string;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  points,
  level,
  showPoints = false,
  className = '',
}) => {
  const levelInfo = points !== undefined ? calculateLevel(points) : null;
  const currentLevel = levelInfo ? levelInfo.level : (level || 1);
  const levelName = levelInfo ? levelInfo.name : `Level ${currentLevel}`;
  const colors = LEVEL_COLORS[currentLevel] || LEVEL_COLORS[1];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
      title={`${levelName} (${points ?? 0} reputation points)`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{levelName}</span>
      {showPoints && points !== undefined && (
        <span className="opacity-75 font-mono ml-0.5">· {points} pts</span>
      )}
    </span>
  );
};
