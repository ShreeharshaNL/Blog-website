/**
 * Anti-Abuse and Fraud Prevention Utilities for INKVERSE
 */

const KNOWN_BOT_PATTERNS = [
  'bot', 'spider', 'crawler', 'scraper', 'facebookexternalhit',
  'whatsapp', 'slackbot', 'twitterbot', 'telegrambot', 'discordbot',
  'petalbot', 'yandex', 'baiduspider', 'ahrefs', 'semrush', 'mj12bot',
  'headlesschrome', 'phantomjs', 'selenium', 'puppeteer', 'python-requests',
  'curl', 'wget', 'httpx', 'go-http-client'
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const ua = userAgent.toLowerCase();
  return KNOWN_BOT_PATTERNS.some(bot => ua.includes(bot));
}

/**
 * Computes a privacy-preserving SHA-256 fingerprint for visitor deduplication.
 * We include the date string (YYYY-MM-DD) so hashes cycle daily for 24h deduplication.
 */
export async function generateViewerHash(
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  blogId: string
): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rawData = userId 
    ? `user:${userId}:${blogId}:${dateStr}`
    : `anon:${ipAddress || 'unknown'}:${userAgent || 'none'}:${blogId}:${dateStr}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(rawData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * Validates Cloudflare Turnstile token if configured
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  secretKey: string | undefined,
  remoteIp?: string
): Promise<boolean> {
  if (!secretKey || !token) {
    // If turnstile secret is not configured in env, allow for development/self-hosted
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const result = await res.json() as { success: boolean };
    return result.success;
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return false;
  }
}
