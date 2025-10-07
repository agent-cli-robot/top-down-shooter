export interface BuyStation {
  x: number
  y: number
  type: "weapon" | "health" | "ammo" // Ammo is for reloading
  weaponType?: number // For weapon stations, specify which weapon
  cost: number
  size: number
}