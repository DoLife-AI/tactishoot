import Phaser from 'phaser'
import { PokiPlugin } from '@poki/phaser-3'
import BootScene from './BootScene'
import LoadingScene from './LoadingScene'
import MenuScene from './MenuScene'
import PlayScene from './PlayScene'

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1120,
  height: 630,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  plugins: {
    global: [
      {
        plugin: PokiPlugin,
        key: 'poki',
        start: true,
        data: {
          loadingSceneKey: 'LoadingScene',
          gameplaySceneKey: 'PlayScene',
          autoCommercialBreak: true,
        },
      },
    ],
  },
  scene: [BootScene, LoadingScene, MenuScene, PlayScene],
}
