import Phaser from 'phaser'

const B = (import.meta.env.BASE_URL || '/').replace(/\/*$/, '/')
const K = `${B}assets/kenney/top-down-shooter/PNG`

const ASSETS = {
  player: `${K}/Soldier%201/soldier1_stand.png`,
  enemy: `${K}/Hitman%201/hitman1_stand.png`,
  enemy2: `${K}/Survivor%201/survivor1_stand.png`,
  enemy3: `${K}/Robot%201/robot1_stand.png`,
  enemy4: `${K}/Zombie%201/zoimbie1_stand.png`,
  enemy5: `${K}/Woman%20Green/womanGreen_stand.png`,
  enemy6: `${K}/Man%20Blue/manBlue_stand.png`,
  tileFloor: `${K}/Tiles/tile_137.png`,
  tileFloor2: `${K}/Tiles/tile_123.png`,
  tileFloor3: `${K}/Tiles/tile_255.png`,
  tileFloor4: `${K}/Tiles/tile_08.png`,
  tileFloor5: `${K}/Tiles/tile_20.png`,
  friendly: `${K}/Survivor%201/survivor1_stand.png`,
  soundShoot: `${B}assets/kenney/interface-sounds/Audio/click_001.ogg`,
  soundHit: `${B}assets/kenney/interface-sounds/Audio/confirmation_001.ogg`,
  soundKill: `${B}assets/kenney/interface-sounds/Audio/error_001.ogg`,
}

export default class LoadingScene extends Phaser.Scene {
  private progressText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'LoadingScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.cameras.main.setBackgroundColor('#1a1a2e')

    this.add.text(width / 2, height / 2 - 20, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.progressText = this.add.text(width / 2, height / 2 + 20, '0%', {
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      this.progressText.setText(`${Math.round(value * 100)}%`)
    })

    this.load.image('player', ASSETS.player)
    this.load.image('enemy', ASSETS.enemy)
    this.load.image('enemy2', ASSETS.enemy2)
    this.load.image('enemy3', ASSETS.enemy3)
    this.load.image('enemy4', ASSETS.enemy4)
    this.load.image('enemy5', ASSETS.enemy5)
    this.load.image('enemy6', ASSETS.enemy6)
    this.load.image('tileFloor', ASSETS.tileFloor)
    this.load.image('tileFloor2', ASSETS.tileFloor2)
    this.load.image('tileFloor3', ASSETS.tileFloor3)
    this.load.image('tileFloor4', ASSETS.tileFloor4)
    this.load.image('tileFloor5', ASSETS.tileFloor5)
    this.load.image('friendly', ASSETS.friendly)
    this.load.audio('shoot', ASSETS.soundShoot)
    this.load.audio('hit', ASSETS.soundHit)
    this.load.audio('kill', ASSETS.soundKill)

    this.load.once('complete', () => {
      this.scene.start('MenuScene')
    })

    this.load.start()
  }
}
