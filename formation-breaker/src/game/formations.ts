/** Formation types from GDD */
export type FormationType = 'swarm' | 'line' | 'vshape' | 'ring' | 'leader_minions'

export type EnemyRole = 'chaser' | 'ranged' | 'leader' | 'minion'

const ENEMY_VARIANTS = ['enemy', 'enemy2', 'enemy3', 'enemy4', 'enemy5', 'enemy6'] as const

function enemyTexture(i: number): string {
  return ENEMY_VARIANTS[i % ENEMY_VARIANTS.length]
}

export interface FormationSlot {
  x: number
  y: number
  role: EnemyRole
  texture: string
}

/** Spawn positions relative to arena center. Clamped to stay within player view. */
export function getFormation(
  type: FormationType,
  wave: number,
  centerX: number,
  centerY: number,
  arenaW: number,
  arenaH: number
): FormationSlot[] {
  const slots: FormationSlot[] = []
  const scale = 1 + wave * 0.05
  const margin = 60
  const maxSpreadX = arenaW * 0.4
  const maxSpreadY = arenaH * 0.35

  switch (type) {
    case 'swarm': {
      const count = Math.min(6 + wave, 14)
      const r = Math.min(80 + wave * 8, maxSpreadX, maxSpreadY)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        slots.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r * 0.6,
          role: i === 0 ? 'chaser' : 'minion',
          texture: enemyTexture(i),
        })
      }
      break
    }
    case 'line': {
      const count = Math.min(5 + wave, 10)
      const spacing = Math.min(50 * scale, (maxSpreadX * 2) / Math.max(count - 1, 1))
      const startX = centerX - ((count - 1) * spacing) / 2
      for (let i = 0; i < count; i++) {
        slots.push({
          x: startX + i * spacing,
          y: centerY - maxSpreadY + margin,
          role: 'ranged',
          texture: enemyTexture(i),
        })
      }
      break
    }
    case 'vshape': {
      const count = Math.min(5 + Math.floor(wave / 2), 9)
      const half = Math.floor(count / 2)
      for (let i = 0; i < count; i++) {
        const side = i < half ? -1 : i > half ? 1 : 0
        const row = side === 0 ? 0 : 1
        const col = side === 0 ? 0 : Math.abs(i - half)
        slots.push({
          x: centerX + side * Math.min(40 + col * 45, maxSpreadX - 20) * scale,
          y: centerY - maxSpreadY + margin + row * 50,
          role: i === half ? 'leader' : 'minion',
          texture: enemyTexture(i),
        })
      }
      break
    }
    case 'ring': {
      const count = Math.min(6 + wave, 12)
      const radius = Math.min(120 * scale, maxSpreadX, maxSpreadY)
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        slots.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.6,
          role: 'ranged',
          texture: enemyTexture(i),
        })
      }
      break
    }
    case 'leader_minions': {
      const rad = Math.min(70, maxSpreadX - 10)
      slots.push({
        x: centerX,
        y: centerY - maxSpreadY + margin + 30,
        role: 'leader',
        texture: 'enemy',
      })
      const minionCount = Math.min(4 + wave, 9)
      for (let i = 0; i < minionCount; i++) {
        const angle = (i / minionCount) * Math.PI + Math.PI / 2
        slots.push({
          x: centerX + Math.cos(angle) * rad,
          y: centerY - maxSpreadY + margin + 80,
          role: 'minion',
          texture: enemyTexture(i),
        })
      }
      break
    }
  }
  return slots
}

const FORMATION_ORDER: FormationType[] = ['swarm', 'line', 'vshape', 'ring', 'leader_minions']

export const BOSS_WAVE = 5

export function getFormationForWave(wave: number): FormationType | null {
  if (wave === BOSS_WAVE) return null
  return FORMATION_ORDER[(wave - 1) % FORMATION_ORDER.length]
}

/** For late waves (7+): combine two formation types */
export function getFormationsForWave(
  wave: number,
  centerX: number,
  centerY: number,
  arenaW: number,
  arenaH: number
): FormationSlot[] {
  if (wave === BOSS_WAVE) return []
  const primary = getFormationForWave(wave)
  if (!primary) return []
  const slots = getFormation(primary, wave, centerX, centerY, arenaW, arenaH)
  if (wave >= 7) {
    const secondary = FORMATION_ORDER[(wave) % FORMATION_ORDER.length]
    const offsetX = primary === secondary ? 80 : 0
    const more = getFormation(secondary, wave, centerX + offsetX, centerY + 50, arenaW, arenaH)
    slots.push(...more)
  }
  return slots
}
