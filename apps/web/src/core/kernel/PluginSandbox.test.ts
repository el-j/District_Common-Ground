import { describe, it, expect, vi, afterEach } from 'vitest';
import { inspectBundleManifest } from './PluginSandbox';

describe('PluginSandbox (inspectBundleManifest)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('throws when window or document is undefined', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);

    await expect(inspectBundleManifest('const x = 1;', 'test-label')).rejects.toThrow(
      'Plugin sandbox requires a browser environment',
    );
  });

  it('creates an isolated iframe and resolves manifest on valid message response', async () => {
    let messageListener: ((ev: MessageEvent) => void) | null = null;
    let appendedIframe: any = null;

    const fakeIframe = {
      sandbox: { add: vi.fn() },
      style: { cssText: '' },
      remove: vi.fn(),
      contentWindow: {} as any,
      src: '',
    };

    const fakeWindow = {
      addEventListener: vi.fn((event: string, listener: any) => {
        if (event === 'message') messageListener = listener;
      }),
      removeEventListener: vi.fn(),
      setTimeout: vi.fn((_cb: any, _ms: number) => 123),
    };

    const fakeDocument = {
      createElement: vi.fn(() => fakeIframe),
      body: {
        appendChild: vi.fn((el: any) => { appendedIframe = el; }),
      },
    };

    vi.stubGlobal('window', fakeWindow);
    vi.stubGlobal('document', fakeDocument);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob://fake-url'),
      revokeObjectURL: vi.fn(),
    });
    let capturedHtml = '';
    vi.stubGlobal('Blob', vi.fn(function(parts: any[]) {
      if (typeof parts?.[0] === 'string' && parts[0].includes('<!doctype html>')) {
        capturedHtml = parts[0];
      }
    }));

    const inspectionPromise = inspectBundleManifest('export const manifest = { id: "test" };', 'test-plugin');

    expect(messageListener).toBeDefined();
    expect(appendedIframe).toBe(fakeIframe);

    const match = capturedHtml.match(/const nonce = ("[^"]+");/);
    const nonce = match ? JSON.parse(match[1]) : '';

    if (messageListener) {
      (messageListener as any)({
        source: fakeIframe.contentWindow,
        data: {
          source: 'dcg-plugin-sandbox',
          nonce,
          payload: { ok: true, manifest: { id: 'test-plugin' } },
        },
      });
    }

    const manifest = await inspectionPromise;
    expect(manifest.id).toBe('test-plugin');
  });

  it('times out and rejects when iframe does not reply', async () => {
    let timeoutCb: (() => void) | null = null;

    const fakeIframe = {
      sandbox: { add: vi.fn() },
      style: { cssText: '' },
      remove: vi.fn(),
      contentWindow: {},
      src: '',
    };

    const fakeWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout: vi.fn((cb: any, _ms: number) => {
        timeoutCb = cb;
        return 123;
      }),
    };

    const fakeDocument = {
      createElement: vi.fn(() => fakeIframe),
      body: { appendChild: vi.fn() },
    };

    vi.stubGlobal('window', fakeWindow);
    vi.stubGlobal('document', fakeDocument);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob://fake'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('Blob', vi.fn(function() {}));

    const promise = inspectBundleManifest('code', 'timeout-plugin');
    expect(timeoutCb).toBeDefined();
    // Trigger timeout
    timeoutCb!();

    await expect(promise).rejects.toThrow('Timed out inspecting plugin bundle: timeout-plugin');
    expect(fakeIframe.remove).toHaveBeenCalled();
  });
});
