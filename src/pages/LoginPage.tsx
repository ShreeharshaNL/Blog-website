import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const error = searchParams.get('error');
  const details = searchParams.get('details');

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  const getErrorMessage = () => {
    if (!error) return null;
    switch (error) {
      case 'oauth_failed':
        return {
          title: 'Sign In Failed',
          desc: details
            ? `OAuth failed: ${details}. Please try signing in again.`
            : 'Authentication could not be completed with the provider. Please try signing in again.',
        };
      case 'oauth_denied':
        return {
          title: 'Access Denied',
          desc: details || 'Authorization was cancelled or denied by the provider.',
        };
      case 'oauth_code_missing':
        return {
          title: 'Authorization Code Missing',
          desc: 'No authorization code was returned by the OAuth provider. Please try again.',
        };
      case 'oauth_token_exchange_failed':
        return {
          title: 'Token Exchange Failed',
          desc: details || 'Could not exchange the authorization code with the OAuth provider. Please verify provider credentials.',
        };
      case 'email_not_provided':
        return {
          title: 'Email Address Missing',
          desc: 'No email address was provided by your OAuth profile. Please verify your account settings.',
        };
      case 'github_token_failed':
        return {
          title: 'GitHub Token Exchange Failed',
          desc: details || 'GitHub refused the authentication token exchange. Please check your GitHub App configuration.',
        };
      case 'github_email_not_found':
        return {
          title: 'GitHub Email Not Found',
          desc: 'We could not find a verified email address on your GitHub account.',
        };
      default:
        return {
          title: 'Authentication Error',
          desc: details || `Error code: ${error}`,
        };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-background-surface border border-border rounded-2xl p-6 sm:p-8 shadow-2xl shadow-orange-950/20 text-foreground animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 mb-3 text-orange-500 dark:text-orange-400">
            <Sparkles className="w-6 h-6 text-orange-500 dark:text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to INKVERSE</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Publish your stories, earn reputation points, and connect with creative minds.
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorInfo && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="text-xs">
              <p className="font-semibold">{errorInfo.title}</p>
              <p className="mt-0.5 text-red-600/90 dark:text-red-300/80 leading-relaxed">{errorInfo.desc}</p>
            </div>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3.5">
          {/* Google OAuth */}
          <button
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle font-medium transition-all duration-150 hover:border-orange-500/40"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* GitHub OAuth */}
          <button
            onClick={() => handleOAuth('github')}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle font-medium transition-all duration-150 hover:border-orange-500/40"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Back Link */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-xs text-foreground-subtle">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
          <span className="flex items-center gap-1 text-[11px] text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cloudflare Edge Secured</span>
          </span>
        </div>
      </div>
    </div>
  );
};
