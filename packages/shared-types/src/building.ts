// M41 — EPIC-34 §2. Building-interior plugin manifest, mirroring
// MinigameManifest's shape (kernel.ts) but deliberately minimal: no remote
// catalog/trust-verification pipeline exists for building interiors yet
// (every real interior today is a data-only InteriorProps.ts definition,
// per EPIC-34's own non-goal — "not every building needs to be a full
// package"). This is the manifest shape a `packages/building-*` plugin
// would ship once one exists; `entrypointUrl` stays optional so a manifest
// can describe a data-only interior with no bundle to load at all.
export interface BuildingInteriorManifest {
  id: string;
  label: string;
  entrypointUrl?: string;
}
