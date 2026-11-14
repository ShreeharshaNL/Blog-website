import { Hono } from 'hono';
import { Env, HonoVariables } from '../types';
import { requireAuth } from '../auth';

const uploadApp = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

uploadApp.post('/', async (c) => {
  requireAuth(c);

  const contentType = c.req.header('content-type') || '';

  // 1. JSON Base64 Upload Support
  if (contentType.includes('application/json')) {
    const jsonBody = await c.req.json().catch(() => ({}));
    const { data, filename, mimeType } = jsonBody as { data?: string; filename?: string; mimeType?: string };

    if (!data || !mimeType) {
      return c.json({ error: 'Missing data or mimeType in payload' }, 400);
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return c.json({
        error: `Invalid file type "${mimeType}". Allowed formats: JPEG, PNG, WebP, GIF, SVG`,
      }, 400);
    }

    // Estimate base64 size: len * 0.75
    const estimatedSize = Math.round(data.length * 0.75);
    if (estimatedSize > MAX_FILE_SIZE_BYTES) {
      return c.json({ error: 'File size exceeds maximum allowed limit of 5MB' }, 400);
    }

    const extension = filename ? filename.split('.').pop() : (mimeType.split('/')[1] || 'png');
    const fileKey = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const url = data.startsWith('data:') ? data : `data:${mimeType};base64,${data}`;

    return c.json({
      success: true,
      url,
      fileKey,
      size: estimatedSize,
      mimeType,
    });
  }

  // 2. Multipart Form-Data Upload Support
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Content-Type must be multipart/form-data or application/json' }, 400);
  }

  let body: any;
  try {
    body = await c.req.parseBody();
  } catch (err: any) {
    return c.json({ error: 'Failed to parse upload: ' + (err.message || 'invalid form') }, 400);
  }

  const file = body['file'];

  if (!file || typeof file !== 'object') {
    return c.json({ error: 'No file uploaded or invalid file format' }, 400);
  }

  const fileType = file.type || '';
  const fileSize = file.size || 0;

  // Verify MIME type
  if (!ALLOWED_MIME_TYPES.has(fileType)) {
    return c.json({
      error: `Invalid file type "${fileType}". Allowed formats: JPEG, PNG, WebP, GIF, SVG`,
    }, 400);
  }

  // Verify file size
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return c.json({ error: 'File size exceeds maximum allowed limit of 5MB' }, 400);
  }

  const extension = (file.name ? file.name.split('.').pop() : 'png') || 'png';
  const fileKey = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

  // If R2 Bucket is available
  if (c.env.MEDIA_BUCKET && typeof file.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(fileKey, arrayBuffer, {
      httpMetadata: { contentType: fileType },
    });
    const publicUrl = `/api/media/${fileKey}`;
    return c.json({
      success: true,
      url: publicUrl,
      fileKey,
      size: fileSize,
      mimeType: fileType,
    });
  }

  // Fallback for local development if R2 bucket is not configured
  if (typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${fileType};base64,${base64}`;

    return c.json({
      success: true,
      url: dataUrl,
      fileKey,
      size: fileSize,
      mimeType: fileType,
    });
  }

  return c.json({ error: 'Could not read uploaded file buffer' }, 400);
});

export default uploadApp;
