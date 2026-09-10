# **System Architecture Specification**

**Project:** District: Common Ground

**Document:** System Architecture & Decoupled Engine Interfaces

**Revision:** 1.0 (Production-Ready)

## **1\. Architectural Philosophy: The Headless Simulation**

To allow visual skin switching (e.g., Solarpunk, Retro 8-bit Game Boy, Cozy Vector) without touching game logic, the engine strictly separates **Simulation State**, **Presentation (View)**, and **Input Control**.

┌────────────────────────────────────────────────────────────────────────┐  
│                        Simulation State Machine                         │  
│   (Resources, Trust, Class Profile, Commons Resilience, Crisis Queue)  │  
└───────────────────┬────────────────────────────────┬───────────────────┘  
                    │                                │  
                    ▼                                ▼  
     ┌─────────────────────────────┐  ┌─────────────────────────────┐  
     │      Tick / Game Loop       │  │      Crisis Pipeline        │  
     │  (Economy Math, Upkeep,     │  │  (News Ingestion, Branching │  
     │   Commons Resilience Buffs) │  │   Consequence Trees)        │  
     └──────────────┬──────────────┘  └──────────────┬──────────────┘  
                    │                                │  
                    └────────────────┬───────────────┘  
                                     │  
                                     ▼  
        ┌─────────────────────────────────────────────────────────┐  
        │            Abstract Skin Interface (Renderer API)        │  
        └───────┬────────────────────┬────────────────────┬───────┘  
                │                    │                    │  
                ▼                    ▼                    ▼  
     ┌──────────────────┐  ┌───────────────────┐  ┌────────────────┐  
     │ Skin Module A:   │  │ Skin Module B:    │  │ Skin Module C: │  
     │ Modern Solarpunk │  │ 8-Bit Game Boy    │  │ Cozy Vector    │  
     │ (Zelda 16-bit)   │  │ (Mono/4-Shade GB) │  │ (Flat Modern)  │  
     └──────────────────┘  └───────────────────┘  └────────────────┘

## **2\. Multi-Skin Decoupling Protocol**

### **2.1 Asset ID Abstraction**

The simulation logic references purely abstract entity IDs. No sprite filename or color hex code exists in the gameplay code.

// Abstract identity tokens used in simulation logic  
export type EntityToken \=  
  | 'HERO\_AVATAR'  
  | 'NPC\_ELDER\_COOK'  
  | 'NPC\_TENANT\_ORGANIZER'  
  | 'BUILDING\_COMMUNITY\_KITCHEN'  
  | 'BUILDING\_SOLAR\_ARRAY'  
  | 'BUILDING\_TOOL\_WORKSHOP'  
  | 'TILE\_ASPHALT\_CRACKED'  
  | 'TILE\_COBBLESTONE\_GARDEN';

### **2.2 Skin Manifest Contract (skin.manifest.json)**

Every theme pack implements this uniform manifest structure:

{  
  "skinId": "gb\_classic\_1989",  
  "version": "1.0.0",  
  "palette": {  
    "background": "\#0f380f",  
    "surface": "\#306230",  
    "accent": "\#8bac0f",  
    "text": "\#9bbc0f"  
  },  
  "assetMap": {  
    "HERO\_AVATAR": {  
      "atlasUrl": "/assets/skins/gb/hero\_sheet.json",  
      "frameRate": 8,  
      "tileSize": \[16, 16\]  
    },  
    "BUILDING\_COMMUNITY\_KITCHEN": {  
      "textureUrl": "/assets/skins/gb/kitchen.png",  
      "footprint": \[3, 2\]  
    }  
  },  
  "audioProfile": {  
    "sfxType": "chiptune\_pulse\_noise",  
    "bgmType": "square\_wave\_arpeggio"  
  }  
}

## **3\. Core Engine Pipeline & Data Flow**

### **3.1 Global State Store (useGameStore)**

State is immutable, persistent, and decoupled from canvas frame rendering:

export interface GameState {  
  meta: {  
    day: number;  
    tick: number;  
    activeSkin: 'solarpunk' | 'retro\_gb' | 'cozy\_vector';  
  };  
  player: {  
    classRole: 'precarious' | 'worker' | 'investor';  
    cash: number;  
    energy: number;  
    maxEnergy: number;  
    socialTrust: number;  
    stressLevel: number; // 0 to 100  
    position: { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' };  
  };  
  commons: {  
    resilienceScore: number; // 0 to 100  
    solarGridProgress: number;  
    kitchenProgress: number;  
    legalFundProgress: number;  
  };  
  crisisState: {  
    activeCrisisId: string | null;  
    pendingQueue: string\[\];  
    historyLog: Array\<{  
      day: number;  
      crisisId: string;  
      choiceSelected: 'authoritarian' | 'democratic';  
      consequenceSummary: string;  
    }\>;  
  };  
}

### **3.2 Dynamic Event Pipeline**

\[Event Trigger (Step into Hall / New Day)\]  
                   │  
                   ▼  
       \[Query Active Crisis Queue\]  
                   │  
                   ▼  
     \[Spawn Proximity NPC / Banner Alert\]  
                   │  
                   ▼  
      \[Player Inputs Resolution Choice\]  
                   │  
       ┌───────────┴───────────┐  
       ▼                       ▼  
 \[Authoritarian Path\]     \[Democratic Path\]  
 \- Short-term cash        \- Upfront stamina cost  
 \- Resilience: \-15%       \- Resilience: \+20%  
 \- Trust: \-20             \- Trust: \+25  
 \- World: Desaturates     \- World: Blooms & Unlocks Tiles  
