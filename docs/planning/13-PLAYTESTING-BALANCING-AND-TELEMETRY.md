# 13 — Playtesting, Economy Balancing, Telemetry & 10-Year Resilience

**Authored by:** Economy Designer 💰, Design UX Researcher 🔍 & Engineering SRE ⚙️  
**Status:** Living Core Specification (v2.0)  
**Parent Documents:** [`01-VISION-AND-CORE-LOOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/01-VISION-AND-CORE-LOOP.md), [`02-LIVING-ECONOMY-AND-REAL-DATA.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md)  

---

## 1. The Economy Balancing Framework: 90-Day Solvency

*Lead Rule from Economy Designer*: "An economy balanced on paper is a hypothesis. An economy balanced across 10,000 Monte Carlo runs is a system you can trust to ship."

To ensure *District: Common Ground* remains engaging, challenging, and fair across all three socioeconomic archetypes, all formulas are stress-tested against **90 simulated in-game days** under extreme macroeconomic scenarios (high inflation, stagnant gig wages, severe heatwaves).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   90-DAY ARCHETYPE SOLVENCY PROFILES                   │
├─────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ Archetype   │ Day 1 Margin │ Day 30 Target│ Day 60 Target│ Day 90 Trust│
│             │ (Precarity)  │ (Equilibrium)│ (Buffed)     │ Endgame     │
├─────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ 1. Pip      │ $25 Cash     │ $120 Cash    │ $240 Cash    │ Land Trust  │
│    (Courier)│ 80 Energy    │ 85 Energy    │ 100 Energy   │ Founder     │
│             │ Stress 60%   │ Stress 40%   │ Stress 20%   │ Stress <15% │
├─────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ 2. Morgan   │ $240 Cash    │ $380 Cash    │ $550 Cash    │ Co-op Legal │
│    (Worker) │ 40 Energy    │ 55 Energy    │ 75 Energy    │ Director    │
│             │ Stress 45%   │ Stress 35%   │ Stress 20%   │ Energy >80  │
├─────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ 3. Arthur   │ $1,200 Cash  │ $1,500 Cash  │ $1,800 Cash  │ Brownstone  │
│    (Owner)  │ 65 Energy    │ 70 Energy    │ 80 Energy    │ Deeded to   │
│             │ Trust 10     │ Trust 35     │ Trust 65     │ Trust (100) │
└─────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

### 1.1 Stress-Testing Edge Cases
- **The "Permanent Inflation" Run**: Food index set to $+50\%$ and energy to $+75\%$ for 30 consecutive days.
  - *Result*: Unorganized players experience bankruptcy by Day 18. Players who prioritize the Community Kitchen and Solar Co-op reduce upkeep to $0 and survive with a $+15\%$ surplus.
- **The "Algorithm Pay Slash" Run**: Gig wage index drops by $-30\%$.
  - *Result*: Pip's platform earnings collapse, forcing Pip to rely on informal community delivery requests and kitchen meals. Demonstrates the reality of algorithmic wage theft and the protective power of mutual aid.

---

## 2. Ethical, Zero-PII Telemetry Architecture

*Lead Rule from Design UX Researcher & SRE*: "We measure systems, never human beings. Zero tracking cookies, zero third-party marketing SDKs, zero personal data."

The game collects only **anonymized civic telemetry** necessary to evaluate system balance and power the global asynchronous solidarity pool:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANONYMIZED CIVIC TELEMETRY                      │
├─────────────────────────┬──────────────────────────────────────────────┤
│ Metric Event            │ Data Payload (No PII)                        │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `crisis_resolved`       │ `{ crisisId, archetype, choice: 'solidarity',│
│                         │   dayNumber, resilienceBefore, trustDelta }` │
├─────────────────────────┼──────────────────────────────────────────────┤
│ `commons_milestone`     │ `{ node: 'kitchen', daysToComplete: 14,      │
│                         │   totalDonationsCash: 450, energySpent: 180 }│
├─────────────────────────┼──────────────────────────────────────────────┤
│ `land_trust_ratified`   │ `{ totalDays: 42, arthurTrustScore: 75,       │
│                         │   globalResilience: 84 }`                    │
└─────────────────────────┴──────────────────────────────────────────────┘
```

### Telemetry Dashboard Metrics for Live Tuning
- **Solidarity Ratio**: Global percentage of players choosing solidarity vs. scapegoating across each scenario. If a scenario has a $>85\%$ or $<15\%$ skew, the choices are re-balanced to ensure the dilemma remains genuine.
- **Economic Attrition Rate**: Percentage of players falling into zero-cash or zero-energy states before Day 10. Used to fine-tune early-game grocer credit margins.

---

## 3. The 10-Year Sustainability & Fail-Safe Architecture (2026–2036+)

To ensure *District: Common Ground* remains playable, responsive, and relevant ten years into the future without continuous engineering maintenance, the codebase adheres to strict **antifragile design principles**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   10-YEAR SUSTAINABILITY ARCHITECTURE                  │
├───────────────────────┬────────────────────────────────────────────────┤
│ Principle             │ Implementation Strategy                        │
├───────────────────────┼────────────────────────────────────────────────┤
│ 1. Zero Deprecation   │ Static single-binary Go backend (CGO_ENABLED=0)│
│    Stack              │ with scratch Docker image; runs anywhere.      │
├───────────────────────┼────────────────────────────────────────────────┤
│ 2. Offline Self-      │ PWA Service Worker caches 100% of web assets.   │
│    Sufficiency        │ Can be downloaded once and played on an island.│
├───────────────────────┼────────────────────────────────────────────────┤
│ 3. API Resilience     │ If NOAA, BLS, or news RSS feeds go dark or     │
│    & Degradation      │ change URLs, the Go backend smoothly degrades  │
│                       │ to its internal sinusoidal climate wave and    │
│                       │ 25-scenario evergreen vault. No crash, ever.   │
├───────────────────────┼────────────────────────────────────────────────┤
│ 4. No Build Debt      │ Rolldown / Vite 8 + OXC toolchain; zero        │
│                       │ deprecated Webpack/esbuild dependencies.       │
└───────────────────────┴────────────────────────────────────────────────┘
```

By coupling deterministic local math with graceful live-data degradation, *District: Common Ground* is built to endure as a timeless, living civic artifact.
