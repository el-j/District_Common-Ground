import Phaser from 'phaser';
import { inputManager } from './InputManager';
import { setupTilemapCollision } from './CollisionSystem';
import { DEFAULT_RENDERER } from './DefaultTextureRenderer';
import { DayNightSystem } from './DayNightSystem';
import { WeatherRenderer } from './WeatherRenderer';
import { PlayerEntity } from './entities/PlayerEntity';
import { NPCEntity } from './entities/NPCEntity';
import { ScrapsEntity } from './entities/ScrapsEntity';
import { PigeonEntity } from './entities/PigeonEntity';
import { PedestrianEntity } from './entities/PedestrianEntity';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { ConstructionModal, type ConstructionNodeData } from '../ui/ConstructionModal';
import { CrisisWireModal } from '../ui/CrisisWireModal';
import { HistoryModal } from '../ui/HistoryModal';
import { TownHallAssembly } from '../ui/TownHallAssembly';
import { SafeHavenBanner } from '../ui/SafeHavenBanner';
import { TopHUD } from '../ui/TopHUD';
import { useGameStore, type WorldQuestId } from '../core/state/useGameStore';
import { BUILD_COMPLETION_THRESHOLD } from '../core/simulation/EconomyMath';
import { addTrust, spendEnergy, learnRecipe, travelToRegion, assignWorldQuest, checkZoneWorldQuestProgress, checkTalkWorldQuestProgress, feedScraps, SCRAPS_STRESS_RELIEF } from '../core/state/actions';
import { startBGMLoop, playDayChime } from '../core/audio/SoundSynth';
import { weatherTier } from './WeatherSystem';
import { fetchDailyGossip } from '../api/narrativeGossip';
import { MinigameLoader, MinigameTooTiredError } from '../core/kernel/MinigameLoader';
import { MINIGAME_LIMITS } from '../core/simulation/EconomyRules';
import { facadeMarkers, ownsEffect } from '../core/shop/ShopEffects';
import { computeViewportZoom } from './CameraViewport';
import { getActiveWorldPalette, getActiveSkinId, getActiveManifest } from '../skins/ThemeManager';
import { SkinRendererLoader } from '../skins/SkinRendererLoader';
import type { SkinRenderer } from '../skins/SkinRendererInterface';
import { INTERIORS, ALL_INTERIOR_IDS, type InteriorDefinition, type InteriorId } from './InteriorProps';
import { getHousingOption } from '../core/simulation/HousingOptions';
import type { InteriorSceneData } from './InteriorScene';
import { WorldDressingRenderer } from './WorldDressingRenderer';
import { ScavengePickupRenderer, CookbookPickupRenderer } from './PickupRenderers';
import type { RecipeId } from '../core/simulation/Recipes';
import { InteractionPrompt } from './InteractionPrompt';
import { AmbientLightLayer } from './AmbientLightLayer';
import { DIALOGUES, pickDialogueKey } from './NpcDialogues';
import { neighbourMemory, withMemoryOpener } from './NeighbourMemory';
import { COLS, ROWS, T, BLOCKING_TILES, DOOR_TILES, buildMap, isWalkableTile } from './MapData';
import type { RegionSceneData } from './regions/RegionScene';
import { REGIONS, isRegionUnlocked, type RegionId } from './regions/RegionData';

// M41/M44 — the minimal shape both InteriorScene.ts's and RegionScene.ts's
// WAKE payloads satisfy — onWakeFromInterior() only ever reads returnX/
// returnY, so this is deliberately narrower than either scene's own full
// init-data interface (which also carries interiorId/regionId, neither
// needed here).
interface SceneReturnData {
  returnX: number;
  returnY: number;
  returnFacing: import('./InputManager').Facing;
}

const TS = 16;

// ── WorldScene ─────────────────────────────────────────────────────────────────


interface FlyerObject {
  sprite: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
}

