import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Award, Flame, Sparkles, Star, CalendarCheck, Eye, Heart } from 'lucide-react';
import { LeaderboardItem, Achievement } from '../types';
import { apiRequest } from '../utils/api';
import { LevelBadge } from '../components/LevelBadge';
import { BadgeIcon } from '../components/BadgeIcon';
import { LEVEL_THRESHOLDS } from '../utils/gamification';

export const LeaderboardPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [writers, setWriters] = useState<LeaderboardItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setIsLoading(true);
      try {
        const [boardData, achData] = await Promise.all([
          apiRequest<{ writers: LeaderboardItem[] }>(`/api/leaderboard?timeframe=${timeframe}`),
          apiRequest<{ achievements: Achievement[] }>('/api/achievements'),
        ]);
        setWriters(boardData.writers || []);
        setAchievements(achData.achievements || []);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadLeaderboard();
  }, [timeframe]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 mb-3">
          <Trophy className="w-3.5 h-3.5" />
          <span>Creator Reputation &amp; Rankings</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-3">
          Creator Leaderboard
        </h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          Celebrate our most engaging voices. Authors earn verified reputation points for publishing high-impact stories, drawing genuine readers, and maintaining consistent quality.
        </p>
      </div>

      {/* Timeframe Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-background-surface border border-border">
          {[
            { id: 'weekly', label: 'Weekly Top Writers' },
            { id: 'monthly', label: 'Monthly Top Writers' },
            { id: 'all', label: 'All-Time Legends' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                timeframe === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-foreground-subtle hidden sm:inline font-mono">
          Updated continuously
        </span>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-border bg-background-surface overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background-elevated/70 border-b border-border text-foreground-subtle uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 sm:px-6 w-16">Rank</th>
                <th className="py-3.5 px-4 sm:px-6">Writer</th>
                <th className="py-3.5 px-4 sm:px-6">Level &amp; Tier</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Stories</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Verified Readers</th>
                <th className="py-3.5 px-4 sm:px-6 text-right font-mono">Points Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-foreground-muted">
                    Loading leaderboard rankings...
                  </td>
                </tr>
              ) : writers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-foreground-muted">
                    No ranked authors yet. Publish a story to claim Rank #1!
                  </td>
                </tr>
              ) : (
                writers.map((writer) => (
                  <tr
                    key={writer.id}
                    className="hover:bg-background-elevated/50 transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-4 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-mono ${
                          writer.rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20'
                            : writer.rank === 2
                            ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-400/40'
                            : writer.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 border border-amber-700/40'
                            : 'text-foreground-subtle'
                        }`}
                      >
                        {writer.rank}
                      </span>
                    </td>

                    {/* Author Profile */}
                    <td className="py-4 px-4 sm:px-6">
                      <Link
                        to={`/@${writer.username}`}
                        className="flex items-center gap-3 group-hover:text-purple-400 transition-colors"
                      >
                        <img
                          src={
                            writer.avatar_url ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${writer.username}`
                          }
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground group-hover:text-purple-300">
                            {writer.display_name}
                          </p>
                          <p className="text-xs text-foreground-subtle font-mono">@{writer.username}</p>
                          {/* Badges preview */}
                          {writer.badges && writer.badges.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {writer.badges.map((b) => (
                                <span
                                  key={b.id}
                                  title={`${b.name}: ${b.description}`}
                                  className="p-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                >
                                  <BadgeIcon icon={b.icon} className="w-3 h-3" />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Level */}
                    <td className="py-4 px-4 sm:px-6">
                      <LevelBadge level={writer.level} showPoints={false} />
                    </td>

                    {/* Stories */}
                    <td className="py-4 px-4 sm:px-6 text-center font-mono font-medium">
                      {writer.total_blogs}
                    </td>

                    {/* Views */}
                    <td className="py-4 px-4 sm:px-6 text-center font-mono text-foreground-muted">
                      {writer.total_views.toLocaleString()}
                    </td>

                    {/* Points */}
                    <td className="py-4 px-4 sm:px-6 text-right font-mono font-bold text-sm text-purple-400">
                      +{writer.points.toLocaleString()} pts
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gamification Rules & Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* Creator Tiers */}
        <div className="p-6 rounded-2xl border border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="font-serif text-xl font-bold">Creator Level Progression</h3>
          </div>
          <p className="text-xs text-foreground-muted mb-4">
            Your level increases automatically as you earn lifetime reputation points.
          </p>
          <div className="space-y-2.5">
            {LEVEL_THRESHOLDS.map((tier) => (
              <div
                key={tier.level}
                className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 text-xs border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <LevelBadge level={tier.level} />
                </div>
                <span className="font-mono text-foreground-subtle">
                  {tier.min} {tier.next ? `- ${tier.next - 1} pts` : '+ pts'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reward Rules */}
        <div className="p-6 rounded-2xl border border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-xl font-bold">How Points Are Earned</h3>
          </div>
          <p className="text-xs text-foreground-muted mb-4">
            All points are calculated server-side and recorded in an immutable audit ledger.
          </p>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Publish an approved story</span>
              <span className="font-mono font-bold text-purple-400">+20 points</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Every 100 verified unique readers</span>
              <span className="font-mono font-bold text-purple-400">+5 points</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Every 10 genuine likes received</span>
              <span className="font-mono font-bold text-purple-400">+5 points</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Story selected as Editor's Choice</span>
              <span className="font-mono font-bold text-purple-400">+50 points</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Unlock an achievement badge</span>
              <span className="font-mono font-bold text-purple-400">+20 to +50 points</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-elevated/50 border border-border/50">
              <span className="text-foreground">Complete a 7-day writing streak</span>
              <span className="font-mono font-bold text-purple-400">+25 points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Badges Showcase */}
      {achievements.length > 0 && (
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-background-surface">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-2xl font-bold">Achievement Badges</h3>
          </div>
          <p className="text-xs text-foreground-muted mb-6">
            Special accolades awarded automatically when creators reach notable milestones.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="p-4 rounded-xl border border-border bg-background-elevated/40 flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 border border-purple-500/20">
                    <BadgeIcon icon={ach.icon} className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{ach.name}</h4>
                  <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2">
                    {ach.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-border/50 text-[11px] font-mono font-bold text-purple-400">
                  +{ach.badge_points} bonus points
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
