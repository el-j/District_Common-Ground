# 23 — Plugin Loader Conventions & Container-Hosting Spike

Companion to [EPIC-38](../archive/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md) / [M53](../archive/M53-plugin-first-architecture-conventions.md).

## 1. Audit — the 3 existing loaders, as they actually are today

Read in full before writing anything below: `apps/web/src/core/kernel/MinigameLoader.ts`, `apps/web/src/skins/SkinRendererLoader.ts`, `apps/web/src/world/BuildingInteriorLoader.ts`.

| | `MinigameLoader` | `SkinRendererLoader` | `BuildingInteriorLoader` (pre-M53) |
|---|---|---|---|
| Registry keyed by | id | rendererUrl | id |
| Manifest retained? | Yes — separate `manifests` map, `getManifest()`, `listMinigames()` | No manifest concept at all — works off a raw URL string | **No** (pre-M53 gap) |
| Idempotency guard | `if already registered, return` (id-based) | `if cached, return` (url-based memoization) | `if already registered, return` (id-based) |
| Register method name | `registerLocalMinigame(id, manifest, loader)` | *(none — no local-register concept)* | `registerLocal(id, loader)` |
| Unregister/clear | `unregisterMinigame(id)` | `clearCache()` (clears everything, not per-id) | `unregister(id)` |
| Existence check | `hasMinigame(id)` | *(none)* | `hasInterior(id)` |
| Remote-load entry point | `loadRemoteMinigame(manifest)` | `loadRemoteSkinRenderer(rendererUrl)` | `loadRemote(manifest)` |
| Export validated | `createMinigame` | `createRenderer` | `createScene` |
| Real call sites beyond own tests? | Yes — `TopHUD.ts`, minigame launch flow | Yes — `WorldScene.ts` | **None** (confirmed by grep) |

**Finding: this is genuine, unplanned drift, not 3 deliberate variations on a theme.** Each loader was built at a different milestone (`MinigameLoader` earliest/most mature, `SkinRendererLoader` at M30, `BuildingInteriorLoader` at M41 as forward-looking scaffolding — its own doc comment already says "no real `packages/building-*` package exists yet"), and each copied the shape of whichever came before it without a canonical contract to converge on. `SkinRendererLoader`'s url-keyed cache is a legitimate, deliberate difference (a hi-fi renderer bundle is genuinely anonymous — many skin ids could theoretically share one bundle — where a minigame or building interior id maps 1:1 to its own bundle), not a bug. The method-naming inconsistency and `BuildingInteriorLoader`'s missing manifest retention are not deliberate — they're the actual gaps.

**What M53 closed, and what it deliberately left alone:**
- **Closed**: `BuildingInteriorLoader` gained `manifests`/`getManifest()`/`listInteriors()`, matching `MinigameLoader`'s shape. Safe to do because this loader has zero real call sites outside its own test file (confirmed by grep before changing it) — purely additive, zero blast radius.
- **Left alone, recorded as a conscious decision**: the method-naming divergence (`registerLocalMinigame` vs `registerLocal`, `unregisterMinigame` vs `unregister`, `hasMinigame` vs `hasInterior`) was **not** retrofitted across the 3 existing loaders. `MinigameLoader` has real call sites across the app (`TopHUD.ts`, the launch flow, its own manifest catalog merge with the Go backend) and `SkinRendererLoader` has its own (`WorldScene.ts`) — renaming either risks real regressions for a cosmetic consistency gain, disproportionate to what this milestone is actually for. The canonical shape below is the contract **new** loader types should follow from here forward; it is not a mandate to retrofit the 3 that predate it.

## 2. The canonical shape for a new plugin-type loader

Any future `packages/*`-backed system (the vision doc names buildings/crafting-tools/mesh-services as future candidates) that needs its own loader should follow this shape, synthesized from what `MinigameLoader` already does most completely:

