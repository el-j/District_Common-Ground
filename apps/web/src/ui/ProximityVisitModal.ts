import type { DistrictSnapshot, PeerDescriptor } from '@district-cg/shared-types';
import { getNearbyPeers, requestVisit } from '../core/mesh/meshRuntime';
import { renderDistrictSnapshotHtml } from './FriendDistrictViewer';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';

interface ViewingState {
  peer: PeerDescriptor;
  loading: boolean;
  snapshot: DistrictSnapshot | null;
}

/**
 * M54 — EPIC-38 §2/§3. Entry point for proximity visiting: lists whoever
 * `TransportRegistry` currently sees over the mesh and lets the player
 * probe one for a read-only visit. A HUD button (see `TopHUD.ts`'s
 * `proximity` entry), not an in-world `InteractionPrompt` anchored to the
 * player's position — a deliberate, recorded scope decision (see this
 * milestone's task doc): `WorldScene.ts`'s per-frame update() is already a
 * dense, heavily-state-gated proximity/interactable priority machine
 * (dialogueOpen/buildOpen/historyOpen/assemblyOpen/minigameOpen...), and
 * threading a new *non-spatial* discovery condition (a mesh peer has no
 * world x/y) through it risks real regressions to that machine for a
 * feature this environment can't live-test with 2 real peers anyway. The
 * `TopHUD.registerButton()` path is exactly as established and just as
 * real an entry point (`WorldMapModal`/`SocialHubModal` open the same way).
 *
 * Read-only rendering is fully shared with `FriendDistrictViewer.ts` via
 * `renderDistrictSnapshotHtml()` — the two visit paths differ only in how
 * the `DistrictSnapshot` was fetched (HTTP vs. a mesh probe/response).
 */
export class ProximityVisitModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private readonly peers: PeerDescriptor[];
  private viewing: ViewingState | null = null;

  constructor(root: HTMLElement) {
    this.peers = getNearbyPeers();

    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.render();

    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });

    this.disposeEscape = bindEscapeClose(() => this.close());
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="settings-panel district-viewer-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🌐 Nearby Travelers</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          ${this.viewing ? this.renderViewing(this.viewing) : this.renderPeerList()}
        </div>
      </div>
    `;
    this.bindEvents();
  }

  private renderPeerList(): string {
    if (this.peers.length === 0) {
      return `<p class="shop-status">No one nearby right now — proximity visiting only works over an active mesh connection.</p>`;
    }
    return `
      <div class="proximity-peer-list">
        ${this.peers.map(p => `
          <div class="proximity-peer-row">
            <span class="proximity-peer-alias">${p.alias || p.peerId}</span>
            <button class="auth-btn auth-btn--secondary interactive" type="button" data-visit="${p.peerId}">Visit</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderViewing(v: ViewingState): string {
    const name = v.peer.alias || v.peer.peerId;
    if (v.loading) return `<p class="shop-status">Reaching out to ${name}…</p>`;
    if (!v.snapshot) return `<p class="shop-status">${name} isn't visitable right now (declined, or out of range).</p>`;
    return `
      <div class="district-viewer-summary-label">${name}'s home</div>
      ${renderDistrictSnapshotHtml(v.snapshot)}
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-visit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const peerId = btn.dataset['visit'];
        const peer = this.peers.find(p => p.peerId === peerId);
        if (!peer) return;

        this.viewing = { peer, loading: true, snapshot: null };
        this.render();

        void requestVisit(peer.peerId).then(snapshot => {
          if (!this.viewing || this.viewing.peer.peerId !== peer.peerId) return; // modal closed/moved on
          this.viewing = { peer, loading: false, snapshot };
          this.render();
        });
      });
    });
  }

  private close(): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => this.el.remove(), 200);
  }
}
