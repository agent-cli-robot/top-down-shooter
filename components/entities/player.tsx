export interface Player {
  x: number
  y: number
  angle: number
  health: number
  maxHealth: number
  kills: number
  speed: number
  currency: number
  weapons: { id: number; ammo: number; magSize: number }[]
  currentWeapon: number // Current selected weapon
  headSprite: number
  bodySprite: number
  weaponSprite: number
}

export const createInitialPlayer = (): Player => ({
  x: 200,
  y: 1000, // WORLD_HEIGHT / 2
  angle: 0,
  health: 100,
  maxHealth: 100,
  kills: 0,
  speed: 3,
  currency: 100,
  weapons: [{ id: 1, ammo: 8, magSize: 8 }],
  currentWeapon: 1, // Start with pistol (weapon 1)
  headSprite: 1, // Player uses head sprite 1
  bodySprite: 1, // Player uses body sprite 1
  weaponSprite: 1, // Start with pistol sprite
})