```ts
class SomeThingLoader {
  private static registeredModules: Map<string, () => Promise<SomeThingModule>>;
  private static manifests: Map<string, SomeThingManifest>;

  static registerLocal(id: string, manifest: SomeThingManifest, loader: () => Promise<SomeThingModule>): void;
  static unregister(id: string): void;
  static has(id: string): boolean;
  static getManifest(id: string): SomeThingManifest | undefined;
  static list(): SomeThingManifest[];

  // Same-origin, first-party-only — no sandboxing/hash verification, same
  // reasoning as every existing loader's own doc comment. A no-op if `id`
  // is already registered.
  static async loadRemote(manifest: SomeThingManifest): Promise<void>;

  static async getModule(id: string): Promise<SomeThingModule>;
}
```

Rules that make this canonical, not just "however `MinigameLoader` happens to look":
- **Keyed by id, not by URL**, unless the loader has the same genuine many-ids-one-bundle property `SkinRendererLoader` has (state that explicitly in the loader's own doc comment if so — don't silently diverge).
- **Manifests are always retained** after a successful `loadRemote()`/`registerLocal()` — a loader that can register something but can't later answer "what did I register" is an incomplete loader, which is exactly the gap this audit found and closed.
- **Method names are unprefixed** (`registerLocal`, not `registerLocalMinigame`) — `BuildingInteriorLoader`'s naming, not `MinigameLoader`'s, is the one to follow going forward, since the plugin-type name is already the class name; repeating it in every method is the actual inconsistency worth not perpetuating.
- **Export-shape validation stays inline** in `loadRemote()` (`typeof mod.createX !== 'function'`), thrown as a real `Error` with the module id in the message — all 3 existing loaders already agree on this, so it's already canonical, not a new rule.

## 3. Container-hosted plugin feasibility spike

**Question**: could a plugin run as its own service in `docker-compose.dev.yml`, reachable the way `api` is today, instead of as a static bundle fetched via `import()`?

**What it would actually take**, grounded in the real `docker-compose.dev.yml`/`docker-compose.yml`/`nginx.conf`:
- A new Dockerfile + compose service per container-hosted plugin, mirroring `api`'s existing shape (build context, healthcheck, `develop.watch` rules) — real, recurring infrastructure cost per plugin, not a one-time setup.
- A new reverse-proxy route per plugin in `nginx.conf` (production) and Vite's dev proxy config (development) — today's static-file plugins need **zero** proxy configuration, since they're served straight out of `public/` by whatever's already serving the app. This is the single biggest complexity delta.
- A genuinely new trust/versioning story: today's plugin bundles are versioned by git commit, part of the same deploy as the app that loads them. A live container-hosted service could drift independently of the client that calls it — reopening the "community-submitted/independently-versioned code" trust question EPIC-30's own Non-Goals explicitly deferred, not solved here either.

**What it would actually buy**: nothing, for any of the 3 plugin types that exist today. `MinigameLoader`, `SkinRendererLoader`, and `BuildingInteriorLoader` all load pure client-side code — rendering logic, game rules, texture generation — none of which does or needs server-side execution or persistent state. Running any of them in a container would add all the cost above for zero functional gain.

**Conclusion: not worth it yet — recorded honestly, per this section's own instruction that this is an acceptable outcome.** The one upcoming feature that plausibly *does* need a real persistent service is [M54](../archive/M54-proximity-visiting-over-the-mesh.md)'s proximity-visiting-over-the-mesh — but that's a live peer-discovery/session problem, materially different in shape from "run a minigame's code in a container," and already has its own real infrastructure precedent to reuse (the existing `MeshTransportPlugin`/peer-discovery mesh layer, not a generic container-hosted-plugin mechanism). If a genuine need for server-side plugin execution shows up, it is far more likely to look like M54's mesh-session service than a generalized version of this spike — revisit there, grounded in that milestone's real requirements, rather than building generic container-hosting infrastructure speculatively now.
