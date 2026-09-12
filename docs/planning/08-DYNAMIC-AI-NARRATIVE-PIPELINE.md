# 08 — Dynamic AI Narrative Pipeline & Living Dialogue Specification

**Authored by:** Narrative Designer 📖, Engineering Backend Architect 🛠️ & Game Designer 🎮  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`03-NEWS-TO-CRISIS-PIPELINE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md)  

---

## 1. Executive Summary & Design Vision

### The Problem: Repetitive Simulation Fatigue
Traditional simulation and RPG games suffer from the **"NPC Parrot Syndrome"**: once a player has played for a few days, NPC dialogue feels canned, crisis events repeat identically, and the illusion of a living, breathing neighborhood breaks down.

### The Solution: The "District Story Engine" (Free AI + Guardrailed Generation)
By integrating a **free, open-weight AI model pipeline** into the District: Common Ground stack, we transform the game from a static script into an **infinite, dynamic civic news synthesizer**:
1. **Real News $\to$ Dynamic Scenario**: Live RSS news articles (transit strikes, heat domes, corporate buyouts, immigration policies) are converted into bespoke, street-level crisis scenarios tailored to our specific characters.
2. **Dynamic Street Banter & Rumors**: NPCs (Sal, Elena, Marcus, Rosa, Mrs. Higgins) react organically to real-world events and the player's recent decisions. Sal comments on real egg price spikes; Elena discusses the heatwave shelter; Arthur frets over property tax assessments.
3. **Ironclad Guardrails & Balance Protection**: The AI does *not* invent mechanics or arbitrary numbers. It populates strict JSON schemas where balance math, stat deltas, and the ideological choice framework (Solidarity vs. Scapegoating) are mathematically bounded and verified before reaching the client.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DISTRICT STORY ENGINE ARCHITECTURE                   │
│                                                                        │
│  [LIVE CIVIC NEWS FEEDS]                                               │
│  • Municipal notices, transit strikes, climate alerts, food prices     │
│                     │                                                  │
│                     ▼                                                  │
│  [AI SYNTHESIS SERVICE (Go Backend)]                                   │
│  • Provider Adapter: Ollama (Local/Self-Hosted) OR Free Cloud Tier     │
│    (Groq / HuggingFace / Cloudflare Workers AI / Gemini Free)          │
│  • Prompt Pipeline: Injects Character Voice Pillars & Lore Bible       │
│  • JSON Schema Enforcement & Consequence Clamping                     │
│                     │                                                  │
│         ┌───────────┴───────────┐                                      │
│         ▼                       ▼                                      │
│  [DYNAMIC CRISIS SCENARIO]  [NPC STREET GOSSIP & RUMORS]               │
│  • Real-world news citation • 3-line reactive dialogue beats           │
│  • Scapegoat vs Solidarity  • Memory of player's past choices          │
│  • Local neighborhood lore  • Mood shifts based on Resilience Score    │
│                     │                                                  │
│                     ▼                                                  │
│  [POSTGRES CACHE & OFFLINE VAULT]                                      │
│  • Scenarios cached in DB; shared across players                       │
│  • Offline client fallback: Curated vault + procedural Mad-Libs         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Model Selection: Zero-Cost, High-Performance Stack

To ensure *District: Common Ground* remains **100% free to run, open-source, and sustainable for the next 10+ years**, the backend supports multiple pluggable zero-cost AI backends via an abstraction layer:

```
┌────────────────────────────────────────────────────────────────────────┐
│                       SUPPORTED FREE AI PROVIDERS                      │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Provider           │ Model              │ Cost & Specs                 │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 1. Ollama (Local)  │ Llama 3.2 3B /     │ $0.00 — 100% offline,        │
│    [Default Dev]   │ Qwen 2.5 3B        │ runs on developer laptop/VPS │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 2. Groq (Cloud)    │ Llama 3.3 70B /    │ $0.00 — Ultra-fast (500 t/s) │
│    [Recommended]   │ Llama 3.1 8B       │ generous free tier (30 RPM)  │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 3. Cloudflare AI   │ Llama 3.1 8B       │ $0.00 — 10,000 neurons/day   │
│                    │ Instruct           │ free edge compute            │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 4. Hugging Face    │ Mistral-7B-Instruct│ $0.00 — Free serverless API  │
│    Inference API   │ / Qwen 2.5 7B      │ token tier                   │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ 5. Procedural Mock │ Deterministic      │ $0.00 — Zero AI dependencies │
│    [Offline / CI]  │ Template Vault     │ instantaneous, always works  │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

