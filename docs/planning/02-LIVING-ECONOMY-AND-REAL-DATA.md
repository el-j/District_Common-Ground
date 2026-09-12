# 02 — Living Economy & Real-World Data Ingestion Specification

**Authored by:** Economy Designer 💰 & Engineering Backend Architect 🛠️  
**Status:** Living Specification (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. The Living Economy Thesis

In most simulation games, the economy is an isolated sandbox governed by arbitrary constant numbers ($5 for bread, $20 for rent). 

In **District: Common Ground (v2.0)**, the economic environment is **alive and tethered to the real world**. The daily cost of living, wage yields, and utility surcharges reflect real macroeconomic data and civic volatility. When real-world food inflation climbs or energy monopolies hike winter tariffs, the district's residents immediately feel the pinch.

Crucially, **the game does not punish players helplessly**. Instead, it teaches systemic resilience: by constructing community infrastructure (The Commons), players build a protective buffer that completely insulates their neighborhood from external macroeconomic shocks.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE LIVING ECONOMY PIPELINE                          │
│                                                                         │
│  [EXTERNAL REALITY]           [GO PULSE SERVICE]     [DISTRICT REALITY] │
│  • BLS / FRED CPI (Food)  ──>  • Ingest & Normalize ──> • Grocer Prices │
│  • Energy/Utility Index   ──>  • Rolling 7-Day Avg  ──> • Heating Bill  │
│  • Gig Courier Pay Index  ──>  • Multiplier Clamp   ──> • Pip's Job Pay │
│  • Transit Alert Index    ──>    (0.70x – 1.60x)    ──> • Commute Delay │
│                                                                         │
│  [THE COMMONS BUFFER]                                                   │
│  Community Kitchen 100% ────> Offsets Food Price Inflation to $0        │
│  Solar Cooperative 100% ────> Offsets Energy Tariff Spikes to $0       │
│  Legal Defense Fund 100% ───> Halts Speculative Rent Evictions          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Real-World Data Ingestion Pipeline

### 2.1 Macroeconomic & Civic Indices
The Go backend (`apps/api/internal/pulse/`) queries open-access public data feeds on a 24-hour cron schedule. Data points are normalized into four core **District Pulse Multipliers** ($M_{\text{food}}, M_{\text{energy}}, M_{\text{wage}}, M_{\text{rent}}$):

| Indicator | Real-World Open Source Feed | Normalized Multiplier | Gameplay Effect |
|---|---|---|---|
| **Food & Groceries** | BLS CPI-U Food at Home / Eurostat HICP Food | $M_{\text{food}} \in [0.80, 1.50]$ | Modifies daily food upkeep & Corner Grocer prices |
| **Energy & Utilities** | US EIA Short-Term Energy / ENTSO-E Day-Ahead | $M_{\text{energy}} \in [0.70, 1.80]$ | Modifies winter heating bill & appliance upkeep |
| **Gig Courier Wages** | Open Gig Worker Pay Index / Labor Statistics | $M_{\text{wage}} \in [0.75, 1.40]$ | Scales Pip's platform delivery payouts per run |
| **Housing & Rent** | Zillow Observed Rent Index (ZORI) / Municipal Rent Data | $M_{\text{rent}} \in [0.85, 1.60]$ | Sets eviction risk threshold & building repair costs |
| **Transit Reliability**| Regional Transit GTFS-RT Alerts / Strike feeds | $M_{\text{transit}} \in [0.50, 1.50]$ | Modifies Morgan's commute delay & daily stress |
| **Climate Heat Anomaly**| NOAA GISTEMP / Copernicus Climate Service | $M_{\text{heat}} \in [1.00, 2.20]$ | Triggers summer heat-dome crises & cooling demand |
| **Climate Displacement**| UNHCR Open Data / IDMC Internal Displacement | $M_{\text{migrant}} \in [0.80, 2.50]$ | Scales newcomer arrival volume & volunteer pool |

### 2.2 Go API Endpoint Schema: `/api/v1/pulse/economy`
The Go API exposes a cached, lightweight JSON payload for the frontend web app:

```json
{
  "timestamp": 1726185600,
  "source": "live_feed",
  "region": "global_composite",
  "indices": {
    "foodMultiplier": 1.18,
    "energyMultiplier": 1.35,
    "wageMultiplier": 0.92,
    "rentMultiplier": 1.25,
    "transitDisruption": 0.40
  },
  "headlineContext": {
    "headline": "Energy regulator approves 35% winter tariff hike citing grid stress",
    "sourceName": "Municipal Gazette",
    "impactSummary": "Winter heating upkeep increased by +$4/day unless Solar Co-op is active."
  }
}
```

### 2.3 Offline Resilience: Deterministic Seasonal Synthesizer
*Crucial Architecture Requirement*: District: Common Ground is a Progressive Web App (PWA) that must remain 100% functional offline or during local development without network access.

When offline or if network requests fail:
1. The client loads the last cached snapshot from IndexedDB (`idb-keyval`).
2. If unseeded, a deterministic sinusoidal wave generator synthesizes seasonal cycles:
   $$M_{\text{energy}}(d) = 1.0 + 0.35 \cdot \sin\left(\frac{2\pi \cdot (d + 45)}{365}\right)$$
   (Generating realistic winter heating peaks and summer cooling spikes).

---

## 3. Dynamic Income & Upkeep Formulas

In `apps/web/src/core/simulation/EconomyMath.ts`, the daily tick logic is expanded to incorporate live multipliers and commons mitigations:

### 3.1 Daily Cash Upkeep Formula
$$\Delta \text{Cash} = - \left( C_{\text{base\_rent}} + C_{\text{food}} \cdot M_{\text{food}} \cdot (1 - B_{\text{kitchen}}) + C_{\text{energy}} \cdot M_{\text{energy}} \cdot (1 - B_{\text{solar}}) \right)$$

Where:
- $C_{\text{base\_rent}}$: Base housing cost ($0 for Pip in sublet, $10 for Morgan, -$30 net rent income for Arthur).
- $C_{\text{food}}$: Base grocery cost ($5/day).
- $C_{\text{energy}}$: Base utility cost ($4/day baseline, +$6 during winter events).
- $B_{\text{kitchen}}$: Kitchen Commons mitigation ($0.0 \to 1.0$ as Community Kitchen approaches 100%).
- $B_{\text{solar}}$: Solar Co-op mitigation ($0.0 \to 1.0$ as Solar Grid approaches 100%).

> **Economic Takeaway**: When the Community Kitchen reaches 100%, $B_{\text{kitchen}} = 1.0$, reducing food upkeep to **$0**, completely neutralizing even a 50% food inflation spike!

### 3.2 Archetype-Specific Earning Dynamics

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DYNAMIC EARNING PROFILES                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PIP (Precarious Courier)                                            │
│    • Platform Gig Pay = $12 × M_wage                                   │
│    • Community Delivery Pay = $15 (Direct, 0% platform fee, Trust ≥40) │
│    • Mutual Aid Dividend = +$5/day food allowance (Kitchen ≥50%)       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. MORGAN (Exhausted Commuter)                                         │
│    • Corporate Salary = $55/day fixed                                  │
│    • Transit Fare = $6 × M_transit                                     │
│    • Energy Drain = 15 base + (M_transit × 10)                         │
│    • Tool Library Buff: Allows working remote on high-transit days     │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ARTHUR (Solitary Landlord)                                          │
│    • Gross Rental Income = $80/day fixed                               │
│    • Maintenance & Municipal Tax = $35 × M_rent                        │
│    • Moral Choice: Freeze rents (+20 Trust/wk) vs Hike rents (+$30/wk) │
│    • Deeding to Land Trust: Converts equity into permanent immortality│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. The Commons Dividend & Collective Economics

Completed construction nodes are not passive trophies; they are economic engines that pay out tangible daily **Commons Dividends**:

```
┌────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Node                   │ Completion Threshold    │ Daily Commons Dividend  │
├────────────────────────┬─────────────────────────┬─────────────────────────┤
│ Community Kitchen      │ 100% Progress           │ • Food upkeep = $0      │
│ & Food Pantry          │                         │ • Daily hot meal: +10 E │
│                        │                         │ • Stress relief: -5%    │
├────────────────────────┼─────────────────────────┼─────────────────────────┤
│ Rooftop Solar          │ 100% Progress           │ • Energy bills = $0     │
│ Cooperative            │                         │ • Grid sell-back: +$3/d │
│                        │                         │ • Immunity to blackouts │
├────────────────────────┼─────────────────────────┼─────────────────────────┤
│ Tenant Legal           │ 100% Progress           │ • Eviction immunity     │
│ Defense Fund           │                         │ • Rent strike power +40%│
│                        │                         │ • Stress relief: -8%    │
├────────────────────────┼─────────────────────────┼─────────────────────────┤
│ Community Tool         │ 100% Progress           │ • Appliance repair: $0  │
│ Library & Workshop     │                         │ • Pip bike upgrades:    │
│                        │                         │   Speed +25%, Energy -20%│
└────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 5. Economy Health, Sinks & Anti-Inflation Guardrails

*Lead Rule from Economy Designer*: "Every economy without sinks hyperinflates by day 30. Every loop must terminate in a sink or a cap."

### Faucets (Sources)
1. Pip: Platform & community courier jobs ($10–$25 per delivery).
2. Morgan: Corporate salary ($55/day).
3. Arthur: Rental revenue ($80/day).
4. Crisis resolution bonuses: Solidarity mutual aid grants ($20–$50).

### Sinks (Drains)
1. **Commons Construction Donations**: Unlimited sink for excess cash ($10, $50, $200 increments).
2. **Daily Upkeep (Food + Utilities + Rent)**: Fixed recurring sink draining $10–$40/day.
3. **Emergency Crisis Defense**: Legal retainer fees, emergency fuel reserves ($25–$100).
4. **Community Bond Purchasing (Endgame)**: $1,000 capital sink to buy out private equity debt and establish the Community Land Trust.

### Telemetry & Solvency Targets
- **Median Player Wallet Balance**:
  - Day 10: $30–$80 (Pip), $150–$300 (Morgan), $800–$1,400 (Arthur).
  - Day 30: $100–$200 (Pip), $400–$600 (Morgan), $1,500–$2,000 (Arthur).
- **Faucet/Drain Target Ratio**: $1.08$ in early game (allowing modest emergency savings), converging to $0.98$ if player hoards without funding the commons.
