export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  id: number
}

export const createParticles = (x: number, y: number, count: number, color: string, idCounter: number): {particles: Particle[], nextId: number} => {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 3 + 1
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30,
      maxLife: 30,
      size: Math.random() * 3 + 2,
      color,
      id: idCounter++
    })
  }
  return { particles, nextId: idCounter }
}