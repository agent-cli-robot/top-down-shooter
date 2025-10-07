import { Wall } from "../entities/wall";
import { Door } from "../entities/door";

export const checkWallCollision = (
  x: number, 
  y: number, 
  size: number, 
  walls: Wall[], 
  doors: Door[]
): boolean => {
  // Check walls
  for (const wall of walls) {
    if (
      x + size / 2 > wall.x &&
      x - size / 2 < wall.x + wall.width &&
      y + size / 2 > wall.y &&
      y - size / 2 < wall.y + wall.height
    ) {
      return true;
    }
  }

  // Check closed doors
  for (const door of doors) {
    if (!door.isOpen) {
      if (
        x + size / 2 > door.x &&
        x - size / 2 < door.x + door.width &&
        y + size / 2 > door.y &&
        y - size / 2 < door.y + door.height
      ) {
        return true;
      }
    }
  }

  return false;
};