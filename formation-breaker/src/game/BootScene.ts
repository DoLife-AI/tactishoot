import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e')
    this.scene.start('LoadingScene')
  }
}
