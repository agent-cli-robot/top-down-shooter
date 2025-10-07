import { Player } from "../entities/player";
import { Enemy } from "../entities/enemy";
import { Bullet } from "../entities/bullet";
import { Particle } from "../entities/particle";
import { Drop } from "../entities/drop";
import { BuyStation } from "../entities/buystation";
import { Wall } from "../entities/wall";
import { Door } from "../entities/door";
import { SpriteManager } from "@/lib/use-sprites";
import { weapons } from "@/lib/weapons";

const PLAYER_SIZE = 24;
const ENEMY_SIZE = 24;
const BULLET_SIZE = 4;
const BUY_STATION_SIZE = 40;
const DROP_SIZE = 12;

import { SpriteManager } from "@/lib/use-sprites";

interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  drops: Drop[];
  buyStations: BuyStation[];
  walls: Wall[];
  doors: Door[];
  cameraX: number;
  cameraY: number;
  powerupActive: boolean;
  currentWeapon: number;
  screenShake: number;
  damageFlash: number;
  accessibleRooms: Set<number>;
}

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  sprites: SpriteManager | null,
  canvasWidth: number,
  canvasHeight: number,
  zoomLevel: number = 1.3
) => {

  let shakeX = 0;
  let shakeY = 0;
  if (gameState.screenShake > 0) {
    // Convert time-based value back to equivalent frame-based value for rendering
    // Original: 10 frames of shake, now: 0.15 seconds of shake
    // Scale factor: 10 / 0.15 ≈ 66.7
    shakeX = (Math.random() - 0.5) * gameState.screenShake * (10 / 0.15);
    shakeY = (Math.random() - 0.5) * gameState.screenShake * (10 / 0.15);
  }

  // Apply zoom transformation (30% zoomed in)
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);  // Move to center of canvas
  ctx.scale(zoomLevel, zoomLevel);                  // Apply zoom
  ctx.translate(-canvasWidth / 2, -canvasHeight / 2); // Move back
  ctx.translate(-gameState.cameraX + shakeX, -gameState.cameraY + shakeY); // Apply camera position

  // Draw background with grid
  ctx.fillStyle = "#0a0f0a";
  ctx.fillRect(gameState.cameraX, gameState.cameraY, canvasWidth, canvasHeight);

  ctx.strokeStyle = "#1a2f1a";
  ctx.lineWidth = 1;
  const gridSize = 40;
  const startX = Math.floor(gameState.cameraX / gridSize) * gridSize;
  const startY = Math.floor(gameState.cameraY / gridSize) * gridSize;
  for (let x = startX; x < gameState.cameraX + canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, gameState.cameraY);
    ctx.lineTo(x, gameState.cameraY + canvasHeight);
    ctx.stroke();
  }
  for (let y = startY; y < gameState.cameraY + canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gameState.cameraX, y);
    ctx.lineTo(gameState.cameraX + canvasWidth, y);
    ctx.stroke();
  }

  // Draw walls
  ctx.fillStyle = "#2a3a2a";
  gameState.walls.forEach((wall) => {
    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

    ctx.strokeStyle = "#3a4a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
  });

  // Draw doors
  gameState.doors.forEach((door) => {
    if (door.isOpen) {
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.strokeRect(door.x, door.y, door.width, door.height);
    } else {
      ctx.fillStyle = "#ff8800";
      ctx.fillRect(door.x, door.y, door.width, door.height);

      ctx.strokeStyle = "#ffaa44";
      ctx.lineWidth = 3;
      ctx.strokeRect(door.x, door.y, door.width, door.height);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`$${door.cost}`, door.x + door.width / 2, door.y + door.height / 2);
    }
  });

  // Draw buy stations
  gameState.buyStations.forEach((station) => {
    if (station.type === "weapon") {
      // Different color for weapon stations
      ctx.fillStyle = "#8888ff"; // Blue for weapons
      ctx.fillRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      ctx.strokeStyle = "#aaaaff"; // Lighter blue border
      ctx.lineWidth = 3;
      ctx.strokeRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      // Draw weapon sprite instead of text
      if (sprites && sprites[`weapon${station.weaponType}`]) {
        const weaponSprite = sprites[`weapon${station.weaponType}`];
        if (weaponSprite && weaponSprite.complete) {
          // Draw weapon sprite centered in the station
          const spriteSize = station.size * 0.8; // Make sprite slightly smaller than station
          ctx.drawImage(
            weaponSprite,
            station.x - spriteSize / 2,
            station.y - spriteSize / 2,
            spriteSize,
            spriteSize * 0.5 // Adjust aspect ratio to be more appropriate for weapon station
          );
        } else {
          // Fallback to text if sprite not loaded
          ctx.fillStyle = "#000000";
          ctx.font = "bold 20px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          // Show different symbols based on weapon type
          let weaponSymbol = "?";
          if (station.weaponType === 3) weaponSymbol = "R"; // Rifle
          else if (station.weaponType === 4) weaponSymbol = "S"; // Shotgun 
          else if (station.weaponType === 5) weaponSymbol = "M"; // SMG
          ctx.fillText(weaponSymbol, station.x, station.y);
        }
      } else {
        // Fallback to text if sprite not loaded yet
        ctx.fillStyle = "#000000";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Show different symbols based on weapon type
        let weaponSymbol = "?";
        if (station.weaponType === 3) weaponSymbol = "R"; // Rifle
        else if (station.weaponType === 4) weaponSymbol = "S"; // Shotgun 
        else if (station.weaponType === 5) weaponSymbol = "M"; // SMG
        ctx.fillText(weaponSymbol, station.x, station.y);
      }
    } else if (station.type === "ammo") {
      // Ammo reload stations
      ctx.fillStyle = "#ffaa00"; // Yellow for ammo
      ctx.fillRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      ctx.strokeStyle = "#ffdd44"; // Lighter yellow border
      ctx.lineWidth = 3;
      ctx.strokeRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", station.x, station.y); // Ammo symbol
    } else { // health
      // Health stations (green)
      ctx.fillStyle = "#00ff88"; // Green for health
      ctx.fillRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      ctx.strokeStyle = "#44ffaa"; // Lighter green border
      ctx.lineWidth = 3;
      ctx.strokeRect(station.x - station.size / 2, station.y - station.size / 2, station.size, station.size);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", station.x, station.y); // Health symbol
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`${station.cost}`, station.x, station.y + station.size / 2 + 15);
  });

  // Draw bullets
  gameState.bullets.forEach((bullet) => {
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(bullet.x - BULLET_SIZE / 2, bullet.y - BULLET_SIZE / 2, BULLET_SIZE, BULLET_SIZE);
  });

  // Draw enemies
  gameState.enemies.forEach((enemy) => {
    // Draw enemy with sprite
    if (sprites && sprites[`body${enemy.bodySprite}`] && sprites[`head${enemy.headSprite}`]) {
      // Draw body sprite
      const bodySprite = sprites[`body${enemy.bodySprite}`];
      if (bodySprite && bodySprite.complete) {
        ctx.drawImage(
          bodySprite,
          enemy.x - ENEMY_SIZE / 2,
          enemy.y - ENEMY_SIZE / 2,
          ENEMY_SIZE,
          ENEMY_SIZE
        );
      } else {
        // Fallback to colored rectangle if sprite not loaded
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(enemy.x - ENEMY_SIZE / 2, enemy.y - ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE);
      }
      
      // Draw head sprite
      const headSprite = sprites[`head${enemy.headSprite}`];
      if (headSprite && headSprite.complete) {
        ctx.drawImage(
          headSprite,
          enemy.x - ENEMY_SIZE / 2 + 2,
          enemy.y - ENEMY_SIZE / 2 + 2,
          ENEMY_SIZE - 4,
          ENEMY_SIZE - 4
        );
      }
      
      // Draw enemy weapon sprite
      if (enemy.weaponSprite) {
        const weaponSprite = sprites[`weapon${enemy.weaponSprite}`];
        if (weaponSprite && weaponSprite.complete) {
          // Rotate and position the weapon based on enemy's angle
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(enemy.angle);
          
          // Draw weapon sprite pointing in the correct direction
          ctx.drawImage(
            weaponSprite,
            ENEMY_SIZE * 0.4, // Position weapon to the right side of enemy
            -ENEMY_SIZE * 0.5,    // Slightly offset vertically
            ENEMY_SIZE,   // Scale weapon to appropriate size
            ENEMY_SIZE * 0.5      // Scale weapon to appropriate size
          );
          
          ctx.restore();
        } else {
          // Fallback to line if sprite not loaded
          ctx.strokeStyle = "#ff0000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.x + Math.cos(enemy.angle - 0.5) * ENEMY_SIZE * 1.2, enemy.y + Math.sin(enemy.angle - 0.5) * ENEMY_SIZE * 1.2);
          ctx.stroke();
        }
      } else {
        // Fallback to line if no weapon sprite specified
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(enemy.angle - 0.5) * ENEMY_SIZE * 1.2, enemy.y + Math.sin(enemy.angle - 0.5) * ENEMY_SIZE * 1.2);
        ctx.stroke();
      }
    } else {
      // Fallback to colored rectangle if sprites aren't loaded yet
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(enemy.x - ENEMY_SIZE / 2, enemy.y - ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE);

      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * ENEMY_SIZE, enemy.y + Math.sin(enemy.angle) * ENEMY_SIZE);
      ctx.stroke();
    }

    // Draw health bar
    const healthBarWidth = ENEMY_SIZE;
    const healthBarHeight = 3;
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(enemy.x - healthBarWidth / 2, enemy.y - ENEMY_SIZE / 2 - 8, healthBarWidth, healthBarHeight);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(
      enemy.x - healthBarWidth / 2,
      enemy.y - ENEMY_SIZE / 2 - 8,
      healthBarWidth * healthPercent,
      healthBarHeight,
    );
  });

  // Draw player with sprite (only if player is not dead)
  if (!gameState.playerDead && sprites && sprites[`body${gameState.player.bodySprite}`] && sprites[`head${gameState.player.headSprite}`]) {
    // Draw body sprite
    const bodySprite = sprites[`body${gameState.player.bodySprite}`];
    if (bodySprite && bodySprite.complete) {
      ctx.drawImage(
        bodySprite,
        gameState.player.x - PLAYER_SIZE / 2,
        gameState.player.y - PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
    } else {
      // Fallback to colored rectangle if sprite not loaded
      ctx.fillStyle = gameState.powerupActive ? "#ff44ff" : "#44ff44";
      ctx.fillRect(gameState.player.x - PLAYER_SIZE / 2, gameState.player.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    }
    
    // Draw head sprite
    const headSprite = sprites[`head${gameState.player.headSprite}`];
    if (headSprite && headSprite.complete) {
      ctx.drawImage(
        headSprite,
        gameState.player.x - PLAYER_SIZE / 2 + 2,
        gameState.player.y - PLAYER_SIZE / 2 + 2,
        PLAYER_SIZE - 4,
        PLAYER_SIZE - 4
      );
    }
    
    // Draw weapon sprite - use the current selected weapon
    const weaponToDraw = gameState.currentWeapon;
    
    if (weaponToDraw) {
      const weaponSprite = sprites[`weapon${weaponToDraw}`];
      if (weaponSprite && weaponSprite.complete) {
        // Rotate and position the weapon based on player's angle
        ctx.save();
        ctx.translate(gameState.player.x, gameState.player.y);
        ctx.rotate(gameState.player.angle);
        
        // Draw weapon sprite pointing in the correct direction
        ctx.drawImage(
          weaponSprite,
          PLAYER_SIZE * 0.4, // Position weapon to the right side of player
          -PLAYER_SIZE * 0.5,    // Slightly offset vertically
          PLAYER_SIZE,   // Scale weapon to appropriate size
          PLAYER_SIZE * 0.5      // Scale weapon to appropriate size
        );
        
        ctx.restore();
      } else {
        // Fallback to line if sprite not loaded
        ctx.strokeStyle = gameState.powerupActive ? "#ff88ff" : "#88ff88";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gameState.player.x, gameState.player.y);
        ctx.lineTo(
          gameState.player.x + Math.cos(gameState.player.angle - 0.5) * PLAYER_SIZE * 1.2,
          gameState.player.y + Math.sin(gameState.player.angle - 0.5) * PLAYER_SIZE * 1.2,
        );
        ctx.stroke();
      }
    } else {
      // Fallback to line if no weapon sprite specified
      ctx.strokeStyle = gameState.powerupActive ? "#ff88ff" : "#88ff88";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gameState.player.x, gameState.player.y);
      ctx.lineTo(
        gameState.player.x + Math.cos(gameState.player.angle - 0.5) * PLAYER_SIZE * 1.2,
        gameState.player.y + Math.sin(gameState.player.angle - 0.5) * PLAYER_SIZE * 1.2,
      );
      ctx.stroke();
    }
  } else if (!gameState.playerDead) {
    // Fallback to colored rectangle if sprites aren't loaded yet and player is not dead
    ctx.fillStyle = gameState.powerupActive ? "#ff44ff" : "#44ff44";
    ctx.fillRect(gameState.player.x - PLAYER_SIZE / 2, gameState.player.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

    // Draw weapon as a line
    ctx.strokeStyle = gameState.powerupActive ? "#ff88ff" : "#88ff88";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gameState.player.x, gameState.player.y);
    ctx.lineTo(
      gameState.player.x + Math.cos(gameState.player.angle) * PLAYER_SIZE * 1.5,
      gameState.player.y + Math.sin(gameState.player.angle) * PLAYER_SIZE * 1.5,
    );
    ctx.stroke();
  }

  // Draw particles
  gameState.particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    ctx.globalAlpha = 1;
  });

  // Draw drops
  gameState.drops.forEach((drop) => {
    const dropAge = Date.now() - drop.spawnTime;
    const shouldFlash = dropAge > 4000;
    const flashInterval = 200;
    const isVisible = !shouldFlash || Math.floor(dropAge / flashInterval) % 2 === 0;

    if (isVisible) {
      // Draw glow effect
      const glowSize = drop.size + 4;
      const gradient = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, glowSize);

      if (drop.type === "ammo") {
        gradient.addColorStop(0, "#ffaa00");
        gradient.addColorStop(1, "rgba(255, 170, 0, 0)");
      } else if (drop.type === "money") {
        gradient.addColorStop(0, "#00ff00");
        gradient.addColorStop(1, "rgba(0, 255, 0, 0)");
      } else {
        gradient.addColorStop(0, "#ff00ff");
        gradient.addColorStop(1, "rgba(255, 0, 255, 0)");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(drop.x - glowSize, drop.y - glowSize, glowSize * 2, glowSize * 2);

      // Draw actual sprite based on drop type
      if (sprites) {
        let spriteKey = '';
        if (drop.type === "ammo") {
          spriteKey = 'ammo-pack';
        } else if (drop.type === "money") {
          spriteKey = 'medikit'; // Using medikit as money placeholder
        } else { // powerup
          spriteKey = 'grenade-pack'; // Using grenade-pack as powerup placeholder
        }

        const dropSprite = sprites[spriteKey];
        if (dropSprite && dropSprite.complete) {
          ctx.drawImage(
            dropSprite,
            drop.x - drop.size / 2,
            drop.y - drop.size / 2,
            drop.size,
            drop.size
          );
        } else {
          // Fallback to colored rectangle if sprite not loaded
          ctx.fillStyle = drop.type === "ammo" ? "#ffdd44" : drop.type === "money" ? "#44ff44" : "#ff44ff";
          ctx.fillRect(drop.x - drop.size / 2, drop.y - drop.size / 2, drop.size, drop.size);
          
          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(drop.type === "ammo" ? "A" : drop.type === "money" ? "$" : "P", drop.x, drop.y);
        }
      } else {
        // Fallback to colored rectangle if sprites not loaded yet
        ctx.fillStyle = drop.type === "ammo" ? "#ffdd44" : drop.type === "money" ? "#44ff44" : "#ff44ff";
        ctx.fillRect(drop.x - drop.size / 2, drop.y - drop.size / 2, drop.size, drop.size);
        
        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(drop.type === "ammo" ? "A" : drop.type === "money" ? "$" : "P", drop.x, drop.y);
      }
    }
  });

  ctx.restore();

  // Draw damage flash
  if (gameState.damageFlash > 0) {
    // Calculate alpha based on remaining time (0.5 seconds = 30 frames equivalent)
    const flashAlpha = Math.min(1, gameState.damageFlash / 0.5);
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2,
      canvasHeight / 2,
      0,
      canvasWidth / 2,
      canvasHeight / 2,
      canvasWidth / 2,
    );
    gradient.addColorStop(0, `rgba(255, 0, 0, 0)`);
    gradient.addColorStop(0.7, `rgba(255, 0, 0, ${flashAlpha * 0.3})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${flashAlpha * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }
};