import type { DistrictSnapshot } from '@district-cg/shared-types';

/**
 * M54 — EPIC-38 §2/§3. The proximity-visiting protocol: a small
 * request/response pair carried as a JSON `MeshPacket.payload` over the
 * existing `'whisper'` channel (`MESH_CHANNELS`, `@district-cg/shared-types`)
 * — deliberately NOT a new `MeshChannel`, since `'whisper'`'s private,
 * 1:1-directed intent already fits a visit probe exactly, and EPIC-38's own
 * non-goals rule out new mesh transports/protocol surfaces beyond what this
 * milestone needs. Real packet construction/signing/routing stays in
 * `meshRuntime.ts` (the one place that already owns that concern, see
 * `sendChatMessage()`) — this class only knows about the visit protocol
 * itself, dependency-injected so it's unit-testable without any real mesh
 * plumbing, mirroring `TransportRegistry.test.ts`'s mockable style.
 */
export interface VisitProbePayload {
  type: 'visit-probe';
  requestId: string;
}

export interface VisitResponsePayload {
  type: 'visit-response';
  requestId: string;
  visitable: boolean;
  snapshot?: DistrictSnapshot;
}

export type ProximityVisitPayload = VisitProbePayload | VisitResponsePayload;

const DEFAULT_TIMEOUT_MS = 5000;

export interface ProximityVisitingDeps {
  /** Sends an already-signed, already-routed payload directly to one peer. */
  sendToPeer: (peerId: string, payload: ProximityVisitPayload) => Promise<void>;
  /** Whether the local player currently opts into being visited (housing.visitable). */
  isLocallyVisitable: () => boolean;
  /** Builds the local snapshot to hand back to a probing peer — only called when visitable. */
  buildLocalSnapshot: () => DistrictSnapshot;
}

export class ProximityVisiting {
  private readonly pending = new Map<string, { resolve: (snapshot: DistrictSnapshot | null) => void; timer: ReturnType<typeof setTimeout> }>();
  private seq = 0;

  constructor(private readonly deps: ProximityVisitingDeps) {}

  /** Feed every incoming packet on the mesh's `'whisper'` channel through this. */
  handleIncomingPayload(senderId: string, rawPayload: string): void {
    let payload: ProximityVisitPayload;
    try {
      payload = JSON.parse(rawPayload) as ProximityVisitPayload;
    } catch {
      return; // not a proximity-visiting-shaped whisper packet — ignore, not our concern
    }

    if (payload.type === 'visit-probe') {
      const visitable = this.deps.isLocallyVisitable();
      void this.deps.sendToPeer(senderId, {
        type: 'visit-response',
        requestId: payload.requestId,
        visitable,
        snapshot: visitable ? this.deps.buildLocalSnapshot() : undefined,
      });
      return;
    }

    if (payload.type === 'visit-response') {
      const waiting = this.pending.get(payload.requestId);
      if (!waiting) return; // already timed out, or not ours
      clearTimeout(waiting.timer);
      this.pending.delete(payload.requestId);
      waiting.resolve(payload.visitable ? (payload.snapshot ?? null) : null);
    }
  }

  /**
   * Probes a discovered peer and resolves with their snapshot if they're
   * currently visitable, or `null` if they declined (not visitable) or
   * never responded within `timeoutMs` — a mesh peer going out of range
   * mid-probe is a completely normal, expected outcome here, not an error.
   */
  async requestVisit(peerId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<DistrictSnapshot | null> {
    const requestId = `visit-${Date.now()}-${this.seq++}`;
    const result = new Promise<DistrictSnapshot | null>(resolve => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve(null);
      }, timeoutMs);
      this.pending.set(requestId, { resolve, timer });
    });
    try {
      await this.deps.sendToPeer(peerId, { type: 'visit-probe', requestId });
    } catch {
      // Peer went out of range between discovery and probing, or no
      // transport can currently reach them — the same observable outcome
      // as "no response," so resolve null instead of rejecting the caller.
      const waiting = this.pending.get(requestId);
      if (waiting) {
        clearTimeout(waiting.timer);
        this.pending.delete(requestId);
        waiting.resolve(null);
      }
    }
    return result;
  }
}

/**
 * Pure — builds the exact same `DistrictSnapshot` shape the Go backend's
 * `getFriendDistrict()` returns (see `apps/api/internal/social/repository.go`,
 * confirmed by reading it: `activeCrisis` is the raw `crisisState.activeCrisisId`
 * string, not a resolved title), so both the server-fetched and
 * mesh-fetched paths render through the exact same
 * `renderDistrictSnapshotHtml()` (see `FriendDistrictViewer.ts`) with zero
 * shape drift between them.
 */
export function buildLocalDistrictSnapshot(params: {
  handle: string;
  day: number;
  resilienceScore: number;
  activeCrisisId: string | null;
  commons: DistrictSnapshot['commons'];
}): DistrictSnapshot {
  return {
    handle: params.handle.trim() || 'A traveler',
    day: params.day,
    resilienceScore: params.resilienceScore,
    activeCrisis: params.activeCrisisId,
    commons: params.commons,
  };
}
