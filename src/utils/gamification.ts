export interface LevelInfo {
  level: number;
  name: string;
  minPoints: number;
  nextPoints: number | null;
  progressPercent: number;
}

export const LEVEL_THRESHOLDS = [
  { level: 1, name: 'Beginner', min: 0, next: 50 },
  { level: 2, name: 'Contributor', min: 50, next: 150 },
  { level: 3, name: 'Writer', min: 150, next: 350 },
  { level: 4, name: 'Skilled Writer', min: 350, next: 700 },
  { level: 5, name: 'Expert', min: 700, next: 1300 },
  { level: 6, name: 'Master', min: 1300, next: 2500 },
  { level: 7, name: 'Legend', min: 2500, next: null },
] as const;

export function calculateLevel(points: number): LevelInfo {
  const pts = Math.max(0, points);
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const tier = LEVEL_THRESHOLDS[i];
    if (pts >= tier.min) {
      if (tier.next === null) {
        return {
          level: tier.level,
          name: tier.name,
          minPoints: tier.min,
          nextPoints: null,
          progressPercent: 100,
        };
      }
      const range = tier.next - tier.min;
      const progress = Math.min(100, Math.max(0, Math.round(((pts - tier.min) / range) * 100)));
      return {
        level: tier.level,
        name: tier.name,
        minPoints: tier.min,
        nextPoints: tier.next,
        progressPercent: progress,
      };
    }
  }

  return {
    level: 1,
    name: 'Beginner',
    minPoints: 0,
    nextPoints: 50,
    progressPercent: 0,
  };
}

export const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  2: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  3: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  4: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  5: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  6: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  7: { bg: 'bg-gradient-to-r from-amber-500/20 to-purple-500/20', text: 'text-amber-300 font-bold', border: 'border-amber-400/50' },
};
