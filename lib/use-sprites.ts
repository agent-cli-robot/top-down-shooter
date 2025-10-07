import { useState, useEffect } from 'react';

interface SpriteMap {
  [key: string]: HTMLImageElement | null;
}

export const useSpriteManager = () => {
  const [sprites, setSprites] = useState<SpriteMap>({});

  useEffect(() => {
    const spriteMap: SpriteMap = {};
    const loadingPromises: Promise<void>[] = [];

    // Load character body sprites
    for (let i = 1; i <= 3; i++) {
      const img = new Image();
      img.src = `/Assets/Sprites/characters/body/${i}.png`;
      spriteMap[`body${i}`] = img;
      
      const promise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`Failed to load sprite: /Assets/Sprites/characters/body/${i}.png`);
          resolve();
        };
      });
      loadingPromises.push(promise);
    }

    // Load character head sprites
    for (let i = 1; i <= 14; i++) {
      const img = new Image();
      img.src = `/Assets/Sprites/characters/head/${i}.png`;
      spriteMap[`head${i}`] = img;
      
      const promise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`Failed to load sprite: /Assets/Sprites/characters/head/${i}.png`);
          resolve();
        };
      });
      loadingPromises.push(promise);
    }

    // Load item sprites
    const itemSprites = ['ammo-pack', 'barril', 'grenade-pack', 'grenade', 'medikit'];
    itemSprites.forEach(item => {
      const img = new Image();
      img.src = `/Assets/Sprites/item/${item}.png`;
      spriteMap[item] = img;
      
      const promise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`Failed to load sprite: /Assets/Sprites/item/${item}.png`);
          resolve();
        };
      });
      loadingPromises.push(promise);
    });

    // Load weapon sprites (attach-to-body)
    for (let i = 1; i <= 10; i++) {
      const img = new Image();
      img.src = `/Assets/Sprites/weapons/attach-to-body/${i}.png`;
      spriteMap[`weapon${i}`] = img;
      
      const promise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.error(`Failed to load sprite: /Assets/Sprites/weapons/attach-to-body/${i}.png`);
          resolve();
        };
      });
      loadingPromises.push(promise);
    }

    Promise.all(loadingPromises).then(() => {
      setSprites(spriteMap);
    });
  }, []);

  return sprites;
};