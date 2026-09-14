import type { KernelContext, KernelPluginManifest, KernelPluginModule } from '@district-cg/shared-types';
import { CreditTransferModal } from './CreditTransferModal';

export const manifest: KernelPluginManifest = {
  id: 'mutual-credit',
  version: '0.1.0',
  title: 'Decentralized Mutual Credit',
  description: 'Ed25519-signed, hash-chained mutual credit ledger for zero-fee neighbor-to-neighbor trade, relayed via a pasteable scan-to-pay code.',
  permissions: ['crypto:sign', 'wallet:ledger'],
  requiresHardware: false,
};

export function register(ctx: KernelContext): void {
  ctx.hud.registerButton({
    id: 'credit',
    icon: '🪙',
    label: 'Open mutual credit trade terminal',
    className: 'credit-open-btn',
    onClick: () => new CreditTransferModal(ctx),
  });
}

export const mutualCreditPlugin: KernelPluginModule = { manifest, register };
