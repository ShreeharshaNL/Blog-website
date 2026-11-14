import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto px-4 py-32 text-center space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-2">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="font-serif text-6xl font-extrabold text-foreground tracking-tight">404</h1>
      <h2 className="font-serif text-2xl font-bold">Page Not Found</h2>
      <p className="text-sm text-foreground-muted leading-relaxed">
        The destination you navigated to does not exist or has wandered into another realm of the INKVERSE.
      </p>
      <div className="pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-md shadow-primary/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
};
