import { request, ApiError } from '../client';

const BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '';
export const EXPORT_FILENAME = 'district-common-ground-my-data.json';

/** GET /api/v1/account/export — everything the server stores about the
 *  signed-in player, as the raw JSON document (GDPR Art. 15/20). */
export async function fetchMyData(token: string): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/account/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, msg);
  }
  return res.text();
}

/** Fetches the export and saves it as a .json file. */
export async function downloadMyData(token: string): Promise<void> {
  const text = await fetchMyData(token);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = EXPORT_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** DELETE /api/v1/account — permanently erases the account and all of its
 *  server-side data (GDPR Art. 17). The local save on this device is kept. */
export function deleteAccount(token: string): Promise<void> {
  return request<void>('DELETE', '/api/v1/account', undefined, token);
}
