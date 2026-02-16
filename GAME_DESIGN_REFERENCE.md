# Formation Breaker — Game Design Reference

**Genre:** Tactical Arena Shooter (casual web)  
**Session target:** ~10 minutes (quittable after any wave)  
**Platform:** Web (fast-loading, Poki-friendly)

---

## One-Sentence Player Experience

You stand fixed at screen center while the arena scrolls around you. Scan enemy formations spawning at the play area center, outmaneuver and shoot to wipe waves—staying alive with allies at your side—until you face a boss.

---

## Core Fantasy & Feel

- **Fantasy:** "I'm a clever tactician in a bullet-dodge arena."
- **Feel targets:** Clever, tense, strategic
- **Design goal:** First 15 seconds, the player already gets the main thrill: Move → dodge → shoot → paint splatter → enemy despawns.

---

## Controls

| Action | Input | Notes |
|--------|-------|-------|
| Movement | Arrow keys + WASD | World scrolls (inverted)—you stay centered, map/enemies/allies move |
| Shooting | Click or Space | Tap or hold to fire |
| Dash | Shift | With Dash powerup active; 3 uses |

---

## Core Loop (every 10–30 seconds)

1. **Read the formation** (2–3s): Enemies spawn at the center of the play area (move boundaries).
2. **Choose a plan** (implicit): Which lane is safest? Which enemy is the "keystone"? Kite, flank, or burst?
3. **Execute under pressure** (10–20s): Scroll to dodge + shoot while enemies advance toward you.
4. **Satisfying payoff:** Enemies despawn with paint splatter impact.
5. **Reset:** Player stays in place; new formation spawns at center; surviving allies + 1 new ally next wave.

---

## Win / Lose Conditions

| Condition | Rule |
|-----------|------|
| **Lose** | Get hit (health reaches zero after 3 hits). |
| **Win wave** | Kill all enemies in the wave. |
| **Boss** | Kill boss (6 HP; player 3 hits, allies 6 hits) to advance. |
| **Run progression** | Clear waves → reach boss (wave 5) → advance → repeat. |

---

## Combat & Strategy

### Formations

Each wave is defined by a formation that implies a strategy:

| Formation | Description | Best approach |
|-----------|-------------|---------------|
| **Swarm** | Enemies surround; one chaser, rest minions. | Prioritize chaser; kite and pick off. |
| **Line** | Horizontal row of ranged. | Break from sides; use cover. |
| **Pincer / V-shape** | Leader center, minions flank. | Backpedal + break one side. |
| **Turret Ring** | Ranged in a circle. | Pathing, lane reading. |
| **Leader + Minions** | Leader with minion escorts. | Target keystone first. |

**Implementation note:** No blockers; all enemies are killable. All enemies move toward the player (chasers faster, ranged/leaders slower). They spawn at the center of the move boundaries.

**Design rule:** Formations must be legible at a glance so the player feels smart quickly.

### Damage

| Source | Damage | Notes |
|--------|--------|-------|
| Player bullet | 2 | One-shots regular enemies (2 HP) |
| Ally bullet | 1 | Two-shots regular enemies; half of player damage |
| Regular enemy | 2 HP | |
| Boss | 6 HP | Player 3 hits, allies 6 hits |

### Target Priority

- "Do I kill the fast chaser first so I can breathe?"
- "Do I remove the ranged unit that controls space?"
- "Do I break the formation at its weak link?"

---

## Map & Terrain

- **Map:** Finite grid (5 wide × 4 tall sections); procedural floor (grass exterior, wood planks main room, tiled bathroom corner).
- **Move boundaries:** Visible blue outline marks the play area; player scrolls within it (no wave transition scroll).
- **Movement:** Player fixed at screen center; arrow keys/WASD scroll the world (inverted so it feels like you move).
- **Spawn center:** All enemies spawn at the center of the move boundaries.

---

## Allies (Wave 1+)

- **Spawn:** survivors + 1 each wave (e.g. 5 allies, 2 die → 4 next wave; 3 survive + 1 new).
- **Appearance:** Survivor sprite with green tint; positioned 90° left/right of aim direction.
- **Behavior:** Shoot at nearest enemy; follow player at same speed; face the way the player aims.
- **Threats:** Enemy bullets and enemy contact kill allies.
- **Survival:** Surviving allies carry over and reposition near player between waves.
- **UI:** "Allies: N" counter (green) when any are alive.

---

## Difficulty & Tension Ramp

| Phase | Waves | Description |
|-------|-------|-------------|
| **Early** | 1–2 | Few enemies, big gaps, slow projectiles. Teaches move + dodge + hit → splatter → despawn. |
| **Mid** | 2–7 | More enemies, tighter lanes. Mixed roles (chasers + ranged). Layered formations from wave 7. |
| **Late** | 8+ | Allies to protect; more formations. Higher consequence for bad positioning. |

**Fairness principle:** Deaths feel like "I wasn't fast/strategic enough," not random.

---

## Juice & Feedback (Paint as Identity)

- **Hits:** Juicy splats + sound (Kenney interface-sounds).
- **Kills:** Bigger splat + despawn.
- **Arena:** Splatter marks fade over time.
- **Strategic:** Splatter shows where fights happened.

---

## Boss Encounter (Wave 5, 10, 15…)

- **Health:** 6 HP (player 3 hits at 2 damage each; allies 6 hits at 1 damage each).
- **Phases:** Phase 2 (66% HP) and Phase 3 (33% HP) add sweeping multi-shot attacks.
- **Visual:** Scaled-up enemy sprite; death splatter.

---

## Rare Powerups

~15% chance to spawn on wave clear. Do not become required; each is a "story moment."

| Powerup | Duration/Uses | Effect |
|---------|---------------|--------|
| **Piercing shots** | 10s | Bullets pass through multiple enemies |
| **Dash charge** | 3 uses | Shift to dash toward cursor |
| **Slow-time bubble** | 6s | Physics time scale 0.4 |
| **Paint bomb** | 1 use | Large AoE splatter; clears nearby enemies |

---

## Enemies (Kenney Assets)

- **Player:** Soldier 1.
- **Enemies:** Hitman, Survivor, Robot, Zombie, Woman Green, Man Blue (rotated in formations).
- **Boss:** Scaled Hitman.
- **Allies:** Survivor with green tint.

---

## Target Screen Layout

- Map with visible blue move boundary; player fixed at screen center.
- Enemies spawn at boundary center, advance toward player.
- **UI:** Wave counter, health hearts, boss warning, powerup icon when active, ally count when applicable.
- Splatter marks fade over time.

---

## Technical Context

- **Engine:** Phaser 3 + TypeScript + Vite
- **Hosting:** Web (Poki plugin integrated)
- **Base resolution:** 1120×630 (16:9), scale to fit
- **Assets:** `public/assets/kenney/` (top-down-shooter, interface-sounds)
- **Scale:** Player/enemies/allies at 65% sprite scale for more tactical space
