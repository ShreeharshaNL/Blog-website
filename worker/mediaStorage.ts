import { Env } from './types';

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
]);

export const ALLOWED_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
]);

export const MIME_TO_EXTENSION: Record<string, string> = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  // Videos
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
};

export const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
};

// Maximum file size: 100 MB (fits within Cloudflare Workers standard request limits)
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export interface FallbackMediaItem {
  buffer: Uint8Array;
  contentType: string;
  size: number;
  etag: string;
  uploadedAt: number;
}

// In-memory media store used when MEDIA_BUCKET is not configured (e.g. testing or local fallback)
export const fallbackMediaStore = new Map<string, FallbackMediaItem>();

export function getMimeExtension(mimeType: string, filename?: string): string {
  if (MIME_TO_EXTENSION[mimeType]) {
    return MIME_TO_EXTENSION[mimeType];
  }
  if (filename && filename.includes('.')) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }
  const sub = mimeType.split('/')[1];
  return sub ? sub.replace('+xml', '') : 'bin';
}

export function generateFileKey(mimeType: string, filename?: string): string {
  const extension = getMimeExtension(mimeType, filename);
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  return `uploads/${Date.now()}-${randomSuffix}.${extension}`;
}

export async function saveMedia(
  env: Env,
  fileKey: string,
  buffer: Uint8Array,
  contentType: string
): Promise<{ fileKey: string; publicUrl: string }> {
  // 1. If Cloudflare R2 bucket is available, store in R2
  if (env.MEDIA_BUCKET) {
    await env.MEDIA_BUCKET.put(fileKey, buffer, {
      httpMetadata: { contentType },
    });
  } else if (env.KV) {
    // 2. If Cloudflare KV is available as secondary storage
    // Store metadata & base64 content
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);
    await env.KV.put(`media:${fileKey}`, base64, {
      metadata: { contentType, size: len },
    });
  } else {
    // 3. Fallback in-memory map for unit tests / minimal environments
    const etag = `"${crypto.randomUUID().slice(0, 16)}"`;
    fallbackMediaStore.set(fileKey, {
      buffer,
      contentType,
      size: buffer.byteLength,
      etag,
      uploadedAt: Date.now(),
    });
  }

  const publicUrl = `/api/media/${fileKey}`;
  return { fileKey, publicUrl };
}

export async function getMedia(
  env: Env,
  fileKey: string,
  rangeHeader?: string | null
): Promise<Response | null> {
  // 1. Try Cloudflare R2 Bucket
  if (env.MEDIA_BUCKET) {
    let object: R2ObjectBody | R2Object | null = null;
    if (rangeHeader) {
      try {
        const parsed = parseRangeHeader(rangeHeader);
        if (parsed) {
          object = await env.MEDIA_BUCKET.get(fileKey, {
            range: { offset: parsed.offset, length: parsed.length },
          });
        } else {
          object = await env.MEDIA_BUCKET.get(fileKey);
        }
      } catch {
        object = await env.MEDIA_BUCKET.get(fileKey);
      }
    } else {
      object = await env.MEDIA_BUCKET.get(fileKey);
    }

    if (!object) {
      return null;
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Accept-Ranges', 'bytes');

    const ext = fileKey.split('.').pop()?.toLowerCase() || '';
    if (!headers.get('content-type') && EXTENSION_TO_MIME[ext]) {
      headers.set('content-type', EXTENSION_TO_MIME[ext]);
    }

    if ('range' in object && object.range) {
      const range = (object as any).range;
      const start = range.offset;
      const end = range.offset + range.length - 1;
      headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
      headers.set('Content-Length', String(range.length));
      return new Response((object as any).body, {
        status: 206,
        statusText: 'Partial Content',
        headers,
      });
    }

    headers.set('Content-Length', String(object.size));
    return new Response((object as any).body, {
      status: 200,
      headers,
    });
  }

  // 2. Try Cloudflare KV
  if (env.KV) {
    const { value, metadata } = await env.KV.getWithMetadata<{ contentType?: string; size?: number }>(`media:${fileKey}`);
    if (value) {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const cType = metadata?.contentType || EXTENSION_TO_MIME[fileKey.split('.').pop() || ''] || 'application/octet-stream';
      return handleBufferResponse(bytes, cType, rangeHeader);
    }
  }

  // 3. Try In-memory fallback
  const item = fallbackMediaStore.get(fileKey);
  if (item) {
    return handleBufferResponse(item.buffer, item.contentType, rangeHeader, item.etag);
  }

  return null;
}

function parseRangeHeader(rangeHeader: string): { offset: number; length?: number } | null {
  const match = rangeHeader.trim().match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;
  const start = parseInt(match[1], 10);
  if (match[2]) {
    const end = parseInt(match[2], 10);
    return { offset: start, length: end - start + 1 };
  }
  return { offset: start };
}

function handleBufferResponse(
  buffer: Uint8Array,
  contentType: string,
  rangeHeader?: string | null,
  etag?: string
): Response {
  const totalSize = buffer.byteLength;
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (etag) headers.set('ETag', etag);

  if (rangeHeader) {
    const parsed = parseRangeHeader(rangeHeader);
    if (parsed) {
      const start = Math.min(parsed.offset, totalSize - 1);
      const end = parsed.length ? Math.min(start + parsed.length - 1, totalSize - 1) : totalSize - 1;
      const chunk = buffer.subarray(start, end + 1);

      headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      headers.set('Content-Length', String(chunk.byteLength));

      return new Response(chunk as any, {
        status: 206,
        statusText: 'Partial Content',
        headers,
      });
    }
  }

  headers.set('Content-Length', String(totalSize));
  return new Response(buffer as any, {
    status: 200,
    headers,
  });
}
