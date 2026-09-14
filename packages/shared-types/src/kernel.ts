// Dynamic Microkernel & Extensible Minigames — shared contracts (M14)
// See docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md

export type MinigameCategory = 'delivery' | 'puzzle' | 'cooking' | 'defense' | 'assembly';
export type MinigameHardwareTarget = 'canvas' | 'webgl' | 'dom';
export type MinigameRole = 'pip' | 'morgan' | 'arthur';

export interface MinigameManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  category: MinigameCategory;
  thumbnailUrl: string;
  entrypointUrl: string;
  permissions?: string[];
  requiredRole?: MinigameRole;
  targetHardware: MinigameHardwareTarget;
  sourceUrl?: string;
  bundleSha256?: string;
}

export interface GameSessionConfig {
  sessionId: string;
  userId: string;
  archetype: MinigameRole;
  difficulty: number;
  districtDay: number;
  customData?: Record<string, unknown>;
}

export interface ResourceGrant {
  cashDelta: number;
  energyDelta: number;
  trustDelta: number;
  resilienceDelta: number;
}

export interface GameSessionResult {
  sessionId: string;
  score: number;
  completed: boolean;
  durationSec: number;
  rewardsGranted: ResourceGrant;
  telemetry?: Record<string, unknown>;
}

export interface GameSessionHostAPI {
  playSFX(sfxId: string): void;
  grantRewards(rewards: Partial<Omit<ResourceGrant, never>>): Promise<void>;
  notify(message: string, type: 'info' | 'success' | 'warning'): void;
  closeMinigame(result?: { score: number; completed: boolean }): void;
}

export interface GameSessionContext {
  sessionId: string;
  sessionToken: string;
  userId: string;
  archetype: MinigameRole;
  activeSkin: string;
  day: number;
  currentStats: {
    cash: number;
    energy: number;
    socialTrust: number;
    stressLevel: number;
  };
  host: GameSessionHostAPI;
}

export interface MinigameInstance {
  mount(container: HTMLElement, context: GameSessionContext): Promise<void>;
  unmount(): Promise<void>;
  onResize?(width: number, height: number): void;
  onPause?(): void;
  onResume?(): void;
}

// ── Frontend Kernel — standalone plugin registration ───────────────────────
// Generalizes the M14 microkernel principle beyond minigames: any first-party
// feature package (geo-weather, mesh-comms, mutual-credit, skins, world) self-
// registers with apps/web/src/core/kernel/Kernel.ts through this contract
// instead of being statically imported by TopHUD.ts/main.ts.

export interface KernelPluginManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  permissions?: string[];
  requiresHardware?: boolean;
}

export interface KernelHudButtonDescriptor {
  id: string;
  icon: string;
  label: string;
  className?: string;
  onClick: () => void;
}

export interface KernelContext {
  uiRoot: HTMLElement;
  hud: { registerButton(button: KernelHudButtonDescriptor): void };
  theme: { switchSkin(skinId: string, scene?: unknown): Promise<void>; getActiveSkinId(): string };
  audio: { playUIClick(): void; playSolidarityChime(): void };
  input: { setLocked(locked: boolean): void };
}

export interface KernelPluginModule {
  manifest: KernelPluginManifest;
  register(ctx: KernelContext): void | Promise<void>;
}

// ── Living District Builder ────────────────────────────────────────────────

export type DistrictBuildingType =
  | 'community_kitchen'
  | 'solar_cooperative'
  | 'urban_garden'
  | 'tool_library'
  | 'clinic';

export interface DistrictParcelState {
  plotId: string;
  position: { x: number; y: number };
  buildingType: DistrictBuildingType | null;
  stage: 0 | 1 | 2 | 3;
  progress: number;
  lastHarvestDay: number | null;
}
