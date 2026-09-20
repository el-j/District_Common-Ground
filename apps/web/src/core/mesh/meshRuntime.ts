// M19 — Composition-root glue: the one place apps/web wires the pure
// core/mesh/ services to the standalone bitchat.free transport plugin,
// mirroring core/offline/offlineRuntime.ts's lazy-singleton convention so
// nothing here runs (or touches IndexedDB/BroadcastChannel) until a plugin
// actually needs it.
import { MESH_CHANNELS, type DistrictSnapshot, type MeshChatEvent, type MeshPacket, type MeshTransportBadge, type PeerDescriptor } from '@district-cg/shared-types';
import { createTransportPlugin } from '@district-cg/plugin-bitchat';
import { MeshNetworkService } from './MeshNetworkService';
import { TransportRegistry } from './TransportRegistry';
import { loadOrCreateMeshIdentity, signPacket, type MeshIdentity } from './MeshCrypto';
import { ProximityVisiting, buildLocalDistrictSnapshot, type ProximityVisitPayload } from './ProximityVisiting';
import { useGameStore } from '../state/useGameStore';

let networkService: MeshNetworkService | null = null;
let registry: TransportRegistry | null = null;
let identityPromise: Promise<MeshIdentity> | null = null;
let bitchatRegistered = false;
let sequence = 0;
let proximityVisiting: ProximityVisiting | null = null;

function ensureNetwork(): { network: MeshNetworkService; registry: TransportRegistry } {
  if (!networkService || !registry) {
    networkService = new MeshNetworkService({ logSink: (message) => console.debug('[mesh]', message) });
    const localRegistry = new TransportRegistry(networkService);
    networkService.setRelay((packet) => localRegistry.broadcast(packet));
    registry = localRegistry;
  }
  return { network: networkService, registry };
}

async function ensureBitchatTransport(): Promise<void> {
  if (bitchatRegistered) return;
  bitchatRegistered = true;
  const { registry: reg } = ensureNetwork();
  await reg.register(createTransportPlugin());
}

function getIdentity(): Promise<MeshIdentity> {
  if (!identityPromise) identityPromise = loadOrCreateMeshIdentity();
  return identityPromise;
}

/** Called once from main.ts's boot() so the bitchat transport starts listening immediately. */
export function initMeshRuntime(): void {
  ensureNetwork();
  void ensureBitchatTransport();
  // M54 — must be set up unconditionally here, not lazily on first
  // requestVisit(): the responder side (replying to someone ELSE's probe)
  // has to be listening from boot regardless of whether the local player
  // ever initiates a visit themselves.
  ensureProximityVisiting();
}

export async function sendChatMessage(channel: string, text: string): Promise<void> {
  const { registry: reg } = ensureNetwork();
  await ensureBitchatTransport();
  const identity = await getIdentity();
  const fields: Omit<MeshPacket, 'signature'> = {
    id: `${identity.peerId}-${Date.now()}-${sequence++}`,
    senderId: identity.peerId,
    recipientId: null,
    channel,
    ttl: 4,
    timestamp: Date.now(),
    payload: JSON.stringify({ alias: identity.peerId, text }),
  };
  const signature = await signPacket(fields, identity.keyPair.privateKey);
  await reg.broadcast({ ...fields, signature });
}

export function onChatMessage(handler: (event: MeshChatEvent) => void): () => void {
  const { network } = ensureNetwork();
  const unsubscribers = MESH_CHANNELS.map((channel) =>
    network.subscribe(channel, (packet) => {
      try {
        const { alias, text } = JSON.parse(packet.payload) as { alias: string; text: string };
        handler({ channel: packet.channel, senderAlias: alias, text });
      } catch {
        // Not a chat-shaped payload on this channel — ignore.
      }
    }),
  );
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export function getActivePeerCount(): number {
  return ensureNetwork().registry.getAllActivePeers().length;
}

export function getTransportBadges(): MeshTransportBadge[] {
  const counts = new Map<string, number>();
  for (const peer of ensureNetwork().registry.getAllActivePeers()) {
    counts.set(peer.transportId, (counts.get(peer.transportId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([transportId, peerCount]) => ({ transportId, peerCount }));
}

// M54 — EPIC-38 §2/§3. Proximity visiting over the mesh — sends a
// `ProximityVisitPayload` directly to one peer via `TransportRegistry.sendDirect`,
// reusing this file's own signing/identity pattern from `sendChatMessage()`
// exactly, just routed direct instead of broadcast. ttl:1, not
// `sendChatMessage`'s ttl:4 — `sendDirect` only ever targets a peer a
// transport already has in range, so there's no multi-hop relay to budget for.
async function sendVisitPayload(peerId: string, payload: ProximityVisitPayload): Promise<void> {
  const { registry: reg } = ensureNetwork();
  await ensureBitchatTransport();
  const identity = await getIdentity();
  const fields: Omit<MeshPacket, 'signature'> = {
    id: `${identity.peerId}-${Date.now()}-${sequence++}`,
    senderId: identity.peerId,
    recipientId: peerId,
    channel: 'whisper',
    ttl: 1,
    timestamp: Date.now(),
    payload: JSON.stringify(payload),
  };
  const signature = await signPacket(fields, identity.keyPair.privateKey);
  await reg.sendDirect(peerId, { ...fields, signature });
}

function ensureProximityVisiting(): ProximityVisiting {
  if (!proximityVisiting) {
    proximityVisiting = new ProximityVisiting({
      sendToPeer: sendVisitPayload,
      isLocallyVisitable: () => useGameStore.getState().housing.visitable,
      buildLocalSnapshot: (): DistrictSnapshot => {
        const state = useGameStore.getState();
        return buildLocalDistrictSnapshot({
          handle: state.player.name,
          day: state.meta.day,
          resilienceScore: state.commons.resilienceScore,
          activeCrisisId: state.crisisState.activeCrisisId,
          commons: {
            solarGridProgress: state.commons.solarGridProgress,
            kitchenProgress: state.commons.kitchenProgress,
            legalFundProgress: state.commons.legalFundProgress,
            toolLibraryProgress: state.commons.toolLibraryProgress,
            landTrustProgress: state.commons.landTrustProgress,
          },
        });
      },
    });
    const { network } = ensureNetwork();
    network.subscribe('whisper', packet => {
      proximityVisiting?.handleIncomingPayload(packet.senderId, packet.payload);
    });
  }
  return proximityVisiting;
}

/** Probes `peerId` for a visitable building; resolves `null` if they decline or don't respond in time. */
export async function requestVisit(peerId: string): Promise<DistrictSnapshot | null> {
  ensureNetwork();
  await ensureBitchatTransport();
  return ensureProximityVisiting().requestVisit(peerId);
}

/** All currently-discovered mesh peers, across every registered transport. */
export function getNearbyPeers(): PeerDescriptor[] {
  return ensureNetwork().registry.getAllActivePeers();
}

/** Test-only reset — mirrors offlineRuntime.ts's resetOfflineRuntimeForTests(). */
export function resetMeshRuntimeForTests(): void {
  networkService = null;
  registry = null;
  identityPromise = null;
  bitchatRegistered = false;
  sequence = 0;
  proximityVisiting = null;
}
