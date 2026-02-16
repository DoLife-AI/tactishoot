import Phaser from 'phaser'
import {
  getFormationsForWave,
  BOSS_WAVE,
  type FormationSlot,
  type EnemyRole,
} from './formations'
import { type PowerupType, POWERUP_CONFIG } from './powerups'
import { MAP_SECTIONS_WIDE, MAP_SECTIONS_TALL } from './scrollingMap'

const BULLET_SPEED = 500
const PLAYER_SPEED = 260
const PLAYER_DAMAGE = 2
const ALLY_DAMAGE = 1 // half of player
const ENEMY_HP = 2
const ALLY_BULLET_SPEED = 400
const ALLY_FIRE_RATE = 600
const ALLY_FORMATION_DISTANCE = 38
const ALLY_ROW_SPACING = 22
const ALLY_ATTACK_RANGE = 450
const FRIENDLY_WAVE = 1
const DASH_SPEED = 600
const DASH_DURATION = 120
const ENEMY_CHASER_SPEED = 45
const ENEMY_FORMATION_DRIFT = 18
const ENEMY_RANGED_FIRE_RATE = 1500
const ENEMY_BULLET_SPEED = 220
const SPLATTER_COLORS = [0xe74c3c, 0xe67e22, 0xf39c12, 0x9b59b6]
const WAVE_CLEAR_DELAY = 800
const BOSS_PHASE_2_HP = 0.66
const BOSS_PHASE_3_HP = 0.33
const POWERUP_SPAWN_CHANCE = 0.15
const HOLD_FIRE_INTERVAL = 120
const SPRITE_SCALE = 0.65

