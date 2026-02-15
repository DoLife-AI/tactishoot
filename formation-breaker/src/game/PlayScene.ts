import Phaser from 'phaser'

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.cameras.main.setBackgroundColor('#1a1a2e')

    const centerX = width / 2
    const centerY = height / 2

    this.player = this.physics.add.sprite(centerX, centerY, 'player')
    this.player.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  }

  update() {
    const speed = 200
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0)

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      body.setVelocityY(speed)
    }
  }
}
