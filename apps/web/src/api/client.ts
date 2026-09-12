const BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
