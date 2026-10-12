import type { Page } from '../types/api';
const key = 'pelazzo.session';
let token = sessionStorage.getItem(key);
export function setToken(value: string | null) {
  token = value;
  if (value) sessionStorage.setItem(key, value);
  else sessionStorage.removeItem(key);
}
export function hasSession() {
  return Boolean(token);
}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 30000);
  try {
    response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? '/api'}${path}`,
      {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          ...(options.body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
      },
    );
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      'Não foi possível conectar. Verifique a conexão e tente novamente.',
      0,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('pelazzo:unauthorized'));
    }
    throw new ApiError(
      Array.isArray(payload.message)
        ? payload.message.join(' · ')
        : (payload.message ??
            (response.status === 429
              ? 'Muitas tentativas. Aguarde um minuto.'
              : 'Não foi possível concluir a operação.')),
      response.status,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export async function all<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await api<Page<T>>(
      `${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`,
      { signal },
    );
    items.push(...result.items);
    if (items.length >= result.total || !result.items.length) return items;
  }
  throw new ApiError('Lista muito extensa. Consulte a API com paginação.', 400);
}
export const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocorreu um erro. Tente novamente.';
