import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'blog' | 'comment' | 'user';
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  'Spam or misleading links',
  'Plagiarism or copyright violation',
  'Harassment or hate speech',
  'Malicious or deceptive content',
  'Inappropriate or sexually explicit material',
  'Other violation of Community Guidelines',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to submit a report.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      alert('Report failed: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-background-surface border border-border rounded-2xl p-6 shadow-2xl text-foreground animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-background-elevated"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Report Content</h3>
            <p className="text-xs text-foreground-muted">
              Help keep the INKVERSE community safe and constructive.
            </p>
          </div>
        </div>

        {targetTitle && (
          <div className="p-2.5 rounded-lg bg-background-elevated text-xs text-foreground-muted mb-4 truncate font-mono">
            Target: {targetTitle}
          </div>
        )}

        {submitted ? (
          <div className="p-6 text-center text-emerald-400 font-semibold text-sm">
            Thank you. Your report has been submitted for moderation review.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                Reason for report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs py-2.5 px-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide context or specific timestamps/quotes..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-background-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
