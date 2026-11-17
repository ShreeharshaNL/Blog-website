/**
 * INKVERSE API Client
 */

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'inkverse_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    let errorMsg = data?.error;
    if (data?.details && Array.isArray(data.details)) {
      const fieldErrors = data.details.map((d: any) => `${d.path?.join('.') || 'field'}: ${d.message}`).join(', ');
      if (fieldErrors && (!errorMsg || errorMsg === 'Validation failed')) {
        errorMsg = `Validation failed: ${fieldErrors}`;
      }
    }
    if (!errorMsg) {
      errorMsg = typeof data === 'string' ? data : `Request failed with status ${res.status}`;
    }
    throw new ApiError(res.status, errorMsg, data);
  }

  return data as T;
}

export interface UploadMediaResult {
  success: boolean;
  url: string;
  fileKey: string;
  size: number;
  mimeType: string;
  mediaType: 'image' | 'video';
}

/**
 * Upload an image or video file directly to website storage.
 * Automatically handles multipart/form-data upload and credentials.
 */
export async function uploadMedia(file: File): Promise<UploadMediaResult> {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<UploadMediaResult>('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

