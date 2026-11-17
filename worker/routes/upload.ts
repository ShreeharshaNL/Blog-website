import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  generateFileKey,
  saveMedia,
} from '../mediaStorage';

const uploadApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

function decodeBase64(base64Str: string): Uint8Array {
  const commaIdx = base64Str.indexOf(',');
  const cleanBase64 = commaIdx !== -1 ? base64Str.slice(commaIdx + 1) : base64Str;
  const binary = atob(cleanBase64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=([^;]+)/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function parseMultipartFallback(bodyText: string, boundary: string) {
  const parts = bodyText.split(`--${boundary}`);
  for (const part of parts) {
    if (!part || part.trim() === '--') continue;
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4).replace(/\r\n$/, '');
    const nameMatch = headerText.match(/name="([^"]+)"/);
    if (nameMatch && nameMatch[1] === 'file') {
      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'uploaded.bin';
      const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      const type = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      return {
        name: filename,
        type,
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.buffer,
      };
    }
  }
  return null;
}

uploadApp.post('/', async (c) => {
  requireAuth(c);

  const contentType = c.req.header('content-type') || '';

  // 1. JSON Base64 Upload Support
  if (contentType.includes('application/json')) {
    const jsonBody = await c.req.json().catch(() => ({}));
    const { data, filename, mimeType } = jsonBody as {
      data?: string;
      filename?: string;
      mimeType?: string;
    };

    if (!data || !mimeType) {
      return c.json({ error: 'Missing data or mimeType in payload' }, 400);
    }

    const cleanMimeType = mimeType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(cleanMimeType)) {
      return c.json({
        error: `Invalid file type "${cleanMimeType}". Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, OGG, MOV, MKV`,
      }, 400);
    }

    let buffer: Uint8Array;
    try {
      buffer = decodeBase64(data);
    } catch {
      return c.json({ error: 'Failed to decode base64 data' }, 400);
    }

    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return c.json({ error: 'File size exceeds maximum allowed limit of 100MB' }, 400);
    }

    const fileKey = generateFileKey(cleanMimeType, filename);
    const { publicUrl } = await saveMedia(c.env, fileKey, buffer, cleanMimeType);

    return c.json({
      success: true,
      url: publicUrl,
      fileKey,
      size: buffer.byteLength,
      mimeType: cleanMimeType,
      mediaType: cleanMimeType.startsWith('video/') ? 'video' : 'image',
    });
  }

  // 2. Multipart Form-Data Upload Support
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Content-Type must be multipart/form-data or application/json' }, 400);
  }

  let file: any;
  const reqClone = c.req.raw ? c.req.raw.clone() : null;
  try {
    const formData = await c.req.formData();
    file = formData.get('file');
  } catch (err: any) {
    const boundary = extractBoundary(contentType);
    if (boundary && reqClone) {
      const text = await reqClone.text().catch(() => '');
      file = parseMultipartFallback(text, boundary);
    }
    if (!file) {
      return c.json({ error: 'Failed to parse upload: ' + (err.message || 'invalid form') }, 400);
    }
  }

  if (!file || typeof file !== 'object') {
    return c.json({ error: 'No file uploaded or invalid file format' }, 400);
  }

  const fileType = (file.type || '').toLowerCase().trim();
  const fileSize = file.size || 0;

  // Verify MIME type
  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    return c.json({
      error: `Invalid file type "${fileType}". Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF, MP4, WebM, OGG, MOV, MKV`,
    }, 400);
  }

  // Verify file size
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return c.json({ error: 'File size exceeds maximum allowed limit of 100MB' }, 400);
  }

  if (typeof file.arrayBuffer !== 'function') {
    return c.json({ error: 'Could not read uploaded file buffer' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const fileKey = generateFileKey(fileType, file.name);

  const { publicUrl } = await saveMedia(c.env, fileKey, buffer, fileType);

  return c.json({
    success: true,
    url: publicUrl,
    fileKey,
    size: fileSize || buffer.byteLength,
    mimeType: fileType,
    mediaType: fileType.startsWith('video/') ? 'video' : 'image',
  });
});

export default uploadApp;