export default class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private bullets!: Phaser.Physics.Arcade.Group
  private allyBullets!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private powerups!: Phaser.Physics.Arcade.Group
  private friendlies!: Phaser.Physics.Arcade.Group
  private splatterLayer!: Phaser.GameObjects.Container
  private mapLayer!: Phaser.GameObjects.Container
  private worldContainer!: Phaser.GameObjects.Container
  private worldScrollX = 0
  private worldScrollY = 0
  private waveNumber = 0
  private waveText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private bossWarningText!: Phaser.GameObjects.Text
  private powerupIcon!: Phaser.GameObjects.Text
  private friendlyCountText!: Phaser.GameObjects.Text
  private health = 3
  private canShoot = true
  private shootCooldown = 180
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private pointerX = 0
  private pointerY = 0
  private pointerDown = false
  private lastHoldShot = 0
  private activePowerup: PowerupType | null = null
  private powerupEndTime = 0
  private powerupUsesLeft = 0
  private dashActive = false
  private dashDirection = { x: 0, y: 0 }
  private timeSinceStart = 0
  private boss: Phaser.Physics.Arcade.Sprite | null = null
  private bossHealth = 3
  private bossMaxHealth = 3
  private bossPhase = 1
  private isGameOver = false

  constructor() {
    super({ key: 'PlayScene' })
  }

  create() {
    const { width, height } = this.cameras.main
    this.cameras.main.setBackgroundColor('#2d2d44')

    this.worldScrollX = (MAP_SECTIONS_WIDE * width) / 2 - width / 2
    this.worldScrollY = (MAP_SECTIONS_TALL * height) / 2 - height / 2
    this.worldContainer = this.add.container(0, 0)
    this.mapLayer = this.add.container(0, 0)
    this.buildScrollingMap(width, height)
    this.worldContainer.add(this.mapLayer)
    this.worldContainer.setPosition(-this.worldScrollX, -this.worldScrollY)

    this.createBulletTexture()
    this.createPowerupTexture()
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 40,
    })
    this.allyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 50,
    })
    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 50,
    })
    this.enemies = this.physics.add.group()
    this.powerups = this.physics.add.group()
    this.friendlies = this.physics.add.group()

    this.splatterLayer = this.add.container(0, 0)
    this.worldContainer.add(this.splatterLayer)

    const centerX = width / 2
    const centerY = height / 2

    this.player = this.physics.add.sprite(centerX, centerY, 'player')
    this.player.setScale(SPRITE_SCALE)
    this.player.setDepth(10)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >
    this.input.keyboard!.addCapture([' '])

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      this.pointerX = ptr.x
      this.pointerY = ptr.y
    })
    this.input.on('pointerdown', () => {
      this.pointerDown = true
      this.tryShoot()
    })
    this.input.on('pointerup', () => {
      this.pointerDown = false
    })
    this.input.keyboard!.on('keydown-SPACE', () => this.tryShoot())
    this.input.keyboard!.on('keydown-SHIFT', () => this.tryDash())

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.hitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.allyBullets,
      this.enemies,
      this.allyHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.playerHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.player,
      this.powerups,
      this.pickupPowerup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.bullets,
      this.enemyBullets,
      (b, eb) => {
        ;(b as Phaser.GameObjects.GameObject).destroy()
        ;(eb as Phaser.GameObjects.GameObject).destroy()
      },
      undefined,
      this
    )
    this.physics.add.overlap(
      this.allyBullets,
      this.enemyBullets,
      (b, eb) => {
        ;(b as Phaser.GameObjects.GameObject).destroy()
        ;(eb as Phaser.GameObjects.GameObject).destroy()
      },
      undefined,
      this
    )
    this.physics.add.overlap(
      this.enemyBullets,
      this.friendlies,
      this.friendlyHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )
    this.physics.add.overlap(
      this.enemies,
      this.friendlies,
      this.friendlyHitByEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.waveText = this.add.text(16, 16, 'Wave 1', {
      fontSize: '20px',
      color: '#fff',
    }).setDepth(100)
    this.healthText = this.add.text(width - 16, 16, '♥♥♥', {
      fontSize: '20px',
      color: '#fff',
    }).setOrigin(1, 0).setDepth(100)
    this.bossWarningText = this.add.text(width / 2, 50, '', {
      fontSize: '24px',
      color: '#ff6b6b',
    }).setOrigin(0.5).setDepth(100).setVisible(false)
    this.powerupIcon = this.add.text(width - 16, 44, '', {
      fontSize: '14px',
      color: '#ffd700',
    }).setOrigin(1, 0).setDepth(100).setVisible(false)
    this.friendlyCountText = this.add.text(16, 44, '', {
      fontSize: '16px',
      color: '#88ff88',
    }).setDepth(100).setVisible(false)

    this.startWave()
  }

  private getViewCenter(): { x: number; y: number } {
    const { width, height } = this.cameras.main
    return {
      x: width / 2 + this.worldScrollX,
      y: height / 2 + this.worldScrollY,
    }
  }

  private getMoveBoundaryCenter(): { x: number; y: number } {
    const { width, height } = this.cameras.main
    return {
      x: (MAP_SECTIONS_WIDE * width) / 2,
      y: (MAP_SECTIONS_TALL * height) / 2,
    }
  }

  private buildScrollingMap(width: number, height: number) {
    const mapW = MAP_SECTIONS_WIDE * width
    const mapH = MAP_SECTIONS_TALL * height

    // Grass base (exterior)
    const grass = this.add.graphics()
    grass.fillStyle(0x5a9c4a, 1)
    grass.fillRect(0, 0, mapW, mapH)
    grass.setDepth(-12)
    this.mapLayer.add(grass)

    // Grass bush clumps
    const bushG = this.add.graphics()
    bushG.fillStyle(0x3d7a32, 0.6)
    for (let i = 0; i < 40; i++) {
      const hash = (i * 31 + 17) % 1000
      const x = (hash * 0.4123) % mapW
      const y = (hash * 0.7131) % mapH
      bushG.fillCircle(x, y, 24 + (hash % 16))
    }
    bushG.setDepth(-11)
    this.mapLayer.add(bushG)

    // Wood floor (main room) – planks
    const roomLeft = mapW * 0.12
    const roomTop = mapH * 0.12
    const roomW = mapW * 0.76
    const roomH = mapH * 0.76
    const woodColors = [0xc4a574, 0xb89868, 0xd4b080, 0xae9060]
    const plankW = 48
    const plankH = 12
    const woodG = this.add.graphics()
    for (let py = 0; py < roomH; py += plankH) {
      for (let px = 0; px < roomW; px += plankW) {
        const wx = roomLeft + px
        const wy = roomTop + py
        if (wx >= roomLeft && wy >= roomTop && wx < roomLeft + roomW && wy < roomTop + roomH) {
          const hash = (Math.floor(px / plankW) * 7 + Math.floor(py / plankH) * 13) % 997
          woodG.fillStyle(woodColors[hash % woodColors.length], 1)
          woodG.fillRect(wx, wy, Math.min(plankW, roomLeft + roomW - wx), Math.min(plankH, roomTop + roomH - wy))
        }
      }
    }
    woodG.setDepth(-10)
    this.mapLayer.add(woodG)

    // Hallway-style vertical planks (narrow strip)
    const hallLeft = roomLeft + roomW * 0.65
    const hallTop = roomTop + roomH * 0.4
    const hallW = 80
    const hallH = roomH * 0.35
    const vPlankW = 12
    const vPlankH = 40
    for (let vy = 0; vy < hallH; vy += vPlankH) {
      for (let vx = 0; vx < hallW; vx += vPlankW) {
        const hx = hallLeft + vx
        const hy = hallTop + vy
        if (hx < hallLeft + hallW && hy < hallTop + hallH) {
          const hash = (Math.floor(vx / vPlankW) + Math.floor(vy / vPlankH) * 5) % 4
          woodG.fillStyle(woodColors[hash], 1)
          woodG.fillRect(hx, hy, Math.min(vPlankW, hallLeft + hallW - hx), Math.min(vPlankH, hallTop + hallH - hy))
        }
      }
    }

    // Tiled floor (bathroom corner)
    const tileLeft = roomLeft + roomW - 180
    const tileTop = roomTop + roomH - 160
    const tileSize = 40
    const tileG = this.add.graphics()
    for (let ty = 0; ty < 160; ty += tileSize) {
      for (let tx = 0; tx < 180; tx += tileSize) {
        tileG.fillStyle(0xa8b4bc, 1)
        tileG.fillRect(tileLeft + tx, tileTop + ty, tileSize, tileSize)
        tileG.lineStyle(1, 0x8a96a0, 0.8)
        tileG.strokeRect(tileLeft + tx, tileTop + ty, tileSize, tileSize)
      }
    }
    tileG.setDepth(-9)
    this.mapLayer.add(tileG)
    const boundaryW = MAP_SECTIONS_WIDE * width
    const boundaryH = MAP_SECTIONS_TALL * height
    const moveMinX = width / 2
    const moveMinY = height / 2
    const moveMaxX = boundaryW - width / 2
    const moveMaxY = boundaryH - height / 2
    const moveW = moveMaxX - moveMinX
    const moveH = moveMaxY - moveMinY
    const boundaryG = this.add.graphics()
    boundaryG.lineStyle(8, 0xffffff, 1)
    boundaryG.strokeRect(moveMinX - 4, moveMinY - 4, moveW + 8, moveH + 8)
    boundaryG.lineStyle(6, 0x00aaff, 1)
    boundaryG.strokeRect(moveMinX - 2, moveMinY - 2, moveW + 4, moveH + 4)
    boundaryG.setDepth(5)
    this.mapLayer.add(boundaryG)
  }

  private updateMapForWave() {
    // Keep player at same world position: don't change scroll between waves
  }

  private createBulletTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0xffffff, 1)
    g.fillCircle(4, 4, 4)
    g.generateTexture('bullet', 8, 8)
    g.destroy()

    const eg = this.make.graphics({ x: 0, y: 0 })
    eg.fillStyle(0xff6b6b, 1)
    eg.fillCircle(3, 3, 3)
    eg.generateTexture('enemyBullet', 6, 6)
    eg.destroy()

    const ag = this.make.graphics({ x: 0, y: 0 })
    ag.fillStyle(0x88ff88, 1)
    ag.fillCircle(3, 3, 3)
    ag.generateTexture('allyBullet', 6, 6)
    ag.destroy()
  }

  private createPowerupTexture() {
    const g = this.make.graphics({ x: 0, y: 0 })
    g.fillStyle(0x9b59b6, 1)
    g.fillCircle(8, 8, 8)
    g.generateTexture('powerup', 16, 16)
    g.destroy()
  }

  private tryShoot() {
    if (!this.canShoot || !this.player.active || this.dashActive) return
    this.canShoot = false
    this.time.delayedCall(this.shootCooldown, () => {
      this.canShoot = true
    })
    this.fireBullet()
  }

  private fireBullet(piercing = false) {
    const center = this.getViewCenter()
    const bx = center.x
    const by = center.y
    const dx = this.pointerX - this.player.x
    const dy = this.pointerY - this.player.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const vx = (dx / len) * BULLET_SPEED
    const vy = (dy / len) * BULLET_SPEED

    const bullet = this.bullets.get(bx, by, 'bullet') as Phaser.Physics.Arcade.Image
    if (bullet) {
      bullet.setVelocity(vx, vy)
      bullet.setActive(true)
      bullet.setVisible(true)
      bullet.setDepth(5)
      bullet.setData('piercing', piercing || this.activePowerup === 'piercing')
      this.worldContainer.add(bullet)
    }
    if (this.sound) this.sound.play('shoot', { volume: 0.4 })
  }

  private tryDash() {
    if (
      this.activePowerup !== 'dash' ||
      this.powerupUsesLeft <= 0 ||
      this.dashActive ||
      !this.player.active
    )
      return
    this.powerupUsesLeft--
    this.updatePowerupIcon()
    if (this.powerupUsesLeft <= 0) this.clearPowerup()
    this.dashActive = true
    const dx = this.pointerX - this.player.x
    const dy = this.pointerY - this.player.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    this.dashDirection = { x: (dx / len) * DASH_SPEED, y: (dy / len) * DASH_SPEED }
    this.time.delayedCall(DASH_DURATION, () => {
      this.dashActive = false
    })
  }

  private pickupPowerup(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    powerup: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    const p = powerup as Phaser.Physics.Arcade.Sprite
    const type = p.getData('type') as PowerupType
    p.destroy()
    this.activatePowerup(type)
  }

  private activatePowerup(type: PowerupType) {
    const cfg = POWERUP_CONFIG[type]
    this.activePowerup = type
    if (cfg.uses) {
      this.powerupUsesLeft = cfg.uses
      this.powerupEndTime = 0
    } else {
      this.powerupEndTime = this.time.now + cfg.duration
    }
    this.updatePowerupIcon()
    if (type === 'paintbomb') {
      this.triggerPaintBomb()
      this.powerupUsesLeft = 0
      this.clearPowerup()
    }
  }

  private triggerPaintBomb() {
    const center = this.getViewCenter()
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return
      const dx = enemy.x - center.x
      const dy = enemy.y - center.y
      if (dx * dx + dy * dy < 150 * 150) {
        this.spawnSplatter(enemy.x, enemy.y, 40)
        if (this.sound) this.sound.play('kill', { volume: 0.5 })
        enemy.destroy()
      }
    })
    this.spawnSplatter(center.x, center.y, 60)
    this.cameras.main.flash(150, 255, 200, 100)
  }

  private clearPowerup() {
    this.activePowerup = null
    this.powerupUsesLeft = 0
    this.powerupEndTime = 0
    this.physics.world.timeScale = 1
    this.powerupIcon.setVisible(false)
  }

  private updatePowerupIcon() {
    if (!this.activePowerup) return
    const cfg = POWERUP_CONFIG[this.activePowerup]
    let text = cfg.label
    if (cfg.uses && this.powerupUsesLeft > 0) text += ` x${this.powerupUsesLeft}`
    this.powerupIcon.setText(text).setVisible(true)
  }

  private hitEnemy(
    _bullet: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    const b = _bullet as Phaser.Physics.Arcade.Image
    const e = enemy as Phaser.Physics.Arcade.Sprite
    const piercing = b.getData('piercing') as boolean

    if (!piercing) b.destroy()

    if (e.getData('isBoss')) {
      this.bossHealth -= PLAYER_DAMAGE
      this.spawnSplatter(e.x, e.y, 24)
      if (this.sound) this.sound.play('hit', { volume: 0.4 })
      if (this.bossHealth <= 0) {
        this.spawnSplatter(e.x, e.y, 50)
        e.destroy()
        this.boss = null
        this.advanceToNextWave()
        return
      }
      const pct = this.bossHealth / this.bossMaxHealth
      if (pct <= BOSS_PHASE_3_HP) this.bossPhase = 3
      else if (pct <= BOSS_PHASE_2_HP) this.bossPhase = 2
      return
    }

    const hp = (e.getData('health') as number) ?? ENEMY_HP
    const newHp = hp - PLAYER_DAMAGE
    e.setData('health', newHp)
    this.spawnSplatter(e.x, e.y, 24)
    if (newHp <= 0) {
      if (this.sound) this.sound.play('kill', { volume: 0.4 })
      e.destroy()
      this.checkWaveComplete()
    } else if (this.sound) this.sound.play('hit', { volume: 0.3 })
  }

  private allyHitEnemy(
    _bullet: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    ;(_bullet as Phaser.GameObjects.GameObject).destroy()
    const e = enemy as Phaser.Physics.Arcade.Sprite

    if (e.getData('isBoss')) {
      this.bossHealth -= ALLY_DAMAGE
      this.spawnSplatter(e.x, e.y, 24)
      if (this.sound) this.sound.play('hit', { volume: 0.4 })
      if (this.bossHealth <= 0) {
        this.spawnSplatter(e.x, e.y, 50)
        e.destroy()
        this.boss = null
        this.advanceToNextWave()
        return
      }
      const pct = this.bossHealth / this.bossMaxHealth
      if (pct <= BOSS_PHASE_3_HP) this.bossPhase = 3
      else if (pct <= BOSS_PHASE_2_HP) this.bossPhase = 2
      return
    }

    const hp = (e.getData('health') as number) ?? ENEMY_HP
    const newHp = hp - ALLY_DAMAGE
    e.setData('health', newHp)
    this.spawnSplatter(e.x, e.y, 24)
    if (newHp <= 0) {
      if (this.sound) this.sound.play('kill', { volume: 0.3 })
      e.destroy()
      this.checkWaveComplete()
    } else if (this.sound) this.sound.play('hit', { volume: 0.3 })
  }

  private friendlyHit(
    _bullet: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    friendly: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    ;(_bullet as Phaser.GameObjects.GameObject).destroy()
    const f = friendly as Phaser.Physics.Arcade.Sprite
    this.spawnSplatter(f.x, f.y, 20)
    if (this.sound) this.sound.play('hit', { volume: 0.3 })
    f.destroy()
  }

  private friendlyHitByEnemy(
    _enemy: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    friendly: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    const f = friendly as Phaser.Physics.Arcade.Sprite
    this.spawnSplatter(f.x, f.y, 20)
    if (this.sound) this.sound.play('hit', { volume: 0.3 })
    f.destroy()
  }

  private playerHit(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody,
    bullet: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody
  ) {
    ;(bullet as Phaser.GameObjects.GameObject).destroy()
    this.health--
    this.healthText.setText('♥'.repeat(this.health))
    this.spawnSplatter(this.getViewCenter().x, this.getViewCenter().y, 16)
    this.cameras.main.flash(200, 255, 50, 50)
    if (this.sound) this.sound.play('hit', { volume: 0.5 })
    if (this.health <= 0) this.gameOver()
  }

  private spawnSplatter(x: number, y: number, radius: number) {
    const color = Phaser.Utils.Array.GetRandom(SPLATTER_COLORS)
    const g = this.add.graphics()
    g.fillStyle(color, 0.9)
    g.fillCircle(0, 0, radius)
    g.setPosition(x, y)
    g.setDepth(-1)
    this.splatterLayer.add(g)
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 2000,
      delay: 500,
      onComplete: () => g.destroy(),
    })
  }

  private spawnPowerup(x: number, y: number) {
    const types: PowerupType[] = ['piercing', 'dash', 'slowtime', 'paintbomb']
    const type = Phaser.Utils.Array.GetRandom(types)
    const p = this.physics.add.sprite(x, y, 'powerup')
    p.setScale(SPRITE_SCALE)
    p.setData('type', type)
    p.setDepth(8)
    this.powerups.add(p)
    this.worldContainer.add(p)
  }

  private checkWaveComplete() {
    if (this.enemies.countActive() <= 0 && !this.boss) {
      this.advanceToNextWave()
    }
  }

  private advanceToNextWave() {
    this.time.delayedCall(WAVE_CLEAR_DELAY, () => {
      this.repositionSurvivingFriendlies()
      if (Math.random() < POWERUP_SPAWN_CHANCE) {
        const center = this.getViewCenter()
        this.spawnPowerup(center.x + Phaser.Math.Between(-80, 80), center.y)
      }
      this.waveNumber++
      this.updateMapForWave()
      this.waveText.setText(
        this.waveNumber + 1 === BOSS_WAVE ? 'BOSS INCOMING' : `Wave ${this.waveNumber + 1}`
      )
      if (this.waveNumber + 1 === BOSS_WAVE) {
        this.bossWarningText.setText('BOSS INCOMING!').setVisible(true)
        this.time.delayedCall(2000, () => {
          this.bossWarningText.setVisible(false)
          this.startWave()
        })
      } else {
        this.startWave()
      }
    })
  }

  private repositionSurvivingFriendlies() {
    this.friendlies.getChildren().forEach((f, i) => {
      const sprite = f as Phaser.Physics.Arcade.Sprite
      if (!sprite.active) return
      const slot = (sprite.getData('slot') as number) ?? i
      const pos = this.getAllyFormationPosition(slot)
      sprite.setPosition(pos.x, pos.y)
    })
  }

  private startWave() {
    const { width, height } = this.cameras.main
    const center = this.getMoveBoundaryCenter()

    if (this.waveNumber + 1 === BOSS_WAVE) {
      this.startBoss()
      return
    }

    const slots = getFormationsForWave(
      this.waveNumber + 1,
      center.x,
      center.y,
      width,
      height
    )
    const formationCenterX = slots.reduce((s, slot) => s + slot.x, 0) / slots.length
    const formationCenterY = slots.reduce((s, slot) => s + slot.y, 0) / slots.length

    for (const slot of slots) {
      this.spawnEnemy(slot, formationCenterX, formationCenterY)
    }

    const centerSlot: FormationSlot = {
      x: center.x,
      y: center.y,
      role: 'minion',
      texture: 'enemy',
    }
    this.spawnEnemy(centerSlot, center.x, center.y)

    if (this.waveNumber + 1 >= FRIENDLY_WAVE && this.waveNumber + 1 !== BOSS_WAVE) {
      this.spawnFriendlies()
    }
  }

  private getAllyFormationPosition(slot: number) {
    const center = this.getViewCenter()
    const aimRad = Math.atan2(this.pointerY - this.player.y, this.pointerX - this.player.x)
    const side = slot % 2
    const row = Math.floor(slot / 2)
    const slotAngle = aimRad + (side === 0 ? -Math.PI / 2 : Math.PI / 2)
    const dist = ALLY_FORMATION_DISTANCE + row * ALLY_ROW_SPACING
    return {
      x: center.x + Math.cos(slotAngle) * dist,
      y: center.y + Math.sin(slotAngle) * dist,
      aimRad,
      slotAngle,
      dist,
    }
  }

  private spawnFriendlies() {
    const surviving = this.friendlies.countActive()
    const targetCount = surviving + 1
    const toSpawn = targetCount - surviving
    for (let i = 0; i < toSpawn; i++) {
      const slot = this.getNextAllySlot()
      const pos = this.getAllyFormationPosition(slot)
      const f = this.physics.add.sprite(pos.x, pos.y, 'friendly')
      f.setScale(SPRITE_SCALE)
      f.setTint(0x88ff88)
      f.setDepth(7)
      f.setData('lastShot', 0)
      f.setData('slot', slot)
      f.setCollideWorldBounds(true)
      this.friendlies.add(f)
      this.worldContainer.add(f)
    }
  }

  private getNextAllySlot(): number {
    const used = new Set<number>()
    this.friendlies.getChildren().forEach((f) => {
      const sprite = f as Phaser.Physics.Arcade.Sprite
      if (sprite.active) used.add(sprite.getData('slot') as number)
    })
    let slot = 0
    while (used.has(slot)) slot++
    return slot
  }

  private startBoss() {
    const center = this.getMoveBoundaryCenter()
    this.bossHealth = 6
    this.bossMaxHealth = 6
    this.bossPhase = 1
    this.boss = this.physics.add.sprite(center.x, center.y - 80, 'enemy')
    this.boss.setData('role', 'leader')
    this.boss.setData('lastShot', 0)
    this.boss.setData('isBoss', true)
    this.boss.setScale(SPRITE_SCALE * 1.5)
    this.boss.setDepth(6)
    this.enemies.add(this.boss)
    this.worldContainer.add(this.boss)
  }

  private spawnEnemy(slot: FormationSlot, formationCenterX: number, formationCenterY: number) {
    const enemy = this.physics.add.sprite(slot.x, slot.y, slot.texture)
    enemy.setScale(SPRITE_SCALE)
    enemy.setData('role', slot.role)
    enemy.setData('health', ENEMY_HP)
    enemy.setData('lastShot', 0)
    enemy.setData('formationOffsetX', slot.x - formationCenterX)
    enemy.setData('formationOffsetY', slot.y - formationCenterY)
    enemy.setDepth(5)
    this.enemies.add(enemy)
    this.worldContainer.add(enemy)
    return enemy
  }

  private gameOver() {
    this.isGameOver = true
    this.physics.pause()
    this.player.setVisible(false)
    const { width, height } = this.cameras.main
    this.add
      .text(width / 2, height / 2 - 20, 'GAME OVER', {
        fontSize: '36px',
        color: '#ff6b6b',
      })
      .setOrigin(0.5)
      .setDepth(200)
    this.add
      .text(width / 2, height / 2 + 30, `Wave ${this.waveNumber + 1}`, {
        fontSize: '20px',
        color: '#aaa',
      })
      .setOrigin(0.5)
      .setDepth(200)
    this.add
      .text(width / 2, height / 2 + 70, 'Click to Restart', {
        fontSize: '18px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setDepth(200)
    this.input.once('pointerdown', () => {
      this.isGameOver = false
      this.scene.restart()
    })
  }

  update(time: number, delta: number) {
    if (!this.player.active || this.isGameOver) return

    this.timeSinceStart += delta
    const ramp = Math.min(1 + this.timeSinceStart / 120000, 1.5)

    if (this.activePowerup === 'slowtime') {
      if (this.time.now >= this.powerupEndTime) this.clearPowerup()
      else this.physics.world.timeScale = 0.4
    } else {
      this.physics.world.timeScale = 1
    }

    const { width, height } = this.cameras.main
    const moveAmount = (PLAYER_SPEED * delta) / 1000
    const maxScrollX = Math.max(0, MAP_SECTIONS_WIDE * width - width)
    const maxScrollY = Math.max(0, MAP_SECTIONS_TALL * height - height)

    if (this.dashActive) {
      this.worldScrollX += (this.dashDirection.x * delta) / 1000
      this.worldScrollY += (this.dashDirection.y * delta) / 1000
    } else {
      if (this.cursors.right.isDown || this.wasd.D.isDown) this.worldScrollX += moveAmount
      else if (this.cursors.left.isDown || this.wasd.A.isDown) this.worldScrollX -= moveAmount
      if (this.cursors.down.isDown || this.wasd.S.isDown) this.worldScrollY += moveAmount
      else if (this.cursors.up.isDown || this.wasd.W.isDown) this.worldScrollY -= moveAmount
    }
    this.worldScrollX = Phaser.Math.Clamp(this.worldScrollX, 0, maxScrollX)
    this.worldScrollY = Phaser.Math.Clamp(this.worldScrollY, 0, maxScrollY)
    this.worldContainer.setPosition(-this.worldScrollX, -this.worldScrollY)

    if (this.pointerDown && this.canShoot && time - this.lastHoldShot > HOLD_FIRE_INTERVAL) {
      this.lastHoldShot = time
      this.canShoot = false
      this.time.delayedCall(this.shootCooldown, () => {
        this.canShoot = true
      })
      this.fireBullet()
    }

    if (this.activePowerup === 'piercing' && this.powerupEndTime > 0 && time >= this.powerupEndTime) {
      this.clearPowerup()
    }
    const aimAngle = Phaser.Math.RadToDeg(
      Math.atan2(this.pointerY - this.player.y, this.pointerX - this.player.x)
    )
    this.player.setAngle(aimAngle)
    this.updatePowerupIcon()
    const friendlyCount = this.friendlies.countActive()
    if (friendlyCount > 0) {
      this.friendlyCountText.setText(`Allies: ${friendlyCount}`).setVisible(true)
    } else {
      this.friendlyCountText.setVisible(false)
    }

    const chaserSpeed = ENEMY_CHASER_SPEED * ramp
    const rangedRate = ENEMY_RANGED_FIRE_RATE / ramp
    const bulletSpeed = ENEMY_BULLET_SPEED * ramp

    this.friendlies.getChildren().forEach((f) => {
      const ally = f as Phaser.Physics.Arcade.Sprite
      if (!ally.active) return
      ally.setAngle(aimAngle)
      const slot = (ally.getData('slot') as number) ?? 0
      const pos = this.getAllyFormationPosition(slot)
      const targetX = pos.x
      const targetY = pos.y
      const dx = targetX - ally.x
      const dy = targetY - ally.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 5) {
        const len = dist || 1
        ally.setVelocity(
          (dx / len) * PLAYER_SPEED,
          (dy / len) * PLAYER_SPEED
        )
      } else {
        ally.setVelocity(0, 0)
        ally.setPosition(targetX, targetY)
      }
      const lastShot = ally.getData('lastShot') as number
      if (time - lastShot <= ALLY_FIRE_RATE) return
      let nearest: Phaser.Physics.Arcade.Sprite | null = null
      let nearestDist = ALLY_ATTACK_RANGE
      this.enemies.getChildren().forEach((e) => {
        const enemy = e as Phaser.Physics.Arcade.Sprite
        if (!enemy.active) return
        const ex = enemy.x - ally.x
        const ey = enemy.y - ally.y
        const d = Math.sqrt(ex * ex + ey * ey)
        if (d < nearestDist) {
          nearestDist = d
          nearest = enemy
        }
      })
      if (nearest) {
        ally.setData('lastShot', time)
        const tx = (nearest as Phaser.Physics.Arcade.Sprite).x - ally.x
        const ty = (nearest as Phaser.Physics.Arcade.Sprite).y - ally.y
        const len = Math.sqrt(tx * tx + ty * ty) || 1
        const bullet = this.allyBullets.get(
          ally.x,
          ally.y,
          'allyBullet'
        ) as Phaser.Physics.Arcade.Image
        if (bullet) {
          bullet.setVelocity(
            (tx / len) * ALLY_BULLET_SPEED,
            (ty / len) * ALLY_BULLET_SPEED
          )
          bullet.setActive(true)
          bullet.setVisible(true)
          this.worldContainer.add(bullet)
        }
      }
    })

    const viewCenter = this.getViewCenter()

    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return
      if (enemy.getData('isBoss')) return
      const role = enemy.getData('role') as EnemyRole
      const toTargetX = viewCenter.x - enemy.x
      const toTargetY = viewCenter.y - enemy.y
      const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetY * toTargetY) || 1
      const speed = role === 'ranged' || role === 'leader' ? ENEMY_FORMATION_DRIFT : chaserSpeed
      enemy.setVelocity(
        (toTargetX / distToTarget) * speed,
        (toTargetY / distToTarget) * speed
      )
      if (role === 'ranged' || role === 'leader') {
        const lastShot = enemy.getData('lastShot') as number
        if (time - lastShot > rangedRate) {
          enemy.setData('lastShot', time)
          const dx = viewCenter.x - enemy.x
          const dy = viewCenter.y - enemy.y
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const bullet = this.enemyBullets.get(
            enemy.x,
            enemy.y,
            'enemyBullet'
          ) as Phaser.Physics.Arcade.Image
          if (bullet) {
            bullet.setVelocity((dx / len) * bulletSpeed, (dy / len) * bulletSpeed)
            bullet.setActive(true)
            bullet.setVisible(true)
            this.worldContainer.add(bullet)
          }
        }
      }
    })

    if (this.boss && this.boss.active) {
      if (this.bossPhase >= 2) {
        const lastShot = this.boss.getData('lastShot') as number
        if (time - lastShot > 800) {
          this.boss.setData('lastShot', time)
          for (let i = 0; i < 3; i++) {
            const angle = (time * 0.002 + (i / 3) * Math.PI * 2) % (Math.PI * 2)
            const bullet = this.enemyBullets.get(
              this.boss.x,
              this.boss.y,
              'enemyBullet'
            ) as Phaser.Physics.Arcade.Image
            if (bullet) {
              bullet.setVelocity(
                Math.cos(angle) * bulletSpeed * 1.2,
                Math.sin(angle) * bulletSpeed * 1.2
              )
              bullet.setActive(true)
              bullet.setVisible(true)
              this.worldContainer.add(bullet)
            }
          }
        }
      }
    }

    const padding = 20
    const minX = this.worldScrollX - padding
    const maxX = this.worldScrollX + width + padding
    const minY = this.worldScrollY - padding
    const maxY = this.worldScrollY + height + padding
    const cullBullets = (group: Phaser.Physics.Arcade.Group) => {
      group.getChildren().forEach((b) => {
        const bullet = b as Phaser.Physics.Arcade.Image
        if (!bullet.active) return
        if (bullet.x < minX || bullet.x > maxX || bullet.y < minY || bullet.y > maxY)
          bullet.destroy()
      })
    }
    cullBullets(this.bullets)
    cullBullets(this.enemyBullets)
    cullBullets(this.allyBullets)
  }
}
