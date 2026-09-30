// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchMyData, deleteAccount, downloadMyData } from './account';
import { ApiError } from '../client';

describe('account endpoints (GDPR export / erasure)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetchMyData GETs the export with the bearer token and returns the raw JSON text', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{"user":{"id":"u1"}}') });
    const text = await fetchMyData('tok');
    expect(text).toBe('{"user":{"id":"u1"}}');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/account/export', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }));
  });

  it('fetchMyData throws ApiError on failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized', text: () => Promise.resolve('nope') });
    await expect(fetchMyData('tok')).rejects.toBeInstanceOf(ApiError);
  });

  it('deleteAccount sends DELETE with the token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') });
    await deleteAccount('tok');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/account', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
    }));
  });

  it('downloadMyData saves the export as a .json file via a temporary link', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{"a":1}') });
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clicks: HTMLAnchorElement[] = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicks.push(this); };
    try {
      await downloadMyData('tok');
    } finally {
      HTMLAnchorElement.prototype.click = orig;
    }
    expect(clicks).toHaveLength(1);
    expect(clicks[0]!.download).toBe('district-common-ground-my-data.json');
    expect(clicks[0]!.href).toBe('blob:x');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});
