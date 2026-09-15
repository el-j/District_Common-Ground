// M19 — Dynamic registration/lifecycle for pluggable mesh transports, and
// multiplexing of outgoing packets across whichever ones are currently
// active (e.g. bitchat.free + a future LoRa transport simultaneously).
import type { MeshPacket, MeshTransportPlugin, PeerDescriptor, TransportHostAPI } from '@district-cg/shared-types';

export class TransportRegistry {
  private readonly transports = new Map<string, MeshTransportPlugin>();

  constructor(private readonly host: TransportHostAPI) {}

  async register(plugin: MeshTransportPlugin): Promise<void> {
    if (this.transports.has(plugin.id)) {
      throw new Error(`Transport already registered: ${plugin.id}`);
    }
    await plugin.init(this.host);
    this.transports.set(plugin.id, plugin);
  }

  async unregister(id: string): Promise<void> {
    const plugin = this.transports.get(id);
    if (!plugin) return;
    await plugin.destroy();
    this.transports.delete(id);
  }

  listTransportIds(): string[] {
    return Array.from(this.transports.keys());
  }

  /** Sends to every active transport; one transport's failure doesn't block the others. */
  async broadcast(packet: MeshPacket): Promise<void> {
    await Promise.all(
      Array.from(this.transports.values()).map((transport) =>
        transport.broadcast(packet).catch((err: unknown) => {
          this.host.log(`transport ${transport.id} failed to broadcast ${packet.id}: ${String(err)}`);
        }),
      ),
    );
  }

  async sendDirect(peerId: string, packet: MeshPacket): Promise<void> {
    for (const transport of this.transports.values()) {
      if (transport.getActivePeers().some((peer) => peer.peerId === peerId)) {
        await transport.sendDirect(peerId, packet);
        return;
      }
    }
    throw new Error(`No active transport currently has peer ${peerId}`);
  }

  getAllActivePeers(): PeerDescriptor[] {
    const peers: PeerDescriptor[] = [];
    for (const transport of this.transports.values()) peers.push(...transport.getActivePeers());
    return peers;
  }
}
