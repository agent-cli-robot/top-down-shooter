import { Player } from "../entities/player";
import { Enemy } from "../entities/enemy";
import { Bullet } from "../entities/bullet";
import { Particle } from "../entities/particle";
import { Drop } from "../entities/drop";
import { BuyStation } from "../entities/buystation";
import { Wall } from "../entities/wall";
import { Door } from "../entities/door";
import { Room } from "../entities/room";
import { weapons } from "@/lib/weapons";

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2000;
const BUY_STATION_SIZE = 40;
const HEALTH_COST = 75;

export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  drops: Drop[];
  buyStations: BuyStation[];
  walls: Wall[];
  doors: Door[];
  rooms: Room[];
  accessibleRooms: Set<number>; // Initially only the lower left room is accessible (player starting position)
  lastShot: number;
  lastEnemySpawn: number;
  nextEnemyId: number;
  nextBulletId: number;
  nextParticleId: number;
  nextDropId: number;
  powerupActive: boolean;
  powerupEndTime: number;
  gamepadIndex: number; // Track connected gamepad
  damageFlash: number;
  screenShake: number;
  lastHealth: number;
  cameraX: number;
  cameraY: number;
  currentWeapon: number; // 3 = primary rifle, 1 = pistol - Start with pistol since it's the only weapon
  lastWeaponSwitch: number; // Debounce weapon switching
  lastTriggerState: boolean; // Track trigger state for single-shot pistol
  isReloading: boolean; // Track reload state
  reloadStartTime: number; // Track reload timing
  lastTime: number; // Track last frame time for deltaTime calculation
  playerDead: boolean; // Track if player is dead
  difficulty: 'easy' | 'medium' | 'hard'; // Game difficulty level
}

