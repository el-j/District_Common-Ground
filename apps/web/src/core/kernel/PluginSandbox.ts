import type { MinigameManifest } from '@district-cg/shared-types';

function createNonce(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function inspectBundleManifest(bundleText: string, label: string): Promise<MinigameManifest> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Plugin sandbox requires a browser environment');
  }

  const iframe = document.createElement('iframe');
  iframe.sandbox.add('allow-scripts');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';

  const bundleBlob = new Blob([bundleText], { type: 'text/javascript' });
  const bundleUrl = URL.createObjectURL(bundleBlob);
  const nonce = createNonce();

  const html = `<!doctype html>
<html><body>
<script type="module">
const nonce = ${JSON.stringify(nonce)};
const bundleUrl = ${JSON.stringify(bundleUrl)};
const send = (payload) => {
  parent.postMessage({ source: 'dcg-plugin-sandbox', nonce, label: ${JSON.stringify(label)}, payload }, '*');
};
try {
  const mod = await import(bundleUrl);
  if (!mod.manifest) {
    throw new Error('Plugin bundle must export a manifest object');
  }
  send({ ok: true, manifest: mod.manifest });
} catch (err) {
  send({ ok: false, error: err?.message ?? String(err) });
}
</script>
</body></html>`;

  const pageBlob = new Blob([html], { type: 'text/html' });
  const pageUrl = URL.createObjectURL(pageBlob);

  return await new Promise<MinigameManifest>((resolve, reject) => {
    const cleanup = (): void => {
      window.removeEventListener('message', onMessage);
      iframe.remove();
      URL.revokeObjectURL(bundleUrl);
      URL.revokeObjectURL(pageUrl);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.source !== 'dcg-plugin-sandbox' || event.data.nonce !== nonce) return;
      const payload = event.data.payload as { ok?: boolean; manifest?: MinigameManifest; error?: string };
      if (payload.ok && payload.manifest) {
        cleanup();
        resolve(payload.manifest);
        return;
      }
      cleanup();
      reject(new Error(payload.error ?? 'Unable to inspect plugin bundle'));
    };

    window.addEventListener('message', onMessage);
    iframe.src = pageUrl;
    document.body.appendChild(iframe);

    window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out inspecting plugin bundle: ${label}`));
    }, 8000);
  });
}
