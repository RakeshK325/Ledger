import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'miniledger_jwt_token';

// Custom API error carrying backend error code and status
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Token storage helpers using expo-secure-store
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Global 401 listener so AuthContext can reactively clear state
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// Base API URL with fallback
export function getApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
}

/**
 * Universal fetch wrapper that automatically:
 * 1. Attaches the stored JWT bearer token.
 * 2. Normalizes backend `{ error: { code, message } }` into thrown ApiError instances.
 * 3. Handles 401 Unauthorized by clearing stored credentials.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const token = await getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set application/json if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(
      'Unable to connect to the ledger server. Please check your network connection.',
      'NETWORK_ERROR',
      0
    );
  }

  // Handle 401 Unauthorized: clear token and notify listener
  if (response.status === 401) {
    await removeStoredToken();
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorPayload = data && typeof data === 'object' && data.error ? data.error : null;
    const errorMessage = errorPayload?.message || (typeof data === 'string' ? data : 'Request failed');
    const errorCode = errorPayload?.code || (response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR');

    throw new ApiError(errorMessage, errorCode, response.status);
  }

  return data as T;
}