export class WorldScene extends Phaser.Scene {
  private static hud: TopHUD | null = null;
  private player!: PlayerEntity;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private thumbstickGraphic!: Phaser.GameObjects.Graphics;
  private npcs: NPCEntity[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private constructionNodes: ConstructionNodeData[] = [];
  private nodeMarkers: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private dialogueOpen = false;
  private buildOpen = false;
  private crisisOpen = false;
  private historyOpen = false;
  private assemblyOpen = false;
  private safeHavenOpen = false;
  private safeHavenShown = false;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private completedIds = new Set<string>();
  private scraps!: ScrapsEntity;
  private pigeons: PigeonEntity[] = [];
  // M34 §2 — EPIC-31. Non-interactive background crowd, separate from `npcs`.
  private pedestrians: PedestrianEntity[] = [];
  // M34 §1 — EPIC-31. The raw tile grid, kept around (buildMap() previously
  // only fed the Phaser tilemap and was never retained) so npc/pedestrian
  // wander can do a lightweight tile-walkability lookup without touching
  // Arcade physics — see NPCEntity.ts's own doc comment for why.
  private mapGrid: number[][] = [];
  private flyers: FlyerObject[] = [];
  private divisionCrisisActive = false;
  private ticksSinceDay = 0;
  private bgmStarted = false;
  private prevDay = 0;
  // WorldScene De-escalation — the day/night tint+streetlamps, the
  // frost/rain overlay+raindrops, the resilience-tier/dressing-prop
  // rendering, and the scavenge/cookbook pickups, previously inline
  // fields/methods here, now live in their own scene-owned renderer classes
  // (same instantiate-in-create()/drive-from-update() shape as
  // AmbientLightLayer).
  private dayNight!: DayNightSystem;
  private weather!: WeatherRenderer;
  private dressing!: WorldDressingRenderer;
  private scavenge!: ScavengePickupRenderer;
  private cookbook!: CookbookPickupRenderer;

  // M30 — resolved SkinRenderer per skin id, so switching back to an
  // already-loaded hi-fi skin doesn't re-import() its bundle.
  private rendererCache: Map<string, SkinRenderer> = new Map();

  // M21 — camera/palette/dressing/juice state
  private lastSkinRevision = -1;
  private lastResilienceScore = -1;
  private nodePrompts: Map<string, InteractionPrompt> = new Map();
  private npcPrompts: Map<string, InteractionPrompt> = new Map();
  private bikePrompt!: InteractionPrompt;
  private ambientLight: AmbientLightLayer | null = null;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private npcShadows: Map<string, Phaser.GameObjects.Ellipse> = new Map();
  // M41 — EPIC-34 §1. Doors that lead into a real isolated InteriorScene
  // (see enterInterior()); replaces the old rect-based camera-pan tracked
  // via currentInteriorId/followingPlayer, both removed.
  private interiorDoorPrompts: Map<InteriorId, InteractionPrompt> = new Map();
  // M44 — EPIC-35 §3. The rail platform's travel node — literalizes what
  // was previously pure decoration (CLAUDE.md's own North Transit Hub
  // description) into a real interaction, mirroring the door-prompt
  // pattern exactly, just for one fixed placeholder destination.
  private travelNodePrompt!: InteractionPrompt;
  private static readonly TRAVEL_NODE = { x: 14 * TS + TS / 2, y: 8 * TS + TS / 2 };

  // Courier Rush Cargo Bike portal (near Sal's Kitchen / Grocer)
  private bikePortal = { x: 18 * TS + TS / 2, y: 55 * TS + TS / 2 };
  private bikeMarker!: Phaser.GameObjects.Graphics;
  private minigameOpen = false;

  // M27 — the 4 new built-in minigames, one per remaining M14-contract
  // category, each placed near the construction node or NPC its theme ties
  // to: Tenant Rights Match near the Legal Fund/Leo, Kitchen Rush near the
  // Community Kitchen/Mira & Sal, Solidarity Line near the Land Trust/Higgins,
  // Tool Workshop inside the Tool Library near Marcus.
  private readonly minigamePortals: {
    id: string; label: string; emoji: string; color: number; position: { x: number; y: number };
  }[] = [
    { id: 'tenant-match',    label: 'Tenant Rights Match', emoji: '📜', color: 0x60a5fa, position: { x: 30 * TS + TS / 2, y: 31 * TS + TS / 2 } },
    { id: 'kitchen-rush',    label: 'Kitchen Rush',        emoji: '🍲', color: 0xf59e0b, position: { x: 24 * TS + TS / 2, y: 58 * TS + TS / 2 } },
    { id: 'solidarity-line', label: 'Solidarity Line',     emoji: '🛡️', color: 0x5eead4, position: { x: 32 * TS + TS / 2, y: 37 * TS + TS / 2 } },
    { id: 'tool-workshop',   label: 'Tool Workshop',       emoji: '🛠️', color: 0xfacc15, position: { x: 44 * TS + TS / 2, y: 32 * TS + TS / 2 } },
  ];
  private minigamePortalPrompts: Map<string, InteractionPrompt> = new Map();

  // Town Hall interaction point (door at col 5, row 35)
  private static readonly TOWN_HALL = { x: 5 * 16 + 8, y: 35 * 16 + 8 };

  public static setHud(hud: TopHUD): void { WorldScene.hud = hud; }
  /** M41 — EPIC-34 §1. Lets InteriorScene.ts (a sibling scene, not a
   *  subclass) drive the same shared HUD action-button slot while the
   *  player is inside an isolated interior. */
  public static getHud(): TopHUD | null { return WorldScene.hud; }

  /** M46 — EPIC-35 §1. Whichever of WorldScene/RegionScene is currently
   *  awake registers itself here on create() — the same "static registry a
   *  sibling scene/DOM component can reach" shape `hud` already
   *  establishes — so `WorldMapModal.ts` (a plain DOM modal with no scene
   *  reference of its own) can request travel to any unlocked region
   *  without needing to know which scene is currently active. Returns
   *  whether the request actually launched a travel (false for a locked
   *  region, or a region the active scene can't route to yet). */
  private static activeTravelHandler: ((targetRegionId: RegionId) => boolean) | null = null;
  public static setActiveTravelHandler(fn: ((targetRegionId: RegionId) => boolean) | null): void {
    WorldScene.activeTravelHandler = fn;
  }
  public static requestTravel(targetRegionId: RegionId): boolean {
    return WorldScene.activeTravelHandler?.(targetRegionId) ?? false;
  }

  constructor() { super({ key: 'WorldScene' }); }

  preload(): void {
    // Always the built-in renderer here, never a remote one — preload()
    // can't await a dynamic import, so first paint must never block on a
    // network fetch even when the active skin is a hi-fi one. The real
    // renderer (if any) resolves shortly after, via the skinRevision
    // subscription in create() below.
    DEFAULT_RENDERER.createTilesetTexture(this, getActiveWorldPalette());
    DEFAULT_RENDERER.createPlayerTexture(this, useGameStore.getState().player.appearance);
    DEFAULT_RENDERER.createNPCTextures(this);
  }

  create(): void {
    const mapData = buildMap();
    this.mapGrid = mapData;
    const map = this.make.tilemap({ data: mapData, tileWidth: TS, tileHeight: TS });
    const tileset = map.addTilesetImage('tiles', 'tileset', TS, TS, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('layer failed');
    this.layer = layer as Phaser.Tilemaps.TilemapLayer;
    // M32 — BLOCKING_TILES (MapData.ts) is the single source of truth for
    // which tile types block movement; isWalkableTile() derives from the
    // same list, so this never silently drifts from what's actually tested.
    layer.setCollision([...BLOCKING_TILES]);

    const worldW = COLS * TS, worldH = ROWS * TS;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Player — starts in south courtyard
    const px = 25 * TS + TS / 2, py = 53 * TS + TS / 2;
    const sprite = this.physics.add.sprite(px, py, 'player', 0);
    sprite.setCollideWorldBounds(true);
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(10, 10);

    this.anims.create({ key: 'walk_down',  frames: [{ key:'player',frame:0 },{ key:'player',frame:1 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_up',    frames: [{ key:'player',frame:2 },{ key:'player',frame:3 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_left',  frames: [{ key:'player',frame:4 },{ key:'player',frame:5 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_right', frames: [{ key:'player',frame:6 },{ key:'player',frame:7 }], frameRate: 6, repeat: -1 });

    setupTilemapCollision(this, sprite, layer as Phaser.Tilemaps.TilemapLayer);
    this.player = new PlayerEntity(sprite);

    // Construction nodes (A–E)
    this.constructionNodes = [
      { id: 'kitchen',     label: 'Community Kitchen & Fridge', position: { x: 20*TS+TS/2, y: 58*TS+TS/2 }, progressKey: 'kitchenProgress' },
      { id: 'solar',       label: 'Rooftop Solar Cooperative',  position: { x: 24*TS+TS/2, y: 8*TS+TS/2  }, progressKey: 'solarGridProgress' },
      { id: 'legal',       label: 'Legal Defense Fund',          position: { x: 23*TS+TS/2, y: 31*TS+TS/2 }, progressKey: 'legalFundProgress' },
      { id: 'toolLibrary', label: 'Community Tool Library',      position: { x: 42*TS+TS/2, y: 30*TS+TS/2 }, progressKey: 'toolLibraryProgress' },
      { id: 'landTrust',   label: 'Community Land Trust',        position: { x: 25*TS+TS/2, y: 36*TS+TS/2 }, progressKey: 'landTrustProgress' },
    ];
    this.constructionNodes.forEach(node => {
      const g = this.add.graphics();
      this.drawNodeMarker(g, node.position.x, node.position.y, false);
      g.setDepth(4);
      this.nodeMarkers.set(node.id, g);
      // M21 §7 — bobbing bounce-bubble proximity prompt, layered above the
      // always-visible location ring so the ring still helps navigation
      // from a distance while the bubble signals "you can act here now".
      this.nodePrompts.set(node.id, new InteractionPrompt(this, node.position.x, node.position.y, '🔨', () => WorldScene.hud?.triggerAction()));
    });

    // Commons Bazaar cosmetics (core/shop/ShopEffects.ts) — drawn from the
    // owned list and redrawn whenever it changes.
    this.applyShopCosmetics(useGameStore.getState().shop.owned);
    let lastOwned = useGameStore.getState().shop.owned;
    useGameStore.subscribe(st => {
      if (st.shop.owned === lastOwned) return;
      lastOwned = st.shop.owned;
      this.applyShopCosmetics(st.shop.owned);
    });

    // NPCs
    this.npcs = [
      new NPCEntity({ id:'mira',    token:'NPC_NEIGHBOR',  name:'Mira',         position:{ x:27*TS+TS/2, y:53*TS+TS/2 }, proximity:38, dialogueKey:'mira_intro'    }, ()=>undefined),
      new NPCEntity({ id:'leo',     token:'NPC_NEIGHBOR',  name:'Leo',          position:{ x:26*TS+TS/2, y:31*TS+TS/2 }, proximity:38, dialogueKey:'leo_intro'     }, ()=>undefined),
      new NPCEntity({ id:'elena',   token:'NPC_ORGANIZER', name:'Elena',        position:{ x:24*TS+TS/2, y:11*TS+TS/2 }, proximity:38, dialogueKey:'elena_intro'   }, ()=>undefined),
      // M26 — three new NPCs, each placed near the construction node or
      // zone their dossier ties to (docs/planning/09-NPC-SOCIAL-NETWORK-
      // AND-RELATIONSHIPS.md): Sal near the South courtyard/kitchen, Marcus
      // by the Tool Library node, Higgins by the Land Trust node.
      new NPCEntity({ id:'sal',     token:'NPC_NEIGHBOR',  name:'Sal',          position:{ x:21*TS+TS/2, y:56*TS+TS/2 }, proximity:38, dialogueKey:'sal_intro'     }, ()=>undefined),
      new NPCEntity({ id:'marcus',  token:'NPC_ORGANIZER', name:'Marcus',       position:{ x:40*TS+TS/2, y:29*TS+TS/2 }, proximity:38, dialogueKey:'marcus_intro'  }, ()=>undefined),
      new NPCEntity({ id:'higgins', token:'NPC_NEIGHBOR',  name:'Mrs. Higgins', position:{ x:27*TS+TS/2, y:36*TS+TS/2 }, proximity:38, dialogueKey:'higgins_intro' }, ()=>undefined),
    ];
    const npcFrame: Record<string, number> = { mira:0, leo:1, elena:2, sal:3, marcus:4, higgins:5 };
    this.npcs.forEach(npc => {
      const img = this.add.image(npc.position.x, npc.position.y, 'npcs', npcFrame[npc.id] ?? 0);
      img.setDepth(5);
      this.npcSprites.set(npc.id, img);
      // M21 §5 — soft drop-shadow ellipse under each NPC (below the sprite's depth 5)
      const shadow = this.add.ellipse(npc.position.x, npc.position.y + 6, 12, 5, 0x000000, 0.3).setDepth(4.5);
      this.npcShadows.set(npc.id, shadow);
      // M21 §7 — proximity bounce-bubble
      this.npcPrompts.set(npc.id, new InteractionPrompt(this, npc.position.x, npc.position.y, '💬', () => WorldScene.hud?.triggerAction()));
    });

    // Fetch daily gossip and inject into NPC dialogue trees
    void fetchDailyGossip(useGameStore.getState().meta.day).then(gossipMap => {
      this.npcs.forEach(npc => {
        const line = gossipMap[npc.id];
        if (line) npc.setGossip(line);
      });
    });

    // Zone labels
    const lStyle = { fontFamily: 'monospace', fontSize: '7px', color: '#555577', alpha: 0.6 };
    this.add.text(COLS/2*TS, 1*TS+4,  '— NORTH — TRANSIT HUB —', lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 23*TS+4, '— CENTRAL PLAZA —',       lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 44*TS+4, '— SOUTH QUARTER —',       lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(55*TS, 20*TS,       '— EAST CANAL —',          lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 66*TS+4, '— SOUTH SOLAR QUARTER —', lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);

    // Courier Rush Cargo Bike Portal (Glowing cyan circle)
    this.bikeMarker = this.add.graphics();
    this.bikeMarker.fillStyle(0x38bdf8, 0.35);
    this.bikeMarker.fillCircle(this.bikePortal.x, this.bikePortal.y, 14);
    this.bikeMarker.lineStyle(2, 0x38bdf8, 0.85);
    this.bikeMarker.strokeCircle(this.bikePortal.x, this.bikePortal.y, 14);
    this.bikeMarker.setDepth(4);
    this.add.text(this.bikePortal.x, this.bikePortal.y - 18, '🚲 Courier Rush', {
      fontSize: '6px',
      color: '#38bdf8',
      backgroundColor: 'rgba(15,23,42,0.7)',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(4);
    this.bikePrompt = new InteractionPrompt(this, this.bikePortal.x, this.bikePortal.y, '🚲', () => WorldScene.hud?.triggerAction());

    // M27 — the 4 new minigame portals, same glowing-circle + label + bounce
    // prompt treatment as the Courier Rush bike portal above.
    this.minigamePortals.forEach(portal => {
      const marker = this.add.graphics();
      marker.fillStyle(portal.color, 0.35);
      marker.fillCircle(portal.position.x, portal.position.y, 14);
      marker.lineStyle(2, portal.color, 0.85);
      marker.strokeCircle(portal.position.x, portal.position.y, 14);
      marker.setDepth(4);
      const colorHex = `#${portal.color.toString(16).padStart(6, '0')}`;
      this.add.text(portal.position.x, portal.position.y - 18, `${portal.emoji} ${portal.label}`, {
        fontSize: '6px',
        color: colorHex,
        backgroundColor: 'rgba(15,23,42,0.7)',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 1).setDepth(4);
      this.minigamePortalPrompts.set(portal.id, new InteractionPrompt(this, portal.position.x, portal.position.y, portal.emoji, () => WorldScene.hud?.triggerAction()));
    });

    // Subscribe to crisis state to spawn/remove division flyers
    useGameStore.subscribe((state) => {
      const crisis = state.crisisState;
      const id = crisis.activeCrisisId;
      const isDivision = id != null && (
        id.includes('division') || id.includes('agitation')
      );
      if (isDivision && !this.divisionCrisisActive) {
        this.divisionCrisisActive = true;
        this.spawnFlyers();
      } else if (!isDivision && this.divisionCrisisActive) {
        this.divisionCrisisActive = false;
        this.removeAllFlyers();
      }
    });

    // Camera — M21 §1: viewport-independent zoom so the camera always frames
    // a fixed 12×10 tile count regardless of the player's window/monitor
    // size (Scale.RESIZE otherwise lets the effective FOV in tiles balloon
    // on wide desktop monitors — the actual "Ant Farm" root cause, not the
    // zoom API). The startFollow lerp (0.1, 0.1) already matched the spec's
    // own recommendation and is unchanged.
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(computeViewportZoom(this.scale.width, this.scale.height, TS));
    // after create() finishes, so text made later in create() is included
    this.time.delayedCall(0, () => this.sharpenWorldText());
    this.cameras.main.setDeadzone(16, 16);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#1a2c18');
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setZoom(computeViewportZoom(gameSize.width, gameSize.height, TS));
      this.sharpenWorldText();
      this.ambientLight?.resize(gameSize.width, gameSize.height);
    });

    // Rebuild the tileset whenever a skin manifest's real data is applied —
    // same "recolor without a scene restart" mechanism switchSkin() already
    // uses for HUD colors (Test 21.2). M28: keyed on `skinRevision`, not
    // `activeSkin`, because on first boot the active skin's *id* never
    // changes (it's already the default) even though its real palette data
    // only becomes available once the manifest fetch resolves — see
    // ThemeManager.activateDefaultSkin()'s doc comment for the full bug.
    this.lastSkinRevision = useGameStore.getState().meta.skinRevision;
    useGameStore.subscribe((state) => {
      if (state.meta.skinRevision !== this.lastSkinRevision) {
        this.lastSkinRevision = state.meta.skinRevision;
        void this.applyActiveRenderer();
      }
    });

    // Input
    inputManager.init(this);
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // M41 — EPIC-34 §1. Fired by InteriorScene.ts's exitInterior() (or, as
    // of M44, RegionScene.ts's returnHome()) via
    // this.scene.wake('WorldScene', data) — restores the player at the
    // exact tile they left from. Both scenes' wake payloads satisfy the
    // same minimal SceneReturnData shape (see its own comment below).
    this.events.on(Phaser.Scenes.Events.WAKE, (_sys: unknown, data: SceneReturnData) => this.onWakeFromInterior(data));
    // M46 — EPIC-35 §1. Registers on create() (fresh every time WorldScene
    // wakes back up too, since wake doesn't re-run create() — see below).
    WorldScene.setActiveTravelHandler(id => this.travelToRegionScene(id));
    this.events.on(Phaser.Scenes.Events.WAKE, () => WorldScene.setActiveTravelHandler(id => this.travelToRegionScene(id)));

    this.thumbstickGraphic = this.add.graphics();
    this.thumbstickGraphic.setScrollFactor(0);
    this.thumbstickGraphic.setDepth(100);

    // Resilience visual tier — apply initial state and subscribe to changes.
    // M21 §4: also swap the small set of street-front world-dressing props
    // (boarded shopfronts / market stalls / flower planters), layered
    // independently from these CSS filter classes, which stay exactly as-is.
    this.dressing = new WorldDressingRenderer(this);
    this.lastResilienceScore = useGameStore.getState().commons.resilienceScore;
    this.dressing.applyResilienceTier(this.lastResilienceScore);
    this.dressing.updateWorldDressing(this.lastResilienceScore);
    useGameStore.subscribe((state) => {
      // M28: guarded on the score actually changing — this subscription has
      // no selector, so without the guard applyResilienceTier()'s
      // classList.remove/add reran on every unrelated store mutation (day
      // tick, quest, spend, ...), which could restart the resilience-tier
      // CSS filter/animation and read as flicker even when the tier itself
      // never changed.
      if (state.commons.resilienceScore === this.lastResilienceScore) return;
      this.lastResilienceScore = state.commons.resilienceScore;
      this.dressing.applyResilienceTier(state.commons.resilienceScore);
      this.dressing.updateWorldDressing(state.commons.resilienceScore);
    });

    // M41 — EPIC-34 §1/§2. Interior props (Pip's Courier Room, Community
    // Kitchen, Town Assembly Hall) now render inside the real isolated
    // InteriorScene on entry, not painted onto the shared exterior tilemap
    // (see InteriorScene.ts's renderProps() — the M21 §3 mechanism this
    // replaced). Door prompts for every Common Ground interior — M45 added
    // a second region with its own interior (the Scrapyard Depot), so this
    // now filters by homeRegion rather than rendering every InteriorId.
    ALL_INTERIOR_IDS.filter(id => INTERIORS[id].homeRegion === 'REGION_COMMON_GROUND').forEach(id => {
      const def = INTERIORS[id];
      const px = def.doorTile.x * TS + TS / 2, py = def.doorTile.y * TS + TS / 2;
      this.interiorDoorPrompts.set(id, new InteractionPrompt(this, px, py, '🚪', () => WorldScene.hud?.triggerAction()));
    });

    // M44 — EPIC-35 §3. The rail platform's travel node.
    this.travelNodePrompt = new InteractionPrompt(
      this, WorldScene.TRAVEL_NODE.x, WorldScene.TRAVEL_NODE.y, '🚉', () => WorldScene.hud?.triggerAction(),
    );

    // M32 §3 — outdoor decoration (trees/bushes/benches/fences/parked
    // vehicles), independent of and additive to updateWorldDressing()'s
    // resilience-tier swap below — this layer never changes with score.
    this.dressing.renderOutdoorDressing();

    // M38 §2 — deterministic material scavenging pickups, skipping any the
    // player already collected on a prior visit/session.
    this.scavenge = new ScavengePickupRenderer(this, () => WorldScene.hud?.triggerAction());
    this.cookbook = new CookbookPickupRenderer(this, () => WorldScene.hud?.triggerAction());
    this.scavenge.render();
    this.cookbook.render();

    // M21 §5 — soft drop-shadow ellipse under the player
    this.playerShadow = this.add.ellipse(sprite.x, sprite.y + 6, 12, 5, 0x000000, 0.3).setDepth(4.5);

    // Scraps the cat
    this.scraps = new ScrapsEntity(this, 160, 53 * 16);

    // Pigeons in Central Plaza (4–6 birds)
    const pigeonBounds = new Phaser.Geom.Rectangle(9 * TS, 23 * TS, 29 * TS, 17 * TS);
    const pigeonCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pigeonCount; i++) {
      const px = pigeonBounds.x + Math.random() * pigeonBounds.width;
      const py = pigeonBounds.y + Math.random() * pigeonBounds.height;
      this.pigeons.push(new PigeonEntity(this, px, py, pigeonBounds));
    }

    // M34 §2 — EPIC-31. Background pedestrians, spread across 5 outdoor
    // zones so every zone reads as populated (not just Central Plaza, which
    // already gets pigeons). 3 per zone = 15 total, well above the 6 named
    // NPCs per the doc's own "greater numbers" ask, while staying an order
    // of magnitude below anything that would need real profiling — each is
    // a single plain Image + Ellipse with no physics body and a cheap O(1)
    // per-frame tick, the same cost class as the pigeons already proven fine
    // here since M23.
    const pedestrianZones: Phaser.Geom.Rectangle[] = [
      new Phaser.Geom.Rectangle(4 * TS, 3 * TS, 42 * TS, 11 * TS),   // North Transit Hub
      new Phaser.Geom.Rectangle(9 * TS, 23 * TS, 29 * TS, 17 * TS),  // Central Plaza (shared with pigeons)
      new Phaser.Geom.Rectangle(15 * TS, 46 * TS, 17 * TS, 14 * TS), // South Quarter courtyard
      new Phaser.Geom.Rectangle(53 * TS, 6 * TS, 8 * TS, 24 * TS),   // East Canal walkway
      new Phaser.Geom.Rectangle(6 * TS, 67 * TS, 51 * TS, 8 * TS),   // South Solar Quarter plaza
    ];
    pedestrianZones.forEach((bounds, zoneIdx) => {
      for (let i = 0; i < 3; i++) {
        let px = 0, py = 0, placed = false;
        // A handful of retries so a spawn point that lands inside a
        // building (the rectangles above are zone bounding boxes, not
        // exact walkable footprints) doesn't get stuck there for the
        // whole session — falls back to the zone's own bounds if none
        // land walkable, same "don't loop forever" discipline as
        // NPCEntity.tick()'s own bounce-back.
        for (let attempt = 0; attempt < 6 && !placed; attempt++) {
          px = bounds.x + Math.random() * bounds.width;
          py = bounds.y + Math.random() * bounds.height;
          if (this.isWalkableWorldPos(px, py)) placed = true;
        }
        const frame = (zoneIdx * 3 + i) % 6;
        this.pedestrians.push(new PedestrianEntity(this, px, py, frame, bounds));
      }
    });

    // Day/night tint + streetlamps (depth 90), and the frost/rain overlay +
    // raindrop pool (depths 91/92, above the day/night tint so the two
    // compose instead of one CSS filter clobbering the other) — see
    // DayNightSystem.ts/WeatherRenderer.ts's own doc comments.
    const screenW = this.scale.width, screenH = this.scale.height;
    this.dayNight = new DayNightSystem(this);
    this.weather = new WeatherRenderer(this);

    // M21 §5 — ambient warm-light "juice" layer: a separate multiply-blended
    // HTML canvas above the Phaser canvas (not a second CSS `filter:` rule —
    // filters on the same element don't compose, same lesson M10's
    // frost/rain overlays already applied).
    const gameContainerEl = document.getElementById('game-container');
    if (gameContainerEl) {
      this.ambientLight = new AmbientLightLayer(gameContainerEl);
      this.ambientLight.resize(screenW, screenH);
    }

    this.weather.update(weatherTier(useGameStore.getState().pulseState?.multipliers.heat ?? 1.0));
    useGameStore.subscribe((state) => {
      this.weather.update(weatherTier(state.pulseState?.multipliers.heat ?? 1.0));
    });

    // Track day advances for day/night cycle
    this.prevDay = useGameStore.getState().meta.day;
    useGameStore.subscribe((state) => {
      if (state.meta.day !== this.prevDay) {
        this.ticksSinceDay = 0;
        this.prevDay = state.meta.day;
        // Bugfix: advanceDay() (core/state/actions.ts) only ticks stats —
        // it's a headless store function with no Phaser access — and left
        // the player standing wherever they were when the day ended. "End
        // Day" is framed to the player as going to sleep, so send them to
        // their rented flat's door on the same tick the day actually
        // advances. Runs unconditionally (safe even while this scene is
        // asleep — it's just a transform write, picked up next wake).
        this.movePlayerHomeOnDayEnd(state.housing.currentFlatId);
      }
    });
  }

  /** See the day-advance subscription above for why this exists. No-ops
   *  when the player has no flat (currentFlatId === null) — that's a real,
   *  valid "no fixed home" state, not a bug. */
  private movePlayerHomeOnDayEnd(currentFlatId: string | null): void {
    const option = getHousingOption(currentFlatId);
    if (!option) return;
    const def = INTERIORS[option.buildingInteriorId as InteriorId];
    if (!def || def.homeRegion !== 'REGION_COMMON_GROUND') return;
    const px = def.doorTile.x * TS + TS / 2, py = def.doorTile.y * TS + TS / 2;
    this.player.getSprite().setPosition(px, py);
    this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
  }

  /**
   * M30 — resolves whichever renderer the active skin's manifest calls for
   * (DEFAULT_RENDERER for all 5 pre-M30 palette-only skins, a dynamically
   * loaded SkinRenderer for a hi-fi one) and redraws the tileset/player/NPC
   * textures with it. Called every time skinRevision bumps (boot + every
   * switch), same trigger the old palette-only tileset-rebuild used.
   *
   * A failed import/load degrades to DEFAULT_RENDERER and logs — a broken
   * hi-fi renderer never leaves the world blank or crashed, just plain.
   */
  private async applyActiveRenderer(): Promise<void> {
    const skinId = getActiveSkinId();
    const manifest = getActiveManifest();
    let renderer: SkinRenderer = DEFAULT_RENDERER;

    if (manifest?.rendererUrl) {
      const cached = this.rendererCache.get(skinId);
      if (cached) {
        renderer = cached;
      } else {
        try {
          renderer = await SkinRendererLoader.loadRemoteSkinRenderer(manifest.rendererUrl);
          this.rendererCache.set(skinId, renderer);
        } catch (err) {
          console.error(`Failed to load hi-fi skin renderer for "${skinId}" — falling back to the default look.`, err);
          renderer = DEFAULT_RENDERER;
        }
      }
    }

    const palette = getActiveWorldPalette();
    renderer.createTilesetTexture(this, palette);
    renderer.createPlayerTexture(this, useGameStore.getState().player.appearance);
    renderer.createNPCTextures(this);
  }

  update(_time: number, delta: number): void {
    inputManager.update();

    // Start BGM on first player movement
    if (!this.bgmStarted) {
      const dir = inputManager.getDirection();
      if (dir.dx !== 0 || dir.dy !== 0) {
        this.bgmStarted = true;
        startBGMLoop();
      }
    }

    this.player.update(delta);

    // Day/night cycle: advance ticks, update camera tint every ~500ms
    this.ticksSinceDay += delta;
    this.dayNight.update(this.ticksSinceDay);
    this.weather.tick(delta, this.scale.width, this.scale.height);

    // M28: computed exactly once per frame and threaded through to
    // handleInteractions() below — Phaser's JustDown() clears its internal
    // flag the first time it's read, so calling it a second time later in
    // the same frame (as handleInteractions() used to, independently) would
    // always see it as already-consumed. That silently made the [E] key
    // dead for every world interaction (Talk/Build/Town Hall/flyers/bike/
    // minigame portals) — only Space ever worked.
    const ePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
    this.scraps.update(this.player.x, this.player.y, delta);
    this.playerCap?.setPosition(this.player.x, this.player.y - 9);

    // M34 §1 — EPIC-31. tick() advances wander state, update() re-derives
    // talkability from the (possibly now-moved) live position, then the
    // Image/shadow/InteractionPrompt this scene owns are synced to match —
    // updateShadowsAndLight() already reads the sprite's own x/y for the
    // shadow, so setting the sprite's position here is enough to carry the
    // shadow along too, no separate shadow-sync call needed.
    this.npcs.forEach(npc => {
      npc.tick(delta, (x, y) => this.isWalkableWorldPos(x, y));
      npc.update(this.player.x, this.player.y);
      const sprite = this.npcSprites.get(npc.id);
      if (sprite) sprite.setPosition(npc.x, npc.y);
      this.npcPrompts.get(npc.id)?.setPosition(npc.x, npc.y);
    });
    this.pigeons.forEach(p => p.update(this.player.x, this.player.y, delta));
    this.pedestrians.forEach(p => p.update(delta, (x, y) => this.isWalkableWorldPos(x, y)));
    // Moved here (was before the npc/pedestrian tick block) so the drop-
    // shadow sync reads each entity's just-updated position, not last
    // frame's — see M34 §1's own doc comment above.
    this.updateShadowsAndLight();
    this.syncCompletedBuilds();
    this.updateZone();
    this.checkCrisis();
    this.checkAssembly();
    this.checkSafeHaven();
    this.handleInteractions(ePressed);
    this.drawThumbstick();
  }

  private checkCrisis(): void {
    if (this.crisisOpen) return;
    const { activeCrisisId } = useGameStore.getState().crisisState;
    if (!activeCrisisId) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.crisisOpen = true;
    new CrisisWireModal(uiRoot, activeCrisisId, () => { this.crisisOpen = false; });
  }

  private checkAssembly(): void {
    if (this.assemblyOpen || this.crisisOpen || this.dialogueOpen || this.buildOpen) return;
    if (!TownHallAssembly.shouldOpen()) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.assemblyOpen = true;
    new TownHallAssembly(uiRoot, () => { this.assemblyOpen = false; });
  }

  private checkSafeHaven(): void {
    if (this.safeHavenShown || this.safeHavenOpen) return;
    const st = useGameStore.getState();
    if (!st.commons.safeHavenUnlocked || st.economy.endingSeen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.safeHavenOpen = true;
    this.safeHavenShown = true;
    new SafeHavenBanner(uiRoot, () => { this.safeHavenOpen = false; });
  }

  private spawnFlyers(): void {
    // 3–5 flyers near alley tiles around south courtyard
    const positions = [
      { x: 14 * TS, y: 50 * TS }, { x: 7 * TS,  y: 47 * TS },
      { x: 34 * TS, y: 48 * TS }, { x: 28 * TS, y: 62 * TS },
      { x: 11 * TS, y: 44 * TS },
    ];
    positions.slice(0, 3 + Math.floor(Math.random() * 3)).forEach(pos => {
      const sprite = this.add.rectangle(pos.x, pos.y, 10, 7, 0xeecc22).setDepth(3);
      this.flyers.push({ sprite, x: pos.x, y: pos.y });
    });
  }

  private removeAllFlyers(): void {
    this.flyers.forEach(f => f.sprite.destroy());
    this.flyers = [];
  }

  private updateZone(): void {
    const px = this.player.x;
    const py = this.player.y;
    let zone = '';
    if (px > 50 * TS) {
      zone = 'East Canal';
    } else if (py < 20 * TS) {
      zone = 'North — Transit Hub';
    } else if (py > 65 * TS) {
      zone = 'South Solar Quarter';
    } else if (py > 44 * TS) {
      zone = 'South Quarter';
    } else if (py > 23 * TS && py < 40 * TS) {
      zone = 'Central Plaza';
    }
    WorldScene.hud?.setZone(zone);
    // M35 — EPIC-31 §1/§2. Real per-frame zone state, not a self-attested
    // "I visited it" claim — the exact reach-zone verification this
    // milestone's own doc calls for.
    checkZoneWorldQuestProgress(zone);
  }

  private handleInteractions(ePressed: boolean): void {
    if (this.crisisOpen) { WorldScene.hud?.hideAction(); return; }

    // M21 §7 — bounce-bubble proximity prompts (Test 21.6): appear as soon as
    // the player enters each interactable's own radius, not just the single
    // nearest one used for the actual [E] action below.
    this.npcs.forEach(npc => {
      const prompt = this.npcPrompts.get(npc.id);
      if (!prompt) return;
      if (npc.isActive) prompt.show(); else prompt.hide();
    });
    this.constructionNodes.forEach(node => {
      const prompt = this.nodePrompts.get(node.id);
      if (!prompt) return;
      const dx = this.player.x - node.position.x, dy = this.player.y - node.position.y;
      if (Math.hypot(dx, dy) <= 42) prompt.show(); else prompt.hide();
    });
    {
      const dx = this.player.x - this.bikePortal.x, dy = this.player.y - this.bikePortal.y;
      if (Math.hypot(dx, dy) <= 38) this.bikePrompt.show(); else this.bikePrompt.hide();
    }
    this.minigamePortals.forEach(portal => {
      const prompt = this.minigamePortalPrompts.get(portal.id);
      if (!prompt) return;
      const dx = this.player.x - portal.position.x, dy = this.player.y - portal.position.y;
      if (Math.hypot(dx, dy) <= 38) prompt.show(); else prompt.hide();
    });
    // M38 §2 — scavenge-point proximity prompts
    this.scavenge.entries.forEach(entry => {
      const dx = this.player.x - (entry.data.x * TS + TS / 2), dy = this.player.y - (entry.data.y * TS + TS / 2);
      if (Math.hypot(dx, dy) <= 34) entry.prompt.show(); else entry.prompt.hide();
    });
    // M39 §2 — cookbook-pickup proximity prompts
    this.cookbook.entries.forEach(entry => {
      const dx = this.player.x - (entry.data.x * TS + TS / 2), dy = this.player.y - (entry.data.y * TS + TS / 2);
      if (Math.hypot(dx, dy) <= 34) entry.prompt.show(); else entry.prompt.hide();
    });
    // M41 — EPIC-34 §1/§2 — interior-door proximity prompts
    ALL_INTERIOR_IDS.forEach(id => {
      const def = INTERIORS[id];
      const prompt = this.interiorDoorPrompts.get(id);
      if (!prompt) return;
      const dx = this.player.x - (def.doorTile.x * TS + TS / 2), dy = this.player.y - (def.doorTile.y * TS + TS / 2);
      if (Math.hypot(dx, dy) <= 24) prompt.show(); else prompt.hide();
    });
    // M44 — EPIC-35 §3 — travel-node proximity prompt
    {
      const dx = this.player.x - WorldScene.TRAVEL_NODE.x, dy = this.player.y - WorldScene.TRAVEL_NODE.y;
      if (Math.hypot(dx, dy) <= 32) this.travelNodePrompt.show(); else this.travelNodePrompt.hide();
    }

    const nearbyNpc = this.npcs.find(npc => npc.isActive);
    const nearbyBuild = this.constructionNodes.find(node => {
      const dx = this.player.x - node.position.x, dy = this.player.y - node.position.y;
      return Math.hypot(dx, dy) <= 42;
    });
    const th = WorldScene.TOWN_HALL;
    const nearTownHall = Math.hypot(this.player.x - th.x, this.player.y - th.y) <= 48;

    // Scraps feed (only when player has cash)
    const scrapsDist = Math.hypot(this.player.x - this.scraps['sprite']['x'], this.player.y - this.scraps['sprite']['y']);
    const scrapsInRange = scrapsDist < 48;

    // Nearest flyer
    const nearbyFlyer = this.flyers.find(f =>
      Math.hypot(this.player.x - f.x, this.player.y - f.y) <= 32,
    );

    // M38 §2 — nearest uncollected scavenge point
    const nearScavenge = this.scavenge.entries.find(entry => {
      const dx = this.player.x - (entry.data.x * TS + TS / 2), dy = this.player.y - (entry.data.y * TS + TS / 2);
      return Math.hypot(dx, dy) <= 34;
    });

    // M39 §2 — nearest uncollected cookbook pickup
    const nearCookbook = this.cookbook.entries.find(entry => {
      const dx = this.player.x - (entry.data.x * TS + TS / 2), dy = this.player.y - (entry.data.y * TS + TS / 2);
      return Math.hypot(dx, dy) <= 34;
    });

    // M41 — EPIC-34 §1/§2 — nearest interior door in range. Filtered to
    // this region (M45) — without it, the Scrapyard Depot's door tile
    // coordinates (in the Industrial Outskirts' own space) could collide
    // with an unrelated walkable Common Ground tile at the same numeric
    // coordinate.
    const nearInteriorDoor: InteriorDefinition | undefined = ALL_INTERIOR_IDS
      .map(id => INTERIORS[id])
      .filter(def => def.homeRegion === 'REGION_COMMON_GROUND')
      .find(def => {
        const dx = this.player.x - (def.doorTile.x * TS + TS / 2), dy = this.player.y - (def.doorTile.y * TS + TS / 2);
        return Math.hypot(dx, dy) <= 24;
      });

    // M44 — EPIC-35 §3 — travel node in range
    const nearTravelNode = Math.hypot(this.player.x - WorldScene.TRAVEL_NODE.x, this.player.y - WorldScene.TRAVEL_NODE.y) <= 32;

    // Courier Rush bike portal interaction
    const nearBike = Math.hypot(this.player.x - this.bikePortal.x, this.player.y - this.bikePortal.y) <= 38;
    // M27 — nearest of the 4 new minigame portals, same radius as the bike
    const nearMinigamePortal = this.minigamePortals.find(portal =>
      Math.hypot(this.player.x - portal.position.x, this.player.y - portal.position.y) <= 38,
    );

    if (!this.dialogueOpen && !this.buildOpen && !this.historyOpen && !this.assemblyOpen && !this.minigameOpen) {
      const pressed = ePressed || Phaser.Input.Keyboard.JustDown(this.spaceKey);
      if (pressed) {
        if (nearbyFlyer) {
          this.tearDownFlyer(nearbyFlyer);
        } else if (nearScavenge) {
          this.scavenge.collect(nearScavenge);
        } else if (nearCookbook) {
          this.cookbook.collect(nearCookbook);
        } else if (nearInteriorDoor) {
          this.enterInterior(nearInteriorDoor);
        } else if (nearTravelNode) {
          this.travelToRegionScene('REGION_INDUSTRIAL_OUTSKIRTS');
        } else if (nearBike) {
          this.launchCourierRush();
        } else if (nearMinigamePortal) {
          this.launchWorldMinigame(nearMinigamePortal.id);
        } else if (scrapsInRange) {
          this.feedScraps();
        } else if (nearTownHall) {
          this.openHistory();
        } else if (nearbyBuild) {
          this.openBuild(nearbyBuild);
        } else if (nearbyNpc) {
          this.openTalk(nearbyNpc);
        }
      }
    }

    if (this.dialogueOpen || this.buildOpen || this.historyOpen || this.assemblyOpen || this.minigameOpen) {
      WorldScene.hud?.hideAction();
    } else if (nearbyFlyer) {
      WorldScene.hud?.setAction('Tear down flyer ✊', () => this.tearDownFlyer(nearbyFlyer));
    } else if (nearScavenge) {
      WorldScene.hud?.setAction('Collect ♻️', () => this.scavenge.collect(nearScavenge));
    } else if (nearCookbook) {
      WorldScene.hud?.setAction('Read cookbook 📖', () => this.cookbook.collect(nearCookbook));
    } else if (nearInteriorDoor) {
      WorldScene.hud?.setAction(`Enter ${nearInteriorDoor.label} 🚪`, () => this.enterInterior(nearInteriorDoor));
    } else if (nearTravelNode) {
      const unlocked = isRegionUnlocked(REGIONS.REGION_INDUSTRIAL_OUTSKIRTS.unlockRule, {
        trust: useGameStore.getState().player.socialTrust,
        resilienceScore: useGameStore.getState().commons.resilienceScore,
        completedQuestIds: useGameStore.getState().quests.filter(q => q.completedOnDay !== null).map(q => q.questId),
      });
      WorldScene.hud?.setAction(
        unlocked ? 'Take the train 🚉' : 'Locked 🚉 (needs 20 trust)',
        () => this.travelToRegionScene('REGION_INDUSTRIAL_OUTSKIRTS'),
      );
    } else if (nearBike) {
      WorldScene.hud?.setAction(`Deliver Soup (Courier Rush) 🚲 · ⚡${MINIGAME_LIMITS.energyCost}`, () => this.launchCourierRush());
    } else if (nearMinigamePortal) {
      WorldScene.hud?.setAction(`${nearMinigamePortal.label} ${nearMinigamePortal.emoji} · ⚡${MINIGAME_LIMITS.energyCost}`, () => this.launchWorldMinigame(nearMinigamePortal.id));
    } else if (scrapsInRange) {
      WorldScene.hud?.setAction('Feed Scraps 🐟 · $1', () => this.feedScraps());
    } else if (nearTownHall) {
      WorldScene.hud?.setAction('Town Hall 📜', () => this.openHistory());
    } else if (nearbyBuild) {
      WorldScene.hud?.setAction('Build 🔨', () => this.openBuild(nearbyBuild));
    } else if (nearbyNpc) {
      WorldScene.hud?.setAction('Talk 💬', () => this.openTalk(nearbyNpc));
    } else {
      WorldScene.hud?.hideAction();
    }
  }

  private launchCourierRush(): void {
    if (this.minigameOpen) return;
    this.minigameOpen = true;
    WorldScene.hud?.hideAction();

    this.startMinigame('courier-rush');
  }

  /** M27 — shared launcher for the 4 new minigame portals (courier-rush keeps
   * its own dedicated method above since it predates this generic one). */
  private launchWorldMinigame(id: string): void {
    if (this.minigameOpen) return;
    this.minigameOpen = true;
    WorldScene.hud?.hideAction();

    this.startMinigame(id);
  }

  /** Every run costs energy (charged at launch by MinigameLoader); a
   *  refused launch explains why instead of silently doing nothing. */
  private startMinigame(id: string): void {
    MinigameLoader.launchMinigame(id, {
      onClose: () => {
        this.minigameOpen = false;
      },
    }).catch((err: unknown) => {
      this.minigameOpen = false;
      if (err instanceof MinigameTooTiredError) {
        this.floatText(`😮‍💨 Too tired — needs ⚡${MINIGAME_LIMITS.energyCost}`, '#ffb4a8');
      } else {
        console.error('[WorldScene] minigame failed to launch', err);
        this.floatText('⚠️ Could not start this game', '#ffb4a8');
      }
    });
  }

  /** World text is drawn at 1× and then scaled up by the camera zoom
   *  (~3–4×), which made every label blurry and oversized (audit §3.7).
   *  Rendering text at the zoomed resolution keeps it crisp. */
  private textResolution(): number {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.min(8, Math.max(1, Math.ceil(this.cameras.main.zoom * dpr)));
  }

  private sharpenWorldText(): void {
    const res = this.textResolution();
    this.children.list.forEach(obj => {
      if (obj instanceof Phaser.GameObjects.Text) obj.setResolution(res);
    });
  }

  /** `${npcId}:${day}` — neighbours who already greeted the player today. */
  private greetedToday = new Set<string>();
  private shopDecorations: Phaser.GameObjects.Text[] = [];
  private playerCap: Phaser.GameObjects.Text | null = null;

  private applyShopCosmetics(owned: readonly string[]): void {
    this.shopDecorations.forEach(d => d.destroy());
    this.shopDecorations = facadeMarkers(owned).flatMap(f => {
      const node = this.constructionNodes.find(n => n.progressKey === f.node);
      if (!node) return [];
      return [this.add.text(node.position.x + 12, node.position.y - 10, f.marker, { fontSize: '10px' })
        .setOrigin(0.5).setDepth(5).setResolution(this.textResolution())];
    });
    this.playerCap?.destroy();
    this.playerCap = ownsEffect(owned, 'player-cap')
      ? this.add.text(this.player.x, this.player.y - 9, '🧢', { fontSize: '7px' }).setOrigin(0.5, 1).setDepth(11).setResolution(this.textResolution())
      : null;
  }

  /** Short floating feedback text above the player. */
  private floatText(text: string, color: string): void {
    const txt = this.add.text(this.player.x, this.player.y - 18, text, {
      fontSize: '7px', color, backgroundColor: '#1a1a24', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(20).setResolution(this.textResolution());
    this.tweens.add({
      targets: txt, y: txt.y - 24, alpha: 0, duration: 1400,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
  }

  private feedScraps(): void {
    const state = useGameStore.getState();
    if (state.economy.lastScrapsDay === state.meta.day) {
      this.floatText('🐱 Scraps is full — come back tomorrow', '#ffd27a');
      return;
    }
    if (!feedScraps()) {
      this.floatText("🐱 You can't afford a treat ($1)", '#ffd27a');
      return;
    }
    this.scraps.spawnHearts();
    this.floatText(`🐱 −${SCRAPS_STRESS_RELIEF}% stress`, '#88ff88');
  }

  private tearDownFlyer(flyer: FlyerObject): void {
    flyer.sprite.destroy();
    this.flyers = this.flyers.filter(f => f !== flyer);
    addTrust(5);
    spendEnergy(2);
    // Show brief confirmation
    const txt = this.add.text(flyer.x, flyer.y - 12, '✊ +5 Trust', {
      fontSize: '10px', color: '#88ff88', backgroundColor: '#1a2a1a', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(20);
    this.tweens.add({
      targets: txt, y: txt.y - 24, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
  }

  private openHistory(): void {
    if (this.historyOpen || this.dialogueOpen || this.buildOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.historyOpen = true;
    new HistoryModal(uiRoot, () => { this.historyOpen = false; WorldScene.hud?.hideAction(); });
  }

  private syncCompletedBuilds(): void {
    const state = useGameStore.getState();
    this.constructionNodes.forEach(node => {
      if (state.commons[node.progressKey] >= BUILD_COMPLETION_THRESHOLD && !this.completedIds.has(node.id)) {
        this.completedIds.add(node.id);
        const tx = Math.floor(node.position.x / TS), ty = Math.floor(node.position.y / TS);
        this.layer.putTileAt(T.BUILT, tx, ty);
        const g = this.nodeMarkers.get(node.id);
        if (g) { g.clear(); this.drawNodeMarker(g, node.position.x, node.position.y, true); }
      }
    });
  }

  private drawNodeMarker(g: Phaser.GameObjects.Graphics, x: number, y: number, done: boolean): void {
    const col = done ? 0x44cc88 : 0x5566ff;
    const ring = done ? 0x88ffbb : 0xaabbff;
    g.fillStyle(col, 0.8); g.fillCircle(x, y, 7);
    g.lineStyle(1.5, ring, 1); g.strokeCircle(x, y, 7);
  }

  private openBuild(node: ConstructionNodeData): void {
    if (this.buildOpen || this.dialogueOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.buildOpen = true;
    new ConstructionModal(uiRoot, node.progressKey, () => { this.buildOpen = false; WorldScene.hud?.hideAction(); });
  }

  private openTalk(npc: NPCEntity): void {
    if (this.dialogueOpen || this.buildOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.dialogueOpen = true;

    const day = useGameStore.getState().meta.day;
    // Commons Bazaar "Brass Doorbell Chime"
    if (ownsEffect(useGameStore.getState().shop.owned, 'dialogue-chime')) playDayChime();
    const dialogueKey = pickDialogueKey(npc.id, day);
    const baseTree = DIALOGUES[dialogueKey] ?? DIALOGUES['mira_intro'];
    const tree: typeof baseTree = { ...baseTree };

    const gossip = npc.gossipLine;
    if (gossip) {
      const gossipKey = `${dialogueKey}_rumor`;
      const startNode = tree[dialogueKey];
      if (startNode) {
        // Bugfix: this used to write to `npc.dialogueKey` (the NPC's day-1
        // intro key), so the gossip option only appeared on intro days.
        tree[dialogueKey] = {
          ...startNode,
          responses: [
            ...startNode.responses,
            { label: 'Heard anything lately?', next: gossipKey },
          ],
        };
      }
      tree[gossipKey] = {
        text: gossip,
        mood: 'tired',
        responses: [{ label: 'Good to know', next: null }],
      };
    }

    // Neighbours remember crisis choices and notice hunger/stress — once per
    // neighbour per day, so it reads as a greeting, not a nag.
    const memoryKey = `${npc.id}:${day}`;
    const memory = this.greetedToday.has(memoryKey) ? null : neighbourMemory(npc.id, useGameStore.getState());
    if (memory) this.greetedToday.add(memoryKey);
    const talk = withMemoryOpener(tree, dialogueKey, memory);

    const playerTrust = useGameStore.getState().player.socialTrust;
    new DialogueOverlay(
      uiRoot, talk.tree, talk.startKey, npc.name,
      () => {
        this.dialogueOpen = false;
        WorldScene.hud?.hideAction();
        // M35 — EPIC-31 §2. Fires on close, not open — "talked to this NPC"
        // means the player actually finished the conversation, not just
        // triggered the overlay and immediately escaped.
        checkTalkWorldQuestProgress(npc.id);
      },
      playerTrust,
      (recipeId) => learnRecipe(recipeId as RecipeId),
      (questId) => assignWorldQuest(questId as WorldQuestId),
    );
  }

  /** M41 — EPIC-34 §1/§2. Walking onto (or near) a DOOR tile that has a
   *  registered interior launches a real isolated `InteriorScene`, sleeping
   *  this scene rather than panning the camera over the same shared
   *  tilemap (the old M21 §1 mechanism this replaces — see
   *  InteriorProps.ts's `findInteriorByDoorTile()`). The player's exact
   *  tile position is captured as the return point, restored verbatim by
   *  `onWakeFromInterior()`. */
  private enterInterior(def: InteriorDefinition): void {
    if (this.dialogueOpen || this.buildOpen) return;
    const returnX = Math.floor(this.player.x / TS);
    const returnY = Math.floor(this.player.y / TS);
    const returnFacing = this.player.getFacing();
    WorldScene.hud?.hideAction();
    this.scene.sleep();
    this.scene.launch('InteriorScene', {
      interiorId: def.id, returnX, returnY, returnFacing, returnSceneKey: 'WorldScene',
    } satisfies InteriorSceneData);
  }

  /** M44 — EPIC-35 §2/§3. Literalizes the rail platform's previously-
   *  decorative flavor into a real travel action, reusing the exact same
   *  sleep/launch/wake/stop lifecycle `enterInterior()`/`InteriorScene.ts`
   *  already proved (EPIC-34/M41).
   *
   *  M46 — EPIC-35 §1/§2. Generalized from a single hardcoded destination
   *  (`travelToPlaceholderRegion()`) to any unlocked `RegionId`, so
   *  `WorldMapModal.ts` can drive it too, not just the rail-platform node.
   *  Un-unlocked regions are rejected here (the actual enforcement point),
   *  not just hidden in the UI. */
  private travelToRegionScene(targetRegionId: RegionId): boolean {
    if (this.dialogueOpen || this.buildOpen) return false;
    const state = useGameStore.getState();
    const target = REGIONS[targetRegionId];
    const unlocked = isRegionUnlocked(target.unlockRule, {
      trust: state.player.socialTrust,
      resilienceScore: state.commons.resilienceScore,
      completedQuestIds: state.quests.filter(q => q.completedOnDay !== null).map(q => q.questId),
    });
    if (!unlocked) return false;

    const returnX = Math.floor(this.player.x / TS);
    const returnY = Math.floor(this.player.y / TS);
    const returnFacing = this.player.getFacing();
    WorldScene.hud?.hideAction();
    travelToRegion(targetRegionId);
    this.scene.sleep();
    this.scene.launch('RegionScene', {
      regionId: targetRegionId, returnX, returnY, returnFacing,
    } satisfies RegionSceneData);
    return true;
  }

  private onWakeFromInterior(data: SceneReturnData): void {
    // Bugfix: `inputManager` is a module-level singleton shared by every
    // scene, and InteriorScene.create()/RegionScene.create() both call
    // inputManager.init(this) to bind its cursors/WASD keys to *their own*
    // input plugin. That rebinding is never undone — WorldScene.create()
    // only runs once at boot (scene.wake() doesn't re-run create()) — so
    // once the interior scene is scene.stop()'d, inputManager was left
    // holding Key objects tied to a now-destroyed input plugin, and
    // movement silently stopped working for the rest of the session.
    // Re-binding here on every wake fixes it without touching create().
    inputManager.init(this);
    const px = data.returnX * TS + TS / 2, py = data.returnY * TS + TS / 2;
    this.player.getSprite().setPosition(px, py);
    this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
  }

  /** M34 §1/§2 — EPIC-31. The lightweight bounds/wall-avoidance check both
   *  NPCEntity.tick() and PedestrianEntity.update() take as an injected
   *  callback, rather than either entity importing MapData/this scene
   *  directly — keeps NPCEntity Phaser-free and unit-testable, and keeps
   *  PedestrianEntity from needing to know anything about the tilemap. */
  private isWalkableWorldPos(px: number, py: number): boolean {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    const row = this.mapGrid[ty];
    if (!row || row[tx] === undefined) return false;
    return isWalkableTile(row[tx]);
  }

  /** M21 §5 — keeps drop-shadow ellipses under moving entities and redraws the
   * ambient warm-light layer each frame from the player's current screen
   * position plus any nearby lit doorway. Verified to compose (not fight)
   * with the day/night tint, resilience CSS filter, and weather overlay —
   * same three-independent-layers check M10's weather system already did —
   * because this canvas only ever paints inside its warm-gradient circles
   * and stays fully transparent (no `multiply` effect) everywhere else. */
  private updateShadowsAndLight(): void {
    this.playerShadow.setPosition(this.player.x, this.player.y + 6);
    this.npcs.forEach(npc => {
      const shadow = this.npcShadows.get(npc.id);
      const sprite = this.npcSprites.get(npc.id);
      if (shadow && sprite) shadow.setPosition(sprite.x, sprite.y + 6);
    });

    if (!this.ambientLight) return;
    const cam = this.cameras.main;
    const toScreen = (wx: number, wy: number) => ({
      x: (wx - cam.worldView.x) * cam.zoom,
      y: (wy - cam.worldView.y) * cam.zoom,
    });
    const lights = [{ ...toScreen(this.player.x, this.player.y), radius: 35 * cam.zoom }];
    for (const door of DOOR_TILES) {
      const wx = door.x * TS + TS / 2, wy = door.y * TS + TS / 2;
      if (wx < cam.worldView.x - TS || wx > cam.worldView.right + TS ||
          wy < cam.worldView.y - TS || wy > cam.worldView.bottom + TS) continue;
      lights.push({ ...toScreen(wx, wy), radius: 25 * cam.zoom });
    }
    this.ambientLight.render(lights);
  }

  private drawThumbstick(): void {
    this.thumbstickGraphic.clear();
    if (!inputManager.isUsingTouch()) return;
    const origin = inputManager.getThumbstickOrigin();
    if (!origin) return;
    const delta = inputManager.getThumbstickDelta();
    this.thumbstickGraphic.lineStyle(2, 0xffffff, 0.2);
    this.thumbstickGraphic.strokeCircle(origin.x, origin.y, 40);
    this.thumbstickGraphic.fillStyle(0xffffff, 0.4);
    this.thumbstickGraphic.fillCircle(origin.x + delta.x * 40, origin.y + delta.y * 40, 16);
  }
}
