export interface Drop {
  x: number
  y: number
  type: "ammo" | "money" | "powerup"
  id: number
  size: number
  spawnTime: number // Added spawn time to track drop lifetime
}

export const createDrop = (x: number, y: number, timestamp: number, id: number): Drop => {
  const rand = Math.random()
  let dropType: "ammo" | "money" | "powerup"

  if (rand < 0.4) {
    dropType = "ammo"
  } else if (rand < 0.75) {
    dropType = "money"
  } else {
    dropType = "powerup"
  }

  return {
    x,
    y,
    type: dropType,
    id,
    size: 12, // DROP_SIZE
    spawnTime: timestamp,
  }
}