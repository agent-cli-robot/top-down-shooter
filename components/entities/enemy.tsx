export interface Enemy {
  x: number
  y: number
  health: number
  maxHealth: number
  speed: number
  angle: number
  id: number
  headSprite: number
  bodySprite: number
  weaponSprite: number
  isRoaming: boolean; // Whether the enemy is roaming or attacking
  roamTargetX?: number; // Target X position when roaming
  roamTargetY?: number; // Target Y position when roaming
  lastRoamChange: number; // Timestamp of last roam target change
  roamDirectionX: number; // X direction when roaming
  roamDirectionY: number; // Y direction when roaming
}

export const createRandomEnemy = (x: number, y: number, id: number): Enemy => {
  // Randomly assign head, body, and weapon sprites to enemy
  const randomHeadSprite = Math.floor(Math.random() * 14) + 1; // Heads 1-14
  const randomBodySprite = Math.floor(Math.random() * 3) + 1;  // Bodies 1-3
  const randomWeaponSprite = Math.floor(Math.random() * 10) + 1; // Weapons 1-10
  
  // Random roam direction
  const angle = Math.random() * Math.PI * 2;
  
  return {
    x,
    y,
    health: 30,
    maxHealth: 30,
    speed: 1 + Math.random() * 0.5,
    angle: 0,
    id,
    headSprite: randomHeadSprite,
    bodySprite: randomBodySprite,
    weaponSprite: randomWeaponSprite,
    isRoaming: false, // Start attacking player by default
    lastRoamChange: Date.now(),
    roamDirectionX: Math.cos(angle),
    roamDirectionY: Math.sin(angle),
  }
}