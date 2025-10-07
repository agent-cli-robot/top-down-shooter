import { GameState } from "../game-state/state-manager";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemy";
import { createRandomEnemy } from "../entities/enemy";
import { Bullet } from "../entities/bullet";
import { createBullet } from "../entities/bullet";
import { createParticles } from "../entities/particle";
import { createDrop } from "../entities/drop";
import { checkWallCollision } from "../physics/collision";
import { useAudioManager } from "@/lib/use-audio";
import { weapons } from "@/lib/weapons";
import { inputManager } from "@/lib/input-manager";

const PLAYER_SIZE = 24;
const ENEMY_SIZE = 24;
const BULLET_SIZE = 4;
const ENEMY_SPAWN_INTERVAL = 2000;
const MAX_ENEMIES = 15;
const DROP_SIZE = 12;

export const updateRoomAccessibility = (state: GameState) => {
  // Start with the room the player is currently in
  const playerRoomIndex = getRoomAtPosition(state.player.x, state.player.y, state.rooms);
  if (playerRoomIndex !== null) {
    state.accessibleRooms.add(playerRoomIndex);
  }

  // Iterate through all doors to see which rooms become accessible
  for (const door of state.doors) {
    if (door.isOpen) {
      // Check which rooms this door connects
      for (let i = 0; i < state.rooms.length; i++) {
        const room1 = state.rooms[i];
        for (let j = 0; j < state.rooms.length; j++) {
          if (i === j) continue; // Skip same room
          
          const room2 = state.rooms[j];
          
          // Check if this door connects these two rooms
          // For a vertical door
          if (door.width < door.height) { // Vertical door
            if (
              Math.abs(door.x - (room1.x + room1.width)) < 20 && 
              door.x >= room1.x && 
              door.x <= room1.x + room1.width &&
              door.y + door.height >= room1.y && 
              door.y <= room1.y + room1.height &&
              Math.abs(door.x - room2.x) < 20 && 
              door.x >= room2.x && 
              door.x <= room2.x + room2.width &&
              door.y + door.height >= room2.y && 
              door.y <= room2.y + room2.height
            ) {
              // Door connects room1 and room2
              if (state.accessibleRooms.has(i)) {
                state.accessibleRooms.add(j);
              } else if (state.accessibleRooms.has(j)) {
                state.accessibleRooms.add(i);
              }
            }
          } 
          // For a horizontal door
          else { // Horizontal door
            if (
              Math.abs(door.y - (room1.y + room1.height)) < 20 && 
              door.y >= room1.y && 
              door.y <= room1.y + room1.height &&
              door.x + door.width >= room1.x && 
              door.x <= room1.x + room1.width &&
              Math.abs(door.y - room2.y) < 20 && 
              door.y >= room2.y && 
              door.y <= room2.y + room2.height &&
              door.x + door.width >= room2.x && 
              door.x <= room2.x + room2.width
            ) {
              // Door connects room1 and room2
              if (state.accessibleRooms.has(i)) {
                state.accessibleRooms.add(j);
              } else if (state.accessibleRooms.has(j)) {
                state.accessibleRooms.add(i);
              }
            }
          }
        }
      }
    }
  }
};

const getRoomAtPosition = (x: number, y: number, rooms: {x: number, y: number, width: number, height: number}[]): number | null => {
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (
      x >= room.x &&
      x <= room.x + room.width &&
      y >= room.y &&
      y <= room.y + room.height
    ) {
      return i;
    }
  }
  return null;
};

const isPositionInAccessibleRoom = (x: number, y: number, rooms: {x: number, y: number, width: number, height: number}[], accessibleRooms: Set<number>): boolean => {
  const roomIndex = getRoomAtPosition(x, y, rooms);
  if (roomIndex !== null) {
    return accessibleRooms.has(roomIndex);
  }
  return false;
};

export const spawnEnemy = (state: GameState) => {
  if (state.enemies.length >= MAX_ENEMIES) return

  let x = 0,
    y = 0
  let validSpawn = false
  let attempts = 0

  while (!validSpawn && attempts < 50) {
    // Only try to spawn in accessible rooms
    const accessibleRoomIndices = Array.from(state.accessibleRooms);
    if (accessibleRoomIndices.length === 0) {
      // If no accessible rooms, try to spawn near the player (shouldn't happen in normal gameplay)
      const angle = Math.random() * Math.PI * 2
      const distance = 400 + Math.random() * 200
      x = state.player.x + Math.cos(angle) * distance
      y = state.player.y + Math.sin(angle) * distance
    } else {
      // Randomly select an accessible room to spawn in
      const randomRoomIndex = accessibleRoomIndices[Math.floor(Math.random() * accessibleRoomIndices.length)];
      const room = state.rooms[randomRoomIndex];
      
      // Generate position within the room
      x = room.x + Math.random() * (room.width - ENEMY_SIZE)
      y = room.y + Math.random() * (room.height - ENEMY_SIZE)
    }

    // Clamp to world bounds
    x = Math.max(30, Math.min(3000 - 30, x)) // WORLD_WIDTH = 3000
    y = Math.max(30, Math.min(2000 - 30, y)) // WORLD_HEIGHT = 2000

    if (!checkWallCollision(x, y, ENEMY_SIZE, state.walls, state.doors) && isPositionInAccessibleRoom(x, y, state.rooms, state.accessibleRooms)) {
      validSpawn = true
    }
    attempts++
  }

  if (!validSpawn) return

  state.enemies.push(createRandomEnemy(x, y, state.nextEnemyId++))
}

