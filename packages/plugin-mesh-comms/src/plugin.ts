import type { KernelContext, KernelPluginManifest, KernelPluginModule } from '@district-cg/shared-types';
import { MeshChatModal } from './MeshChatModal';

export const manifest: KernelPluginManifest = {
  id: 'mesh-comms',
  version: '0.1.0',
  title: 'Off-Grid Mesh Networking',
  description: 'LoRa/Meshtastic radio bridge (Web Serial + Web Bluetooth) and a serverless WebRTC data channel for zero-internet neighborhood dispatch.',
  permissions: ['serial:connect', 'bluetooth:connect'],
  requiresHardware: true,
};

export function register(ctx: KernelContext): void {
  ctx.hud.registerButton({
    id: 'mesh',
    icon: '📻',
    label: 'Open off-grid mesh terminal',
    className: 'mesh-open-btn',
    onClick: () => new MeshChatModal(ctx),
  });
}

export const meshCommsPlugin: KernelPluginModule = { manifest, register };
