// M18 — background delta-sync queue. Deliberately DOM/network-agnostic: it
// takes an injected `SyncTransport` (satisfied by DistrictGatewayClient today,
// and equally by a future M19 mesh-peer transport) and an externally-driven
// `setOnline()` — the caller wires `navigator.onLine`/online/offline events
// at the boot-time edge (main.ts), keeping this class trivially unit-testable
// without a browser.
import type { SignedActionDelta, VectorClock } from '@district-cg/shared-types';

export interface SyncTransport {
  send(deltas: SignedActionDelta[], vectorClock: VectorClock): Promise<{ deltas: SignedActionDelta[]; vectorClock: VectorClock }>;
}

export interface SyncQueueOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 60_000;

export class SyncQueueService {
  private pending: SignedActionDelta[] = [];
  private attempt = 0;
  private online = true;
  private flushing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly transport: SyncTransport,
    private readonly getLocalVectorClock: () => VectorClock,
    private readonly onRemoteDeltas: (deltas: SignedActionDelta[], vectorClock: VectorClock) => void,
    private readonly options: SyncQueueOptions = {},
  ) {}

  get pendingCount(): number {
    return this.pending.length;
  }

  get retryAttempt(): number {
    return this.attempt;
  }

  enqueue(delta: SignedActionDelta): void {
    this.pending.push(delta);
    if (this.online) this.scheduleFlush(0);
  }

  setOnline(online: boolean): void {
    const cameOnline = online && !this.online;
    this.online = online;
    if (cameOnline && this.pending.length > 0) {
      this.attempt = 0;
      this.scheduleFlush(0);
    } else if (!online && this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleFlush(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.flush();
    }, delayMs);
  }

  /** Sends every pending delta now; on failure, schedules an exponential-backoff retry instead of throwing. */
  async flush(): Promise<void> {
    if (!this.online || this.pending.length === 0 || this.flushing) return;
    this.flushing = true;
    const outgoing = [...this.pending];
    try {
      const response = await this.transport.send(outgoing, this.getLocalVectorClock());
      this.pending = this.pending.slice(outgoing.length);
      this.attempt = 0;
      this.onRemoteDeltas(response.deltas, response.vectorClock);
    } catch {
      this.attempt += 1;
      const base = this.options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
      const max = this.options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
      const delay = Math.min(max, base * 2 ** (this.attempt - 1));
      this.scheduleFlush(delay);
    } finally {
      this.flushing = false;
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