export const createInitialGameState = (): GameState => {
  return {
    player: {
      x: 200,
      y: WORLD_HEIGHT / 2,
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
    },
    enemies: [],
    bullets: [],
    particles: [],
    drops: [],
    buyStations: [
      { x: 250, y: WORLD_HEIGHT / 2, type: "weapon" as const, weaponType: 3, cost: weapons.find(w => w.id === 3)!.cost, size: BUY_STATION_SIZE }, // Rifle in left room 2
      { x: 800, y: 300, type: "health" as const, cost: HEALTH_COST, size: BUY_STATION_SIZE }, // Health in center top room
      { x: 1800, y: 1400, type: "weapon" as const, weaponType: 4, cost: weapons.find(w => w.id === 4)!.cost, size: BUY_STATION_SIZE }, // Shotgun in center bottom room
      { x: 2600, y: 800, type: "health" as const, cost: HEALTH_COST, size: BUY_STATION_SIZE }, // Health in right middle room
      { x: 1000, y: 1000, type: "weapon" as const, weaponType: 5, cost: weapons.find(w => w.id === 5)!.cost, size: BUY_STATION_SIZE }, // SMG in center right middle room
      { x: 1300, y: 1700, type: "ammo" as const, cost: weapons.find(w => w.id === 3)!.cost / 2, size: BUY_STATION_SIZE }, // Ammo reload for rifle near center bottom
      { x: 2200, y: 500, type: "ammo" as const, cost: weapons.find(w => w.id === 4)!.cost / 2, size: BUY_STATION_SIZE }, // Ammo reload for shotgun in right top room
      { x: 400, y: 200, type: "weapon" as const, weaponType: 6, cost: weapons.find(w => w.id === 6)!.cost, size: BUY_STATION_SIZE }, // Sniper in left room 1
      { x: 2100, y: 1300, type: "ammo" as const, cost: weapons.find(w => w.id === 5)!.cost / 2, size: BUY_STATION_SIZE }, // Ammo reload for SMG in right bottom room
    ],
    walls: [
      // Outer walls
      { x: 0, y: 0, width: WORLD_WIDTH, height: 20 },
      { x: 0, y: WORLD_HEIGHT - 20, width: WORLD_WIDTH, height: 20 },
      { x: 0, y: 0, width: 20, height: WORLD_HEIGHT },
      { x: WORLD_WIDTH - 20, y: 0, width: 20, height: WORLD_HEIGHT },

      // Main vertical divider (left section)
      { x: 700, y: 20, width: 30, height: 450 },
      { x: 700, y: 750, width: 30, height: 1230 },

      // Main vertical divider (middle section)
      { x: 1500, y: 20, width: 30, height: 550 },
      { x: 1500, y: 900, width: 30, height: 1080 },

      // Horizontal dividers
      { x: 730, y: 600, width: 470, height: 30 },
      { x: 1530, y: 600, width: 470, height: 30 },
      { x: 730, y: 1300, width: 470, height: 30 },
      { x: 1530, y: 1300, width: 470, height: 30 },

      // Interior obstacles for cover
      { x: 200, y: 400, width: 250, height: 30 },
      { x: 300, y: 900, width: 30, height: 250 },
      { x: 900, y: 300, width: 30, height: 200 },
      { x: 1100, y: 1100, width: 200, height: 30 },
      { x: 1700, y: 300, width: 250, height: 30 },
      { x: 2200, y: 800, width: 30, height: 300 },
      { x: 2000, y: 1500, width: 300, height: 30 },
      { x: 400, y: 1600, width: 200, height: 30 },
    ],
    doors: [
      { x: 700, y: 450, width: 30, height: 330, cost: 100, isOpen: false, id: 0 }, // Vertical door - covers gap between walls
      { x: 1180, y: 600, width: 340, height: 30, cost: 150, isOpen: false, id: 1 }, // Horizontal door - covers gap between walls
      { x: 1500, y: 550, width: 30, height: 370, cost: 200, isOpen: false, id: 2 }, // Vertical door - covers gap between walls
      { x: 1180, y: 1300, width: 340, height: 30, cost: 150, isOpen: false, id: 3 }, // Horizontal door - covers gap between walls
    ],
    rooms: [
      // Define rooms that can contain enemies
      { x: 20, y: 20, width: 680, height: 580 },         // Left room 1
      { x: 20, y: 750, width: 680, height: 1230 },       // Left room 2
      { x: 730, y: 20, width: 770, height: 580 },        // Center top room
      { x: 730, y: 630, width: 450, height: 670 },       // Center left middle room
      { x: 1530, y: 630, width: 450, height: 670 },      // Center right middle room
      { x: 730, y: 1330, width: 770, height: 650 },      // Center bottom room
      { x: 1530, y: 20, width: 1450, height: 580 },      // Right top room
      { x: 1530, y: 900, width: 1450, height: 400 },     // Right middle room
      { x: 1530, y: 1330, width: 1450, height: 650 },    // Right bottom room
    ],
    accessibleRooms: new Set<number>([1]), // Initially only the lower left room is accessible (player starting position)
    lastShot: 0,
    lastEnemySpawn: 0,
    nextEnemyId: 0,
    nextBulletId: 0,
    nextParticleId: 0,
    nextDropId: 0,
    powerupActive: false,
    powerupEndTime: 0,
    gamepadIndex: -1, // Track connected gamepad
    damageFlash: 0,
    screenShake: 0,
    lastHealth: 100,
    cameraX: 0,
    cameraY: 0,
    currentWeapon: 1, // 3 = primary rifle, 1 = pistol - Start with pistol since it's the only weapon
    lastWeaponSwitch: 0, // Debounce weapon switching
    lastTriggerState: false, // Track trigger state for single-shot pistol
    isReloading: false, // Track reload state
    reloadStartTime: 0, // Track reload timing
    lastTime: 0, // Track last frame time for deltaTime calculation
    playerDead: false, // Track if player is dead
    difficulty: 'medium', // Default difficulty is medium
  };
};

export const resetGameState = (currentGamepadIndex: number, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): GameState => {
  const baseState = createInitialGameState();
  baseState.gamepadIndex = currentGamepadIndex;
  baseState.difficulty = difficulty;
  baseState.lastTime = 0; // Reset lastTime to 0 when game state resets
  baseState.playerDead = false; // Ensure player is alive when game resets
  return baseState;
};