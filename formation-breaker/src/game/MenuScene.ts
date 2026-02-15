import Phaser from 'phaser'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.cameras.main.setBackgroundColor('#1a1a2e')

    this.add.text(width / 2, height / 2, 'Click to Start', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.input.once('pointerdown', () => {
      this.scene.start('PlayScene')
    })
  }
}
