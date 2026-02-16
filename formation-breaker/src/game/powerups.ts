export type PowerupType = 'piercing' | 'dash' | 'slowtime' | 'paintbomb'

export const POWERUP_CONFIG: Record<
  PowerupType,
  { duration: number; uses?: number; label: string }
> = {
  piercing: { duration: 10000, label: 'PIERCE' },
  dash: { duration: 0, uses: 3, label: 'DASH' },
  slowtime: { duration: 6000, label: 'SLOW' },
  paintbomb: { duration: 0, uses: 1, label: 'BOMB' },
}