### Configuration via Environment Variables (`.env`):
```bash
AI_PROVIDER=groq                   # ollama | groq | cloudflare | huggingface | mock
AI_MODEL=llama-3.3-70b-versatile  # or llama3.2:3b for local ollama
AI_API_KEY=gsk_...                # free tier key (optional for local ollama)
AI_ENDPOINT=https://api.groq.com/openai/v1
```

---

## 3. The Prompt Pipeline & Strict Narrative Guardrails

*Lead Rule from Narrative Designer*: "The AI must write like an exhausted grocer or a streetwise courier, never like an assistant describing a game."

### 3.1 System Prompt Architecture: The "District Lore Bible"
Every AI call injects four strict system parameters:
1. **World Bible & Tone**: Working-class urban realism, warmth, solidarity, sharp political awareness, zero corporate jargon, zero cheesy moralizing.
2. **Character Voice Pillars**:
   - **Sal (Corner Grocer)**: Cynical exterior, soft heart, counts pennies, remembers everyone's family, speaks in short, colorful idioms.
   - **Elena (Community Organizer)**: Tireless, pragmatic, focuses on logistics (soup pots, blankets, phone trees), refuses defeatist cynicism.
   - **Arthur (Solitary Landlord)**: Formal, nervous, feels guilty about collecting rents, defensive about his property, desires belonging.
   - **Pip (Courier)**: Rapid-fire slang, bicycle metaphors, hyper-aware of platform algorithms and police locations.
   - **Morgan (Commuter)**: Dry wit, exhausted, notices institutional absurdities, speaks with weary office cadence.
3. **The Core Ideological Dilemma**: Every crisis scenario MUST present two distinct philosophies:
   - **Option A (Scapegoating)**: Blames an outgroup (immigrants, strikers, youth, unhoused); gives immediate private cash; erodes trust and resilience.
   - **Option B (Solidarity)**: Collective action; costs upfront energy or cash; expands trust, resilience, and community bonds.

### 3.2 The Generation Schema & Strict JSON Extraction
The Go backend enforces JSON-mode output. Any response that fails validation is rejected and replaced by a curated fallback scenario from the vault.

```json
{
  "scenarioId": "dyn-heatwave-eviction-2026",
  "title": "The Heat-Exhaustion Eviction Notices",
  "headlineCitation": {
    "headline": "City records 4th consecutive day above 100°F as grid operators issue blackouts",
    "source": "State Environmental Bureau"
  },
  "districtStory": "The brick tenements on Elm Street are cooking. Landlord Horizon Capital issued eviction notices to six families who plugged in portable air conditioners, claiming they violated building electric capacity rules. Sal and Elena have called an emergency stoop meeting.",
  "involvedNPCs": ["Sal", "Elena"],
  "choiceA": {
    "label": "Support Horizon's electrical safety crackdown",
    "type": "authoritarian",
    "narrativeText": "You agree that the grid can't handle it. Horizon disconnects the units and pays you a $35 inspection credit. Two elderly neighbors are hospitalized that night. The block grows cold and suspicious.",
    "consequences": {
      "cashDelta": 35,
      "energyDelta": 0,
      "trustDelta": -20,
      "resilienceDelta": -15,
      "stressDelta": -5,
      "worldEffect": "desaturate"
    }
  },
  "choiceB": {
    "label": "Mobilize the Solar Co-op & defy the notices",
    "type": "solidarity",
    "narrativeText": "You and Elena run heavy-duty cabling from the rooftop solar battery down the lightwell, powering three shared cooling rooms on the ground floor. Horizon's lawyers back off after local news covers the story.",
    "consequences": {
      "cashDelta": -10,
      "energyDelta": -20,
      "trustDelta": 25,
      "resilienceDelta": 25,
      "stressDelta": 5,
      "worldEffect": "bloom"
    }
  }
}
```

