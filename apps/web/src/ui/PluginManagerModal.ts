import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { MinigameLoader } from '../core/kernel/MinigameLoader';
import {
  getPluginCatalogSnapshot,
  installPluginFromBundleFile,
  installPluginFromManifestUrl,
  refreshInstalledPlugins,
  removeInstalledPlugin,
  type InstalledPluginRecord,
} from '../core/kernel/PluginRegistry';
import {
  listVerificationRequests,
  reviewVerificationRequest,
  submitVerificationRequest,
  type VerificationRequestRecord,
} from '../api/endpoints/plugins';
import { getToken } from '../core/state/persistence';

export class PluginManagerModal {
  private readonly el: HTMLElement;
  private manifestInput: HTMLInputElement | null = null;
  private uploadInput: HTMLInputElement | null = null;
  private statusEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private queueEl: HTMLElement | null = null;
  private installedRecords: InstalledPluginRecord[] = [];

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'plugin-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('plugin-overlay--visible'));

    this.render();
    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });

    void this.renderCatalog().catch(err => this.setStatus(err instanceof Error ? err.message : 'Unable to load plugins', 'error'));
    void this.renderOwnerQueue();
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="plugin-panel interactive">
        <div class="plugin-header">
          <span class="plugin-title">🧩 Plugin Library</span>
          <button class="plugin-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="plugin-body">
          <p class="plugin-copy">Install a plugin from a trusted manifest URL or upload a bundled module. The installer validates the manifest, permissions, and bundle hash, then compares the result against the live server catalog.</p>
          <div class="plugin-install-grid">
            <label class="plugin-field">
              <span>Manifest URL</span>
              <input class="plugin-input" type="url" placeholder="https://example.com/plugin.manifest.json" />
            </label>
            <div class="plugin-actions plugin-actions--inline">
              <button class="plugin-btn plugin-btn--primary" type="button" data-action="install-url">Install from URL</button>
              <button class="plugin-btn" type="button" data-action="refresh">Check updates</button>
            </div>
            <label class="plugin-upload">
              <input class="plugin-file" type="file" accept=".js,.mjs" />
              <span>Upload bundled plugin module</span>
            </label>
            <div class="plugin-actions">
              <button class="plugin-btn plugin-btn--secondary" type="button" data-action="install-file">Install uploaded bundle</button>
            </div>
          </div>
          <div class="plugin-status" hidden></div>
          <div class="plugin-list" aria-live="polite"></div>
          <div class="plugin-queue" hidden>
            <div class="plugin-queue-header">
              <span>Owner verification queue</span>
              <button class="plugin-btn" type="button" data-action="refresh-queue">Refresh queue</button>
            </div>
            <div class="plugin-queue-list"></div>
          </div>
        </div>
      </div>
    `;

    this.manifestInput = this.el.querySelector<HTMLInputElement>('.plugin-input');
    this.uploadInput = this.el.querySelector<HTMLInputElement>('.plugin-file');
    this.statusEl = this.el.querySelector<HTMLElement>('.plugin-status');
    this.listEl = this.el.querySelector<HTMLElement>('.plugin-list');
    this.queueEl = this.el.querySelector<HTMLElement>('.plugin-queue');

    this.bind();
  }

  private bind(): void {
    this.el.querySelector<HTMLButtonElement>('.plugin-close')?.addEventListener('click', () => this.close());
    this.el.querySelector<HTMLButtonElement>('[data-action=install-url]')?.addEventListener('click', () => void this.installFromUrl());
    this.el.querySelector<HTMLButtonElement>('[data-action=install-file]')?.addEventListener('click', () => void this.installFromFile());
    this.el.querySelector<HTMLButtonElement>('[data-action=refresh]')?.addEventListener('click', () => void this.refresh());
    this.el.querySelector<HTMLButtonElement>('[data-action=refresh-queue]')?.addEventListener('click', () => void this.renderOwnerQueue());
  }

  private setStatus(message: string, tone: 'info' | 'error' = 'info'): void {
    if (!this.statusEl) return;
    this.statusEl.hidden = false;
    this.statusEl.textContent = message;
    this.statusEl.dataset['tone'] = tone;
  }

  private async installFromUrl(): Promise<void> {
    const value = this.manifestInput?.value.trim();
    if (!value) {
      this.setStatus('Enter a manifest URL first.', 'error');
      return;
    }

    try {
      playUIClick();
      this.setStatus('Installing plugin...', 'info');
      const result = await installPluginFromManifestUrl(value);
      const requested = await this.requestVerification(result.record);
      await this.renderCatalog();
      this.setStatus(requested ? 'Plugin quarantined. Verification request sent.' : 'Plugin quarantined locally.', 'info');
    } catch (err) {
      this.setStatus(err instanceof Error ? err.message : 'Plugin install failed.', 'error');
    }
  }

  private async installFromFile(): Promise<void> {
    const file = this.uploadInput?.files?.[0];
    if (!file) {
      this.setStatus('Choose a bundled JavaScript module first.', 'error');
      return;
    }

    try {
      playUIClick();
      this.setStatus('Installing uploaded bundle...', 'info');
      const result = await installPluginFromBundleFile(file);
      const requested = await this.requestVerification(result.record);
      await this.renderCatalog();
      this.setStatus(requested ? 'Uploaded bundle quarantined. Verification request sent.' : 'Uploaded bundle quarantined locally.', 'info');
    } catch (err) {
      this.setStatus(err instanceof Error ? err.message : 'Upload install failed.', 'error');
    }
  }

  private async refresh(): Promise<void> {
    try {
      playUIClick();
      this.setStatus('Checking server catalog and plugin updates...', 'info');
      await refreshInstalledPlugins();
      await this.renderCatalog();
      await this.renderOwnerQueue();
      this.setStatus('Plugin catalog refreshed.', 'info');
    } catch (err) {
      this.setStatus(err instanceof Error ? err.message : 'Unable to refresh plugin catalog.', 'error');
    }
  }

  private async requestVerification(record: InstalledPluginRecord): Promise<boolean> {
    if (!getToken()) {
      return false;
    }
    await submitVerificationRequest({
      sourceKind: record.sourceKind,
      manifestUrl: record.manifestUrl,
      bundleSha256: record.bundleSha256,
      pluginMetadata: {
        id: record.id,
        version: record.version,
        title: record.title,
        description: record.description,
        category: record.category,
        thumbnailUrl: record.thumbnailUrl,
        entrypointUrl: record.entrypointUrl,
        permissions: record.permissions,
        requiredRole: record.requiredRole,
        targetHardware: record.targetHardware,
        sourceUrl: record.sourceUrl,
        bundleSha256: record.bundleSha256,
      },
    });
    return true;
  }

  private async renderCatalog(): Promise<void> {
    const snapshot = await getPluginCatalogSnapshot();
    if (!this.listEl) return;
    this.installedRecords = snapshot.installed;

    if (snapshot.installed.length === 0) {
      this.listEl.innerHTML = '<div class="plugin-empty">No user-installed plugins yet. Install one from a manifest URL or an uploaded bundle.</div>';
      return;
    }

    const server = new Map(snapshot.serverGames.map(game => [game.id, game]));
    this.listEl.innerHTML = snapshot.installed.map(record => this.renderCard(record, server.get(record.id))).join('');
    this.bindCardActions();
  }

  private renderCard(record: InstalledPluginRecord, serverGame?: { version: string; title: string; description: string }): string {
    const status = record.serverStatus ?? 'missing';
    const statusLabel = status === 'matches'
      ? 'Matches server'
      : status === 'outdated'
        ? 'Local older than server'
        : status === 'conflict'
          ? 'Version conflict'
          : 'Local only';

    return `
      <article class="plugin-card" data-plugin-id="${record.id}">
        <div class="plugin-card-head">
          <div>
            <h3>${record.title}</h3>
            <p>${record.id} · v${record.version}</p>
          </div>
          <span class="plugin-pill plugin-pill--${status}">${statusLabel}</span>
        </div>
        <p class="plugin-desc">${record.description}</p>
        <dl class="plugin-meta">
          <dt>Source</dt><dd>${record.sourceKind}${record.manifestUrl ? ` · ${record.manifestUrl}` : ''}</dd>
          <dt>Hash</dt><dd>${record.bundleSha256.slice(0, 12)}…</dd>
          <dt>Permissions</dt><dd>${record.permissions.length ? record.permissions.join(', ') : 'none'}</dd>
          <dt>Server</dt><dd>${serverGame ? `v${serverGame.version}` : 'not on server'}</dd>
          <dt>Trust</dt><dd>${record.trustLevel}</dd>
        </dl>
        <div class="plugin-card-actions">
          ${record.trustLevel === 'review-needed'
            ? '<button class="plugin-btn plugin-btn--primary" type="button" data-action="request-verification">Request verification</button>'
            : '<button class="plugin-btn" type="button" data-action="launch">Launch</button>'}
          <button class="plugin-btn" type="button" data-action="recheck">Recheck</button>
          <button class="plugin-btn plugin-btn--danger" type="button" data-action="remove">Remove</button>
        </div>
      </article>
    `;
  }

  private bindCardActions(): void {
    this.listEl?.querySelectorAll<HTMLElement>('[data-plugin-id]').forEach(card => {
      const pluginId = card.dataset['pluginId'];
      card.querySelector<HTMLButtonElement>('[data-action=remove]')?.addEventListener('click', () => {
        if (!pluginId) return;
        void removeInstalledPlugin(pluginId).then(() => this.renderCatalog());
      });
      card.querySelector<HTMLButtonElement>('[data-action=request-verification]')?.addEventListener('click', () => {
        if (!pluginId) return;
        const record = this.installedRecords.find(entry => entry.id === pluginId);
        if (!record) return;
        void this.requestVerification(record)
          .then((sent) => {
            if (sent) {
              this.setStatus('Verification request submitted.', 'info');
              void this.renderOwnerQueue();
            } else {
              this.setStatus('Sign in to submit a trust-verification request.', 'info');
            }
          })
          .catch(err => {
            this.setStatus(err instanceof Error ? err.message : 'Failed to submit verification request.', 'error');
          });
      });
      card.querySelector<HTMLButtonElement>('[data-action=recheck]')?.addEventListener('click', () => {
        if (!pluginId) return;
        void refreshInstalledPlugins().then(() => this.renderCatalog());
      });
      card.querySelector<HTMLButtonElement>('[data-action=launch]')?.addEventListener('click', () => {
        if (!pluginId) return;
        void MinigameLoader.launchMinigame(pluginId, {}, this.el.parentElement ?? document.body).catch(err => {
          this.setStatus(err instanceof Error ? err.message : 'Failed to launch plugin.', 'error');
        });
      });
    });
  }

  private async renderOwnerQueue(): Promise<void> {
    if (!this.queueEl) return;
    const list = this.queueEl.querySelector<HTMLElement>('.plugin-queue-list');
    if (!list) return;

    try {
      const requests = await listVerificationRequests();
      this.queueEl.hidden = false;
      if (requests.length === 0) {
        list.innerHTML = '<div class="plugin-empty">No pending verification requests.</div>';
        return;
      }
      list.innerHTML = requests.map(request => this.renderQueueCard(request)).join('');
      this.bindQueueActions();
    } catch {
      this.queueEl.hidden = true;
      list.innerHTML = '';
    }
  }

  private renderQueueCard(request: VerificationRequestRecord): string {
    return `
      <article class="plugin-queue-card" data-request-id="${request.id}">
        <div class="plugin-card-head">
          <div>
            <h3>${request.pluginMetadata.title}</h3>
            <p>${request.pluginId} · ${request.status}</p>
          </div>
          <span class="plugin-pill plugin-pill--missing">${request.sourceKind}</span>
        </div>
        <p class="plugin-desc">${request.pluginMetadata.description}</p>
        <dl class="plugin-meta">
          <dt>Requester</dt><dd>${request.requesterUserId}</dd>
          <dt>Hash</dt><dd>${request.bundleSha256.slice(0, 12)}…</dd>
          <dt>Manifest</dt><dd>${request.manifestUrl ?? 'n/a'}</dd>
        </dl>
        <div class="plugin-card-actions">
          <button class="plugin-btn plugin-btn--secondary" type="button" data-action="approve">Approve</button>
          <button class="plugin-btn plugin-btn--danger" type="button" data-action="reject">Reject</button>
        </div>
      </article>
    `;
  }

  private bindQueueActions(): void {
    this.queueEl?.querySelectorAll<HTMLElement>('[data-request-id]').forEach(card => {
      const requestId = card.dataset['requestId'];
      card.querySelector<HTMLButtonElement>('[data-action=approve]')?.addEventListener('click', () => {
        if (!requestId) return;
        void reviewVerificationRequest(requestId, true, 'Approved by owner').then(() => this.refresh()).catch(err => {
          this.setStatus(err instanceof Error ? err.message : 'Failed to approve request.', 'error');
        });
      });
      card.querySelector<HTMLButtonElement>('[data-action=reject]')?.addEventListener('click', () => {
        if (!requestId) return;
        void reviewVerificationRequest(requestId, false, 'Rejected by owner').then(() => this.renderOwnerQueue()).catch(err => {
          this.setStatus(err instanceof Error ? err.message : 'Failed to reject request.', 'error');
        });
      });
    });
  }

  private close(): void {
    this.el.classList.remove('plugin-overlay--visible');
    inputManager.setLocked(false);
    setTimeout(() => this.el.remove(), 200);
  }
}
