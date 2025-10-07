export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  id: number
}

export const createBullet = (x: number, y: number, angle: number, bulletSpeed: number, id: number): Bullet => {
  return {
    x,
    y,
    vx: Math.cos(angle) * bulletSpeed,
    vy: Math.sin(angle) * bulletSpeed,
    id
  }
}