---

## 4. Dynamic NPC Street Banter & Rumor Mill

Instead of fixed dialogue lines when the player taps `[Talk]` on an NPC, the dialogue system draws from a **Dynamic Rumor Buffer**:

### 4.1 How Dynamic Rumors Work
1. The Go backend generates a daily batch of **15 micro-dialogue beats** (3 lines each) tailored to:
   - The current day's real-world economic indices (e.g. food inflation up 15%).
   - The latest crisis resolution (e.g. player chose Solidarity on the rail strike).
   - The district's current `resilienceScore` (Bloom vs. Decay).
2. When the player talks to Sal:
   - *If resilience > 75%*: *"Hey Pip! Elena's soup pot smells like rosemary today. Whole block's energized. How's the cargo bike holding up?"*
   - *If resilience < 35%*: *"Lock your bike, Pip. Horizon's private guards are poking around the alley again. People are scared."*
   - *If food inflation is high*: *"Did you see eggs this morning? Absurd. Tell your roommate to grab lentils from the Community Fridge before they're gone."*

---

## 5. Security, Caching & Anti-Hallucination Guardrails

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SAFETY & BALANCE GUARDRAIL SYSTEM                    │
├───────────────────────┬────────────────────────────────────────────────┤
│ Guardrail             │ Enforcement Mechanism                          │
├───────────────────────┼────────────────────────────────────────────────┤
│ 1. Strict Schema      │ Go JSON Unmarshaler rejects missing fields     │
│    Validation         │ or malformed structures.                       │
├───────────────────────┼────────────────────────────────────────────────┤
│ 2. Math Clamping      │ Stat deltas are clamped by code:               │
│                       │ • Cash: [-$50, +$100]                          │
│                       │ • Energy: [-$35, 0]                            │
│                       │ • Trust / Resilience: [-30, +35]               │
│                       │ Model CANNOT output infinite money or breaks.  │
├───────────────────────┼────────────────────────────────────────────────┤
│ 3. Database Caching   │ Generated scenarios are saved to PostgreSQL    │
│                       │ `dynamic_scenarios` table. Generated once/day; │
│                       │ shared across all players to minimize API calls│
├───────────────────────┼────────────────────────────────────────────────┤
│ 4. Content Safety     │ Banned words list & prompt safety clauses      │
│                       │ prevent offensive or out-of-world content.     │
├───────────────────────┼────────────────────────────────────────────────┤
│ 5. Instant Fallback   │ On API timeout (>3.5s) or network error,       │
│                       │ falls back instantly to curated vault.         │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

## 6. Implementation Milestones for the AI Pipeline

- **Task 8.1**: Implement `apps/api/internal/narrative/client.go` — generic HTTP client for OpenAI-compatible providers (Ollama, Groq, Cloudflare).
- **Task 8.2**: Implement `apps/api/internal/narrative/prompts.go` — battle-tested system prompt with lore bible, character voice pillars, and JSON schema.
- **Task 8.3**: Implement `apps/api/internal/narrative/validator.go` — schema validation, consequence clamping, and fallback routing.
- **Task 8.4**: Implement `GET /api/v1/narrative/daily-scenarios` and `GET /api/v1/narrative/rumors` in Go API.
- **Task 8.5**: Update frontend `CrisisEngine.ts` and `DialogueOverlay.ts` to consume dynamic scenarios and reactive NPC banter.
