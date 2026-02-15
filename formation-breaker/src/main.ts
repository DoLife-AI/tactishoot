import './style.css'
import Phaser from 'phaser'
import { config } from './game'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = '<div id="game"></div>'

new Phaser.Game(config)
