import Phaser from 'phaser'

const PLAYER_ASSET_PATH = '/assets/kenney/top-down-shooter/PNG/Soldier%201/soldier1_stand.png'

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

    this.load.image('player', PLAYER_ASSET_PATH)

    this.load.once('complete', () => {
      this.scene.start('MenuScene')
    })

    this.load.start()
  }
}
