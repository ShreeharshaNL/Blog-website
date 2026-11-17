import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PointsTransaction } from '../types';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LevelBadge } from '../components/LevelBadge';

export const PointsHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ transactions: PointsTransaction[]; pagination: { total: number } }>(
          '/api/points/history'
        );
        setTransactions(res.transactions || []);
        setTotalCount(res.pagination?.total || 0);
      } catch (err) {
        console.error('Failed to load points history:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) loadHistory();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-3xl font-bold mb-3">Sign In Required</h2>
        <Link to="/" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-orange-600 text-white">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button & Title */}
      <div className="space-y-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-foreground-muted hover:text-primary font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Author Dashboard</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              <span>Points &amp; Rewards Ledger</span>
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Immutable cryptographic ledger recording all reputation grants, milestones, and achievements.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-300 font-semibold font-mono">
                Current Balance
              </p>
              <p className="font-mono text-2xl font-bold text-amber-500 dark:text-amber-400">{user.points} pts</p>
            </div>
            <LevelBadge level={user.level} />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-border bg-background-surface overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background-elevated/70 border-b border-border text-foreground-subtle uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 sm:px-6">Activity &amp; Description</th>
                <th className="py-3 px-4 sm:px-6">Type</th>
                <th className="py-3 px-4 sm:px-6">Date</th>
                <th className="py-3 px-4 sm:px-6 text-right font-mono">Reward Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-foreground-muted">
                    Loading points transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-foreground-muted">
                    No transactions yet. Publish a story to earn your first +20 points!
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-background-elevated/40 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <p className="font-semibold text-foreground">{tx.description}</p>
                      {tx.reference_id && (
                        <p className="text-[10px] font-mono text-foreground-subtle mt-0.5">
                          Ref: {tx.reference_id}
                        </p>
                      )}
                      {tx.is_reversed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Reversed by Administrator</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-background-elevated border border-border text-foreground-muted">
                        {tx.transaction_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-foreground-subtle font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          tx.is_reversed
                            ? 'line-through text-foreground-subtle'
                            : tx.amount > 0
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} pts
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
