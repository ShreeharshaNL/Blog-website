import React, { useState } from 'react';
import { X, Check, Copy, Share2 } from 'lucide-react';
import { Blog } from '../types';

interface ShareModalProps {
  blog: Blog;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ blog, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const url = `https://blog.shreeharsha.online/blog/${blog.slug}`;
  const title = blog.title;
  const text = `${blog.title} — ${blog.description}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: blog.description,
          url,
        });
        onClose();
      } catch (e) {
        // User cancelled or not supported
      }
    }
  };

  const shareUrls = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title}\n${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=shreeharsha`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-background-surface border border-border rounded-2xl p-6 shadow-2xl text-foreground animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-5">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base">Share this Story</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-background-elevated"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Snippet */}
        <div className="p-3 rounded-xl bg-background-elevated/50 border border-border mb-5 flex items-center gap-3">
          {blog.cover_image && (
            <img
              src={blog.cover_image}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold truncate">{blog.title}</h4>
            <p className="text-[11px] text-foreground-muted truncate">by @{blog.author?.username}</p>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {/* WhatsApp */}
          <a
            href={shareUrls.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle hover:border-emerald-500/40 transition-colors text-center group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.585 1.761.889 2.796.889h.001c3.182 0 5.768-2.587 5.769-5.767 0-3.182-2.587-5.768-5.77-5.772zm3.374 8.204c-.145.411-.849.771-1.189.821-.34.05-.783.078-2.277-.542-1.782-.74-2.923-2.551-3.011-2.671-.088-.12-.727-.967-.727-1.844s.46-1.309.624-1.489c.164-.18.358-.225.477-.225.119 0 .238.001.343.007.11.006.257-.042.402.308.148.358.508 1.237.552 1.328.044.09.073.196.015.313-.058.118-.088.192-.175.295-.088.103-.186.23-.265.309-.09.088-.184.184-.079.364.106.18.47 1.776 1.009 2.256.696.62 1.282.813 1.462.902.18.09.286.075.392-.045.106-.12.455-.53.576-.711.12-.18.241-.15.402-.09.162.06 1.025.483 1.202.571.176.089.294.134.338.209.044.075.044.436-.101.847z" />
              </svg>
            </div>
            <span className="text-xs font-medium">WhatsApp</span>
          </a>

          {/* X / Twitter */}
          <a
            href={shareUrls.x}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle hover:border-purple-500/40 transition-colors text-center group"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="font-bold text-sm">𝕏</span>
            </div>
            <span className="text-xs font-medium">X / Twitter</span>
          </a>

          {/* LinkedIn */}
          <a
            href={shareUrls.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle hover:border-blue-500/40 transition-colors text-center group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </div>
            <span className="text-xs font-medium">LinkedIn</span>
          </a>

          {/* Facebook */}
          <a
            href={shareUrls.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border bg-background-elevated hover:bg-background-subtle hover:border-indigo-500/40 transition-colors text-center group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.592 9 4.615V8z" />
              </svg>
            </div>
            <span className="text-xs font-medium">Facebook</span>
          </a>
        </div>

        {/* Copy Link Input */}
        <div className="relative flex items-center">
          <input
            type="text"
            readOnly
            value={url}
            className="w-full text-xs font-mono py-2.5 pl-3 pr-24 rounded-xl border border-border bg-background-elevated text-foreground focus:outline-none"
          />
          <button
            onClick={copyToClipboard}
            className="absolute right-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Instagram info workflow */}
        <p className="mt-3 text-[11px] text-foreground-subtle text-center">
          For Instagram: Click <strong>Copy</strong> above, then paste into your bio link or story sticker!
        </p>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <div className="mt-3 pt-3 border-t border-border text-center">
            <button
              onClick={shareNative}
              className="text-xs text-purple-400 hover:underline font-medium"
            >
              Use device system share sheet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
