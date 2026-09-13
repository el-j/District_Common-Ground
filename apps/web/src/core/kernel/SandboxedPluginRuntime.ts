import type { GameSessionContext, MinigameManifest, ResourceGrant } from '@district-cg/shared-types';
import { HostPlatformAPI, type HostPlatformCallbacks } from './HostPlatformAPI';

export interface SandboxedPluginRuntimeOptions {
  manifest: MinigameManifest;
  bundleText: string;
  sessionContext: Omit<GameSessionContext, 'host'>;
  callbacks?: HostPlatformCallbacks;
  className?: string;
}

interface HostCallMessage {
  source: 'dcg-plugin-sandbox-runtime';
  bridgeId: string;
  type: 'host-call';
  callId: string;
  method: keyof HostPlatformAPI;
  args: unknown[];
}

interface HostResponseMessage {
  source: 'dcg-plugin-sandbox-runtime';
  bridgeId: string;
  type: 'host-response';
  callId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

interface ClosedMessage {
  source: 'dcg-plugin-sandbox-runtime';
  bridgeId: string;
  type: 'closed';
}

function createNonce(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function createBundleBootstrap(manifest: MinigameManifest, bundleText: string, sessionContext: Omit<GameSessionContext, 'host'>, bridgeId: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body, #dcg-plugin-root {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
    }
    body {
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <div id="dcg-plugin-root"></div>
  <script type="module">
    const bridgeId = ${serialize(bridgeId)};
    const manifest = ${serialize(manifest)};
    const bundleText = ${serialize(bundleText)};
    const sessionContext = ${serialize(sessionContext)};

    const pending = new Map();
    const post = (payload) => {
      parent.postMessage({ source: 'dcg-plugin-sandbox-runtime', bridgeId, ...payload }, '*');
    };

    const invokeHost = (method, args = []) => new Promise((resolve, reject) => {
      const callId = crypto.randomUUID();
      pending.set(callId, { resolve, reject });
      post({ type: 'host-call', callId, method, args });
    });

    const host = {
      playSFX: (sfxId) => invokeHost('playSFX', [sfxId]),
      grantRewards: (rewards) => invokeHost('grantRewards', [rewards]),
      notify: (message, type) => invokeHost('notify', [message, type]),
      closeMinigame: (result) => invokeHost('closeMinigame', [result]),
    };

    const handleMessage = async (event) => {
      const data = event.data;
      if (!data || data.source !== 'dcg-plugin-sandbox-runtime' || data.bridgeId !== bridgeId) {
        return;
      }
      if (data.type === 'host-response') {
        const entry = pending.get(data.callId);
        if (!entry) {
          return;
        }
        pending.delete(data.callId);
        if (data.ok) {
          entry.resolve(data.result);
        } else {
          entry.reject(new Error(data.error || 'Host bridge call failed'));
        }
        return;
      }
      if (data.type === 'shutdown') {
        try {
          await instance?.unmount();
        } finally {
          post({ type: 'closed' });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const bundleUrl = URL.createObjectURL(new Blob([bundleText], { type: 'text/javascript' }));
    let instance;
    try {
      const mod = await import(bundleUrl);
      if (typeof mod.createMinigame !== 'function') {
        throw new Error('Plugin bundle must export createMinigame()');
      }
      instance = mod.createMinigame();
      const root = document.getElementById('dcg-plugin-root');
      if (!root) {
        throw new Error('Plugin runtime root element is missing');
      }
      await instance.mount(root, {
        ...sessionContext,
        host,
      });
      post({ type: 'ready', manifest });
    } catch (err) {
      post({ type: 'error', error: err?.message ?? String(err) });
    } finally {
      URL.revokeObjectURL(bundleUrl);
    }

    window.addEventListener('message', async (event) => {
      const data = event.data;
      if (!data || data.source !== 'dcg-plugin-sandbox-runtime' || data.bridgeId !== bridgeId || data.type !== 'host-response') {
        return;
      }
      const entry = pending.get(data.callId);
      if (!entry) {
        return;
      }
      pending.delete(data.callId);
      if (data.ok) {
        entry.resolve(data.result);
      } else {
        entry.reject(new Error(data.error || 'Host bridge call failed'));
      }
    });
  </script>
</body>
</html>`;
}

export class SandboxedPluginRuntime {
  private readonly options: SandboxedPluginRuntimeOptions;
  private readonly bridgeId = createNonce();
  private iframe: HTMLIFrameElement | null = null;
  private root: HTMLDivElement | null = null;
  private host: HostPlatformAPI | null = null;
  private isMounted = false;
  private readonly onMessage = (event: MessageEvent): void => {
    const data = event.data as HostCallMessage | HostResponseMessage | ClosedMessage | undefined;
    if (!data || data.source !== 'dcg-plugin-sandbox-runtime' || data.bridgeId !== this.bridgeId) {
      return;
    }
    if (!this.iframe?.contentWindow) {
      return;
    }

    if (data.type === 'host-call') {
      void this.handleHostCall(data);
      return;
    }

    if (data.type === 'closed') {
      this.cleanupDom();
    }
  };

  constructor(options: SandboxedPluginRuntimeOptions) {
    this.options = options;
  }

  async mount(parent: HTMLElement = document.body): Promise<void> {
    if (this.isMounted) {
      await this.unmount();
    }

    this.host = new HostPlatformAPI(this.options.callbacks ?? {});

    this.root = document.createElement('div');
    this.root.className = `sandboxed-plugin-runtime ${this.options.className ?? ''}`.trim();
    this.root.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      background: rgba(8, 12, 18, 0.95);
      backdrop-filter: blur(10px);
    `;

    const header = document.createElement('div');
    header.className = 'sandboxed-plugin-runtime__header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      background: rgba(15, 23, 42, 0.96);
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      color: #e2e8f0;
    `;

    const title = document.createElement('div');
    title.textContent = this.options.manifest.title;
    title.style.cssText = 'font-weight: 700; letter-spacing: 0.02em;';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.style.cssText = `
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.9);
      color: #fff;
      padding: 8px 14px;
      cursor: pointer;
    `;
    close.addEventListener('click', () => void this.unmount());

    header.appendChild(title);
    header.appendChild(close);

    this.iframe = document.createElement('iframe');
    this.iframe.className = 'sandboxed-plugin-runtime__frame';
    this.iframe.sandbox.add('allow-scripts');
    this.iframe.style.cssText = 'flex:1;border:0;width:100%;height:100%;background:transparent;';

    this.root.appendChild(header);
    this.root.appendChild(this.iframe);
    parent.appendChild(this.root);

    window.addEventListener('message', this.onMessage);
    this.iframe.srcdoc = createBundleBootstrap(this.options.manifest, this.options.bundleText, this.options.sessionContext, this.bridgeId);
    this.isMounted = true;
  }

  async unmount(): Promise<void> {
    if (!this.isMounted) {
      return;
    }

    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage({
        source: 'dcg-plugin-sandbox-runtime',
        bridgeId: this.bridgeId,
        type: 'shutdown',
      }, '*');
    }

    window.removeEventListener('message', this.onMessage);
    this.cleanupDom();
    this.isMounted = false;
  }

  private cleanupDom(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    if (this.root) {
      this.root.remove();
      this.root = null;
    }
  }

  private async handleHostCall(message: HostCallMessage): Promise<void> {
    const host = this.host;
    if (!host) {
      this.reply(message.callId, false, undefined, 'Host API is not ready');
      return;
    }

    try {
      switch (message.method) {
        case 'playSFX':
          host.playSFX(String(message.args[0] ?? ''));
          this.reply(message.callId, true);
          return;
        case 'grantRewards':
          await host.grantRewards((message.args[0] ?? {}) as Partial<ResourceGrant>);
          this.reply(message.callId, true);
          return;
        case 'notify':
          host.notify(
            String(message.args[0] ?? ''),
            (message.args[1] as 'info' | 'success' | 'warning' | undefined) ?? 'info',
          );
          this.reply(message.callId, true);
          return;
        case 'closeMinigame':
          host.closeMinigame(message.args[0] as { score: number; completed: boolean } | undefined);
          this.reply(message.callId, true);
          return;
        default:
          throw new Error(`Unsupported host method: ${String(message.method)}`);
      }
    } catch (err) {
      this.reply(message.callId, false, undefined, err instanceof Error ? err.message : 'Host call failed');
    }
  }

  private reply(callId: string, ok: boolean, result?: unknown, error?: string): void {
    if (!this.iframe?.contentWindow) {
      return;
    }

    this.iframe.contentWindow.postMessage({
      source: 'dcg-plugin-sandbox-runtime',
      bridgeId: this.bridgeId,
      type: 'host-response',
      callId,
      ok,
      result,
      error,
    }, '*');
  }
}
