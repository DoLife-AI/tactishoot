declare module '@poki/phaser-3' {
  import type { Plugins } from 'phaser'

  export class PokiPlugin extends Plugins.BasePlugin {
    initialized: boolean
    hasAdblock: boolean
    runWhenInitialized(callback: (poki: PokiPlugin) => void): void
  }
}