export const runGameLoop = (
  timestamp: number,
  deltaTime: number,
  state: GameState,
  canvas: HTMLCanvasElement | null,
  audioManager: ReturnType<typeof useAudioManager>,
  setGameOver: (gameOver: boolean) => void,
  setBuyPrompt: (prompt: { type: string; cost: number, weaponType?: number } | null) => void,
  setDoorPrompt: (prompt: { cost: number } | null) => void,
  setReloadPrompt: (prompt: boolean) => void,
  setControllerConnected: (connected: boolean) => void,
  setMinimapUpdate: (update: number) => void
) => {
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const previousHealth = state.lastHealth;

  // Update accessible rooms based on current door states and player position
  updateRoomAccessibility(state);

  // Check for interaction (E key or controller A button)
  if (inputManager.isKeyPressed("KeyE") || (state.gamepadIndex >= 0 && navigator.getGamepads()[state.gamepadIndex]?.buttons[0]?.pressed)) {
    let doorPurchased = false;
    state.doors.forEach((door) => {
      if (!door.isOpen) {
        const dist = Math.sqrt(
          Math.pow(state.player.x - (door.x + door.width / 2), 2) +
            Math.pow(state.player.y - (door.y + door.height / 2), 2),
        );
        if (dist < 50) {
          setDoorPrompt({ cost: door.cost });
          if (state.player.currency >= door.cost) {
            state.player.currency -= door.cost;
            door.isOpen = true;
            doorPurchased = true;
            updateRoomAccessibility(state); // Update accessible rooms after opening a door
            // Create particles at door position
            const { particles, nextId } = createParticles(door.x + door.width / 2, door.y + door.height / 2, 20, "#00ff00", state.nextParticleId);
            state.particles.push(...particles);
            state.nextParticleId = nextId;
            audioManager.playSound('power-up-1'); // Play sound when opening door
          }
        }
      } else {
        // Hide door prompt if player moves away
        const anyNear = state.doors.some(d => !d.isOpen && 
          Math.sqrt(Math.pow(state.player.x - (d.x + d.width / 2), 2) + 
          Math.pow(state.player.y - (d.y + d.height / 2), 2)) < 50
        );
        if (!anyNear) {
          setDoorPrompt(null);
        }
      }
    });

    if (!doorPurchased) {
      state.buyStations.forEach((station) => {
        const dist = Math.sqrt(Math.pow(state.player.x - station.x, 2) + Math.pow(state.player.y - station.y, 2));
        if (dist < station.size + PLAYER_SIZE) {
          // Show prompt when near station
          if (station.type === "weapon") {
            let weaponName = "Unknown";
            if (station.weaponType === 3) weaponName = "RIFLE";
            else if (station.weaponType === 4) weaponName = "SHOTGUN";
            else if (station.weaponType === 5) weaponName = "SMG";
            else if (station.weaponType === 6) weaponName = "SNIPER";
            
            setBuyPrompt({ type: `WEAPON (${weaponName})`, cost: station.cost, weaponType: station.weaponType });
          } else if (station.type === "ammo") {
            setBuyPrompt({ type: "AMMO", cost: station.cost });
          } else { // health
            setBuyPrompt({ type: "HEALTH", cost: station.cost });
          }

          if (state.player.currency >= station.cost) {
            state.player.currency -= station.cost;
            if (station.type === "weapon") {
              const weapon = weapons.find(w => w.id === station.weaponType);
              if (weapon && !state.player.weapons.some(w => w.id === weapon.id)) {
                state.player.weapons.push({ id: weapon.id, ammo: weapon.magSize, magSize: weapon.magSize });
                audioManager.playSound('power-up-1'); // Play sound when buying weapon
              }
            } else if (station.type === "ammo") {
              const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
              if (currentWeapon) {
                currentWeapon.ammo = currentWeapon.magSize;
              }
              audioManager.playSound('pick-up'); // Play sound when buying ammo
            } else if (station.type === "health") {
              state.player.health = Math.min(state.player.health + 50, state.player.maxHealth);
              audioManager.playSound('power-up-1'); // Play sound when buying health
            }
          }
        } else {
          // Check if we need to hide the prompt because player moved away
          const anyNear = state.buyStations.some(s => 
            Math.sqrt(Math.pow(state.player.x - s.x, 2) + Math.pow(state.player.y - s.y, 2)) < s.size + PLAYER_SIZE
          );
          if (!anyNear) {
            setBuyPrompt(null);
          }
        }
      });
    }
  }

  // Handle weapon reload (R key or controller X button)
  if (inputManager.isKeyPressed("KeyR") || (state.gamepadIndex >= 0 && navigator.getGamepads()[state.gamepadIndex]?.buttons[2]?.pressed)) {
    const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
    if (currentWeapon && currentWeapon.ammo < currentWeapon.magSize && !state.isReloading) {
      state.isReloading = true;
      state.reloadStartTime = Date.now();
    }
  }

  // Handle weapon switching with number keys (1-9)
  for (let i = 1; i <= 9; i++) {
    if (inputManager.isKeyPressed(`Digit${i}`)) {
      const weaponIndex = i - 1;
      if (state.player.weapons[weaponIndex]) {
        state.currentWeapon = state.player.weapons[weaponIndex].id;
      }
    }
  }

  // Continuously check for near door/buy station prompts regardless of key presses
  let doorFound = false;
  let buyStationFound = false;
  
  state.doors.forEach((door) => {
    if (!door.isOpen) {
      const dist = Math.sqrt(
        Math.pow(state.player.x - (door.x + door.width / 2), 2) +
          Math.pow(state.player.y - (door.y + door.height / 2), 2),
      );
      if (dist < 50) {
        setDoorPrompt({ cost: door.cost });
        doorFound = true;
      }
    }
  });
  
  if (!doorFound) {
    // Only check buy stations if no door is nearby
    state.buyStations.forEach((station) => {
      const dist = Math.sqrt(Math.pow(state.player.x - station.x, 2) + Math.pow(state.player.y - station.y, 2));
      if (dist < station.size + PLAYER_SIZE) {
        // Show prompt when near station
        if (station.type === "weapon") {
          let weaponName = "Unknown";
          if (station.weaponType === 3) weaponName = "RIFLE";
          else if (station.weaponType === 4) weaponName = "SHOTGUN";
          else if (station.weaponType === 5) weaponName = "SMG";
          else if (station.weaponType === 6) weaponName = "SNIPER";
          
          setBuyPrompt({ type: `WEAPON (${weaponName})`, cost: station.cost, weaponType: station.weaponType });
        } else if (station.type === "ammo") {
          setBuyPrompt({ type: "AMMO", cost: station.cost });
        } else { // health
          setBuyPrompt({ type: "HEALTH", cost: station.cost });
        }
        buyStationFound = true;
      }
    });
  }
  
  // Hide prompts if player moved away from all doors and buy stations
  if (!doorFound) {
    setDoorPrompt(null);
  }
  if (!buyStationFound) {
    setBuyPrompt(null);
  }

  // Handle reload process
  if (state.isReloading) {
    const reloadTime = 1500; // 1.5 seconds to reload
    if (Date.now() - state.reloadStartTime >= reloadTime) {
      const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
      if (currentWeapon) {
        currentWeapon.ammo = currentWeapon.magSize;
      }
      state.isReloading = false;
      setReloadPrompt(false);
      audioManager.playSound('reload-pistol'); // Play reload sound
    }
  }

  let usingController = false;

  // Handle controller input if connected
  if (state.gamepadIndex >= 0) {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[state.gamepadIndex];

    if (gamepad) {
      const deadzone = 0.15;

      // Left stick for movement
      const leftStickX = gamepad.axes[0];
      const leftStickY = gamepad.axes[1];

      if (Math.abs(leftStickX) > deadzone || Math.abs(leftStickY) > deadzone) {
        const newX = state.player.x + leftStickX * state.player.speed * deltaTime * 60; // 60 is target FPS for consistent movement
        const newY = state.player.y + leftStickY * state.player.speed * deltaTime * 60;

        if (!checkWallCollision(newX, state.player.y, PLAYER_SIZE, state.walls, state.doors)) {
          state.player.x = Math.max(PLAYER_SIZE, Math.min(3000 - PLAYER_SIZE, newX)); // WORLD_WIDTH = 3000
        }
        if (!checkWallCollision(state.player.x, newY, PLAYER_SIZE, state.walls, state.doors)) {
          state.player.y = Math.max(PLAYER_SIZE, Math.min(2000 - PLAYER_SIZE, newY)); // WORLD_HEIGHT = 2000
        }
      }

      const rightStickX = gamepad.axes[2];
      const rightStickY = gamepad.axes[3];

      if (Math.abs(rightStickX) > deadzone || Math.abs(rightStickY) > deadzone) {
        state.player.angle = Math.atan2(rightStickY, rightStickX);
        usingController = true; // Mark that controller is controlling aim
      }

      if (gamepad.buttons[2]?.pressed) {
        const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
        if (currentWeapon && currentWeapon.ammo < currentWeapon.magSize && !state.isReloading) {
          state.isReloading = true;
          state.reloadStartTime = Date.now();
        }
      }

      if (gamepad.buttons[3]?.pressed) {
        const now = Date.now();
        if (now - state.lastWeaponSwitch > 300) {
          // Debounce
          const currentWeaponIndex = state.player.weapons.findIndex(w => w.id === state.currentWeapon);
          const nextWeaponIndex = (currentWeaponIndex + 1) % state.player.weapons.length;
          state.currentWeapon = state.player.weapons[nextWeaponIndex].id;
          state.lastWeaponSwitch = now;
        }
      }

      const rightTrigger = gamepad.buttons[7]?.value || 0;
      const triggerPressed = rightTrigger > 0.5;

      const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
      const canShoot = currentWeapon && currentWeapon.ammo > 0;

      if (triggerPressed && timestamp - state.lastShot > 150 && !state.isReloading && canShoot) {
        const bulletSpeed = state.currentWeapon === 4 ? 6 : 8; // Shotgun slower bullets
        // Calculate gun muzzle position (where the gun extends from player)
        const gunOffset = PLAYER_SIZE * 1.2; // Distance from player center to gun muzzle
        const gunX = state.player.x + Math.cos(state.player.angle) * gunOffset;
        const gunY = state.player.y + Math.sin(state.player.angle) * gunOffset;

        // Add multiple bullets for shotgun
        if (state.currentWeapon === 4) { // Shotgun
          for (let i = 0; i < 5; i++) { // 5 pellets
            const angleOffset = (Math.random() - 0.5) * 0.4; // Small angle variance
            const newBullet = createBullet(gunX, gunY, state.player.angle + angleOffset, bulletSpeed, state.nextBulletId++);
            state.bullets.push(newBullet);
          }
          currentWeapon.ammo--;
          audioManager.playSound('shotgun');
        } else {
          const newBullet = createBullet(gunX, gunY, state.player.angle, bulletSpeed, state.nextBulletId++);
          state.bullets.push(newBullet);
          currentWeapon.ammo--;
          audioManager.playSound('rifle'); // Using rifle sound for other weapons for now
        }

        state.lastShot = timestamp;
        
        // Create particles at muzzle position
        const { particles, nextId } = createParticles(gunX, gunY, 3, "#ffff00", state.nextParticleId);
        state.particles.push(...particles);
        state.nextParticleId = nextId;
      } else if (currentWeapon && currentWeapon.ammo === 0) {
        setReloadPrompt(true);
      }

      state.lastTriggerState = triggerPressed;

      // A button (button 0) for interaction - only for purchases when prompt is visible
      if (gamepad.buttons[0]?.pressed) {
        // Check doors first for purchase
        let doorPurchased = false;
        state.doors.forEach((door) => {
          if (!door.isOpen) {
            const dist = Math.sqrt(
              Math.pow(state.player.x - (door.x + door.width / 2), 2) +
                Math.pow(state.player.y - (door.y + door.height / 2), 2),
            );
            if (dist < 50) {
              if (state.player.currency >= door.cost) {
                state.player.currency -= door.cost;
                door.isOpen = true;
                doorPurchased = true;
                updateRoomAccessibility(state); // Update accessible rooms after opening a door
                // Create particles at door position
                const { particles, nextId } = createParticles(door.x + door.width / 2, door.y + door.height / 2, 20, "#00ff00", state.nextParticleId);
                state.particles.push(...particles);
                state.nextParticleId = nextId;
                audioManager.playSound('power-up-1'); // Play sound when opening door with controller
              }
            }
          }
        });

        // Check buy stations for purchase
        if (!doorPurchased) {
          state.buyStations.forEach((station) => {
            const dist = Math.sqrt(
              Math.pow(state.player.x - station.x, 2) + Math.pow(state.player.y - station.y, 2),
            );
            if (dist < station.size + PLAYER_SIZE) {
              if (state.player.currency >= station.cost) {
                state.player.currency -= station.cost;
                if (station.type === "weapon") {
                  const weapon = weapons.find(w => w.id === station.weaponType);
                  if (weapon && !state.player.weapons.some(w => w.id === weapon.id)) {
                    state.player.weapons.push({ id: weapon.id, ammo: weapon.magSize, magSize: weapon.magSize });
                    audioManager.playSound('power-up-1'); // Play sound when buying weapon
                  }
                } else if (station.type === "ammo") {
                  const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
                  if (currentWeapon) {
                    currentWeapon.ammo = currentWeapon.magSize;
                  }
                  audioManager.playSound('pick-up'); // Play sound when buying ammo
                } else if (station.type === "health") {
                  state.player.health = Math.min(state.player.health + 50, state.player.maxHealth);
                  audioManager.playSound('power-up-1'); // Play sound when buying health
                }
              }
            }
          });
        }
      }
    }
  }

  // Spawn enemies at intervals - using time-based approach
  if (timestamp - state.lastEnemySpawn > ENEMY_SPAWN_INTERVAL) {
    spawnEnemy(state);
    state.lastEnemySpawn = timestamp;
  }

  // Handle mouse aiming if not using controller
  if (!usingController && canvas) {
    const mousePosition = inputManager.getMousePosition();
    const rect = canvas.getBoundingClientRect();
    const canvasX = mousePosition.x - rect.left;
    const canvasY = mousePosition.y - rect.top;
    const mouseX = canvasX + state.cameraX;
    const mouseY = canvasY + state.cameraY;

    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    state.player.angle = Math.atan2(dy, dx);
  }

  // Handle shooting with mouse
  const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
  const canShoot = currentWeapon && currentWeapon.ammo > 0;

  if (inputManager.isMouseButtonPressed(0) && timestamp - state.lastShot > 150 && !state.isReloading && canShoot) {
    const bulletSpeed = state.currentWeapon === 4 ? 6 : 8; // Shotgun slower bullets
    // Calculate gun muzzle position (where the gun extends from player)
    const gunOffset = PLAYER_SIZE * 1.2; // Distance from player center to gun muzzle
    const gunX = state.player.x + Math.cos(state.player.angle) * gunOffset;
    const gunY = state.player.y + Math.sin(state.player.angle) * gunOffset;
    
    // Add multiple bullets for shotgun
    if (state.currentWeapon === 4) { // Shotgun
      for (let i = 0; i < 5; i++) { // 5 pellets
        const angleOffset = (Math.random() - 0.5) * 0.4; // Small angle variance
        const newBullet = createBullet(gunX, gunY, state.player.angle + angleOffset, bulletSpeed, state.nextBulletId++);
        state.bullets.push(newBullet);
      }
      currentWeapon.ammo--;
      audioManager.playSound('shotgun');
    } else {
      const newBullet = createBullet(gunX, gunY, state.player.angle, bulletSpeed, state.nextBulletId++);
      state.bullets.push(newBullet);

      currentWeapon.ammo--;
      audioManager.playSound('rifle'); // Using rifle sound for other weapons for now
    }

    state.lastShot = timestamp;
    
    // Create particles at muzzle position
    const { particles, nextId } = createParticles(gunX, gunY, 3, "#ffff00", state.nextParticleId);
    state.particles.push(...particles);
    state.nextParticleId = nextId;
  } else if (currentWeapon && currentWeapon.ammo === 0) {
    setReloadPrompt(true);
  }

  if (!inputManager.isMouseButtonPressed(0)) {
    state.lastTriggerState = false;
  } else {
    state.lastTriggerState = true;
  }

  // Handle player movement with keyboard
  let newX = state.player.x;
  let newY = state.player.y;

  if (inputManager.isKeyPressed("KeyW")) newY -= state.player.speed * deltaTime * 60; // 60 is target FPS for consistent movement
  if (inputManager.isKeyPressed("KeyS")) newY += state.player.speed * deltaTime * 60;
  if (inputManager.isKeyPressed("KeyA")) newX -= state.player.speed * deltaTime * 60;
  if (inputManager.isKeyPressed("KeyD")) newX += state.player.speed * deltaTime * 60;

  if (!checkWallCollision(newX, state.player.y, PLAYER_SIZE, state.walls, state.doors)) {
    state.player.x = Math.max(PLAYER_SIZE, Math.min(3000 - PLAYER_SIZE, newX)); // WORLD_WIDTH = 3000
  }
  if (!checkWallCollision(state.player.x, newY, PLAYER_SIZE, state.walls, state.doors)) {
    state.player.y = Math.max(PLAYER_SIZE, Math.min(2000 - PLAYER_SIZE, newY)); // WORLD_HEIGHT = 2000
  }

  // Calculate camera position to keep player centered
  const zoomLevel = 1.3; // 1.0 is normal, higher numbers are more zoomed in
  state.cameraX = state.player.x - (1200 / zoomLevel) / 2; // CANVAS_WIDTH = 1200
  state.cameraY = state.player.y - (800 / zoomLevel) / 2; // CANVAS_HEIGHT = 800

  // Clamp camera to world bounds (accounting for zoom)
  const visibleWidth = 1200 / zoomLevel; // CANVAS_WIDTH = 1200
  const visibleHeight = 800 / zoomLevel; // CANVAS_HEIGHT = 800
  state.cameraX = Math.max(0, Math.min(3000 - visibleWidth, state.cameraX)); // WORLD_WIDTH = 3000
  state.cameraY = Math.max(0, Math.min(2000 - visibleHeight, state.cameraY)); // WORLD_HEIGHT = 2000

  // Handle drops
  state.drops = state.drops.filter((drop) => {
    const dropAge = timestamp - drop.spawnTime;

    if (dropAge > 7000) {
      return false;
    }

    const dist = Math.sqrt(Math.pow(state.player.x - drop.x, 2) + Math.pow(state.player.y - drop.y, 2));
    if (dist < PLAYER_SIZE + drop.size) {
      if (drop.type === "ammo") {
        const currentWeapon = state.player.weapons.find(w => w.id === state.currentWeapon);
        if (currentWeapon) {
          currentWeapon.ammo = Math.min(currentWeapon.ammo + currentWeapon.magSize / 2, currentWeapon.magSize);
        }
        // Create particles at drop position
        const { particles, nextId } = createParticles(drop.x, drop.y, 8, "#ffaa00", state.nextParticleId);
        state.particles.push(...particles);
        state.nextParticleId = nextId;
        audioManager.playSound('pick-up'); // Play pickup sound
      } else if (drop.type === "money") {
        state.player.currency += 50;
        // Create particles at drop position
        const { particles, nextId } = createParticles(drop.x, drop.y, 8, "#00ff00", state.nextParticleId);
        state.particles.push(...particles);
        state.nextParticleId = nextId;
        audioManager.playSound('pick-up'); // Play pickup sound
      } else if (drop.type === "powerup") {
        state.powerupActive = true;
        state.powerupEndTime = timestamp + 5000;
        state.player.speed = 5;
        // Create particles at drop position
        const { particles, nextId } = createParticles(drop.x, drop.y, 12, "#ff00ff", state.nextParticleId);
        state.particles.push(...particles);
        state.nextParticleId = nextId;
        audioManager.playSound('power-up-1'); // Play powerup sound
      }
      return false;
    }
    return true;
  });

  // Process bullets
  state.bullets.forEach((bullet) => {
    // Calculate new position with time-based movement
    const newX = bullet.x + bullet.vx * deltaTime * 60; // 60 is target FPS for consistent movement
    const newY = bullet.y + bullet.vy * deltaTime * 60;
    
    // Check collision with walls and doors before moving the bullet
    if (!checkWallCollision(newX, bullet.y, BULLET_SIZE, state.walls, state.doors)) {
      bullet.x = newX;
    } else {
      // Bullet hit a wall or door, remove it
      bullet.x = -1; // Mark for removal by setting invalid position
    }
    
    if (!checkWallCollision(bullet.x, newY, BULLET_SIZE, state.walls, state.doors)) {
      bullet.y = newY;
    } else {
      // Bullet hit a wall or door, remove it
      bullet.y = -1; // Mark for removal by setting invalid position
    }
  });

  // Remove bullets that are outside the world bounds
  state.bullets = state.bullets.filter(
    (bullet) => bullet.x > 0 && bullet.x < 3000 && bullet.y > 0 && bullet.y < 2000, // WORLD_WIDTH = 3000, WORLD_HEIGHT = 2000
  );

  // Handle bullet-enemy collisions
  state.bullets = state.bullets.filter((bullet) => {
    let hit = false;
    state.enemies = state.enemies.filter((enemy) => {
      const dist = Math.sqrt(Math.pow(bullet.x - enemy.x, 2) + Math.pow(bullet.y - enemy.y, 2));
      if (dist < ENEMY_SIZE) {
        enemy.health -= 10;
        hit = true;

        // Create particles at enemy position
        const { particles, nextId } = createParticles(enemy.x, enemy.y, 5, "#ff0000", state.nextParticleId);
        state.particles.push(...particles);
        state.nextParticleId = nextId;

        if (enemy.health <= 0) {
          state.player.kills++;
          state.player.currency += 25;
          // Create particles when enemy dies
          const { particles, nextId } = createParticles(enemy.x, enemy.y, 15, "#ff0000", state.nextParticleId);
          state.particles.push(...particles);
          state.nextParticleId = nextId;

          if (Math.random() < 0.6) {
            state.drops.push(createDrop(enemy.x, enemy.y, timestamp, state.nextDropId++));
          }

          // Add enemy death sound (using a sound that fits)
          audioManager.playSound('power-up-1'); // Using power-up sound for enemy death

          return false;
        }
      }
      return true;
    });
    return !hit;
  });

  // Update enemies
  state.enemies.forEach((enemy, index) => {
    if (!state.playerDead) {
      // Player is alive - enemy attacks player
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      enemy.angle = Math.atan2(dy, dx);

      // Base movement on game difficulty
      let moveX, moveY;
      if (state.difficulty === 'easy') {
        // Original movement for easy difficulty
        moveX = enemy.x + (dx / dist) * enemy.speed * deltaTime * 60; // 60 is target FPS for consistent movement
        moveY = enemy.y + (dy / dist) * enemy.speed * deltaTime * 60;
      } else {
        // Improved movement for medium and hard difficulties
        // First calculate intended direction
        const targetX = enemy.x + (dx / dist) * enemy.speed * deltaTime * 60;
        const targetY = enemy.y + (dy / dist) * enemy.speed * deltaTime * 60;

        // Check for wall collisions in each direction separately to prevent jumping
        if (!checkWallCollision(targetX, enemy.y, ENEMY_SIZE, state.walls, state.doors)) {
          moveX = targetX; // Move in X if no collision
        } else {
          moveX = enemy.x; // Don't move in X if would hit wall
        }
        
        if (!checkWallCollision(enemy.x, targetY, ENEMY_SIZE, state.walls, state.doors)) {
          moveY = targetY; // Move in Y if no collision
        } else {
          moveY = enemy.y; // Don't move in Y if would hit wall
        }

        // If both directions are blocked, try to find a path around the wall
        if (checkWallCollision(moveX, moveY, ENEMY_SIZE, state.walls, state.doors) && 
            moveX !== enemy.x && moveY !== enemy.y) {
          // Try to move only in the least blocked direction
          const onlyX = !checkWallCollision(targetX, enemy.y, ENEMY_SIZE, state.walls, state.doors);
          const onlyY = !checkWallCollision(enemy.x, targetY, ENEMY_SIZE, state.walls, state.doors);
          
          if (onlyX && !onlyY) {
            moveX = targetX;
            moveY = enemy.y;
          } else if (onlyY && !onlyX) {
            moveX = enemy.x;
            moveY = targetY;
          } else {
            // If both are blocked, try diagonal movement around the obstacle
            const sideDx = Math.cos(enemy.angle + Math.PI/2) * ENEMY_SIZE * 0.5; // Smaller step
            const sideDy = Math.sin(enemy.angle + Math.PI/2) * ENEMY_SIZE * 0.5;
            
            if (!checkWallCollision(enemy.x + sideDx, enemy.y + sideDy, ENEMY_SIZE, state.walls, state.doors)) {
              moveX = enemy.x + sideDx;
              moveY = enemy.y + sideDy;
            } else if (!checkWallCollision(enemy.x - sideDx, enemy.y - sideDy, ENEMY_SIZE, state.walls, state.doors)) {
              moveX = enemy.x - sideDx;
              moveY = enemy.y - sideDy;
            } else {
              // Can't find a path, stay in place
              moveX = enemy.x;
              moveY = enemy.y;
            }
          }
        }
      }

      // Check for enemy-to-enemy collisions
      if (state.difficulty === 'hard' || Math.random() < 0.3) { // Medium has 30% chance of collision checks
        for (let i = 0; i < state.enemies.length; i++) {
          if (i !== index) {
            const otherEnemy = state.enemies[i];
            const enemyDist = Math.sqrt(Math.pow(moveX - otherEnemy.x, 2) + Math.pow(moveY - otherEnemy.y, 2));
            if (enemyDist < ENEMY_SIZE) {
              // Apply a small push away instead of a large jump
              const pushDistance = (ENEMY_SIZE - enemyDist) / 2;
              const angleToOther = Math.atan2(enemy.y - otherEnemy.y, enemy.x - otherEnemy.x);
              const pushX = Math.cos(angleToOther) * pushDistance;
              const pushY = Math.sin(angleToOther) * pushDistance;
              
              moveX += pushX;
              moveY += pushY;
              
              // Ensure the new position doesn't cause wall collision
              if (checkWallCollision(moveX, moveY, ENEMY_SIZE, state.walls, state.doors)) {
                moveX -= pushX; // Revert if would hit wall
                moveY -= pushY;
              }
            }
          }
        }
      }

      // Apply position changes if not colliding with walls
      if (!checkWallCollision(moveX, enemy.y, ENEMY_SIZE, state.walls, state.doors)) {
        enemy.x = moveX;
      }
      if (!checkWallCollision(enemy.x, moveY, ENEMY_SIZE, state.walls, state.doors)) {
        enemy.y = moveY;
      }

      const playerDist = Math.sqrt(Math.pow(enemy.x - state.player.x, 2) + Math.pow(enemy.y - state.player.y, 2));
      if (playerDist < PLAYER_SIZE + ENEMY_SIZE) {
        state.player.health -= 0.5 * deltaTime * 60; // Make damage time-based as well
        audioManager.playSound('player-hit'); // Play hit sound when player gets hit
        if (state.player.health <= 0) {
          state.player.health = 0; // Ensure health doesn't go below 0
          state.playerDead = true; // Mark player as dead
          setGameOver(true);
        }
      }
    } else {
      // Player is dead - enemy roams randomly
      enemy.isRoaming = true;
      
      // Update roaming behavior
      const now = Date.now();
      
      // Change direction occasionally (every 2-4 seconds)
      if (now - enemy.lastRoamChange > 2000 + Math.random() * 2000) {
        // Generate new random direction
        const newAngle = Math.random() * Math.PI * 2;
        enemy.roamDirectionX = Math.cos(newAngle);
        enemy.roamDirectionY = Math.sin(newAngle);
        enemy.lastRoamChange = now;
      }

      // Base roaming on game difficulty
      let roamX = enemy.x;
      let roamY = enemy.y;

      if (state.difficulty === 'easy') {
        // Original roaming for easy difficulty
        const proposedX = enemy.x + enemy.roamDirectionX * enemy.speed * deltaTime * 60;
        const proposedY = enemy.y + enemy.roamDirectionY * enemy.speed * deltaTime * 60;

        if (!checkWallCollision(proposedX, enemy.y, ENEMY_SIZE, state.walls, state.doors)) {
          roamX = proposedX;
        } else {
          // Hit wall, change direction
          const newAngle = Math.random() * Math.PI * 2;
          enemy.roamDirectionX = Math.cos(newAngle);
          enemy.roamDirectionY = Math.sin(newAngle);
          enemy.lastRoamChange = now;
        }

        if (!checkWallCollision(enemy.x, proposedY, ENEMY_SIZE, state.walls, state.doors)) {
          roamY = proposedY;
        } else {
          // Hit wall, change direction
          const newAngle = Math.random() * Math.PI * 2;
          enemy.roamDirectionX = Math.cos(newAngle);
          enemy.roamDirectionY = Math.sin(newAngle);
          enemy.lastRoamChange = now;
        }
      } else {
        // Improved roaming for medium and hard difficulties
        const targetX = enemy.x + enemy.roamDirectionX * enemy.speed * deltaTime * 60;
        const targetY = enemy.y + enemy.roamDirectionY * enemy.speed * deltaTime * 60;

        // Check for wall collisions in each direction separately to prevent jumping
        if (!checkWallCollision(targetX, enemy.y, ENEMY_SIZE, state.walls, state.doors)) {
          roamX = targetX; // Move in X if no collision
        } else {
          roamX = enemy.x; // Don't move in X if would hit wall
        }
        
        if (!checkWallCollision(enemy.x, targetY, ENEMY_SIZE, state.walls, state.doors)) {
          roamY = targetY; // Move in Y if no collision
        } else {
          roamY = enemy.y; // Don't move in Y if would hit wall
        }

        // If both directions are blocked, try to find a path around the wall
        if (checkWallCollision(roamX, roamY, ENEMY_SIZE, state.walls, state.doors) && 
            roamX !== enemy.x && roamY !== enemy.y) {
          // Try to move only in the least blocked direction
          const onlyX = !checkWallCollision(targetX, enemy.y, ENEMY_SIZE, state.walls, state.doors);
          const onlyY = !checkWallCollision(enemy.x, targetY, ENEMY_SIZE, state.walls, state.doors);
          
          if (onlyX && !onlyY) {
            roamX = targetX;
            roamY = enemy.y;
          } else if (onlyY && !onlyX) {
            roamX = enemy.x;
            roamY = targetY;
          } else {
            // If both are blocked, try diagonal movement around the obstacle
            const sideDx = Math.cos(enemy.angle + Math.PI/2) * ENEMY_SIZE * 0.5; // Smaller step
            const sideDy = Math.sin(enemy.angle + Math.PI/2) * ENEMY_SIZE * 0.5;
            
            if (!checkWallCollision(enemy.x + sideDx, enemy.y + sideDy, ENEMY_SIZE, state.walls, state.doors)) {
              roamX = enemy.x + sideDx;
              roamY = enemy.y + sideDy;
            } else if (!checkWallCollision(enemy.x - sideDx, enemy.y - sideDy, ENEMY_SIZE, state.walls, state.doors)) {
              roamX = enemy.x - sideDx;
              roamY = enemy.y - sideDy;
            } else {
              // Can't find a path, stay in place
              roamX = enemy.x;
              roamY = enemy.y;
            }
          }
        }

        // Also check for enemy-to-enemy collisions
        if (state.difficulty === 'hard' || Math.random() < 0.3) { // Medium has 30% chance of collision checks
          for (let i = 0; i < state.enemies.length; i++) {
            if (i !== index) {
              const otherEnemy = state.enemies[i];
              const enemyDist = Math.sqrt(Math.pow(roamX - otherEnemy.x, 2) + Math.pow(roamY - otherEnemy.y, 2));
              if (enemyDist < ENEMY_SIZE) {
                // Apply a small push away instead of a large jump
                const pushDistance = (ENEMY_SIZE - enemyDist) / 2;
                const angleToOther = Math.atan2(enemy.y - otherEnemy.y, enemy.x - otherEnemy.x);
                const pushX = Math.cos(angleToOther) * pushDistance;
                const pushY = Math.sin(angleToOther) * pushDistance;
                
                roamX += pushX;
                roamY += pushY;
                
                // Ensure the new position doesn't cause wall collision
                if (checkWallCollision(roamX, roamY, ENEMY_SIZE, state.walls, state.doors)) {
                  roamX -= pushX; // Revert if would hit wall
                  roamY -= pushY;
                }
              }
            }
          }
        }
      }

      // Update enemy position
      enemy.x = roamX;
      enemy.y = roamY;

      // Update the enemy's angle to face the direction it's moving
      enemy.angle = Math.atan2(enemy.roamDirectionY, enemy.roamDirectionX);
    }
  });

  // Handle damage flash and screen shake - now time-based
  if (state.player.health < previousHealth) {
    state.damageFlash = 0.5; // Flash for 0.5 seconds
    state.screenShake = 0.15; // Shake for 0.15 seconds
  }
  
  // Decrease flash and shake over time
  if (state.damageFlash > 0) {
    state.damageFlash -= deltaTime;
    if (state.damageFlash < 0) state.damageFlash = 0;
  }
  if (state.screenShake > 0) {
    state.screenShake -= deltaTime;
    if (state.screenShake < 0) state.screenShake = 0;
  }
  state.lastHealth = state.player.health;

  // Update particles
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx * deltaTime * 60; // 60 is target FPS for consistent movement
    particle.y += particle.vy * deltaTime * 60;
    particle.vx *= Math.pow(0.95, deltaTime * 60); // Exponential decay based on time
    particle.vy *= Math.pow(0.95, deltaTime * 60);
    particle.life -= deltaTime * 60; // Decrease life based on time
    return particle.life > 0;
  });

  // Handle powerup expiration - now handled with time-based logic
  if (state.powerupActive && timestamp > state.powerupEndTime) {
    state.powerupActive = false;
    state.player.speed = 3;
  }
  
  // Update minimap
  setMinimapUpdate(prev => prev + 1);
  
  // If gamepad is connected, update controller status
  if (state.gamepadIndex >= 0) {
    const gamepads = navigator.getGamepads();
    if (gamepads[state.gamepadIndex]) {
      setControllerConnected(true);
    } else {
      setControllerConnected(false);
    }
  }
};