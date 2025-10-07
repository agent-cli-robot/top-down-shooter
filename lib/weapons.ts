
export interface Weapon {
  id: number;
  name: string;
  hudImage: string;
  magSize: number;
  cost: number;
}

export const weapons: Weapon[] = [
  {
    id: 1,
    name: "Pistol",
    hudImage: "/Assets/Sprites/weapons/1.png",
    magSize: 8,
    cost: 0,
  },
  {
    id: 3,
    name: "Rifle",
    hudImage: "/Assets/Sprites/weapons/3.png",
    magSize: 30,
    cost: 200,
  },
  {
    id: 4,
    name: "Shotgun",
    hudImage: "/Assets/Sprites/weapons/4.png",
    magSize: 8,
    cost: 300,
  },
  {
    id: 5,
    name: "SMG",
    hudImage: "/Assets/Sprites/weapons/5.png",
    magSize: 50,
    cost: 250,
  },
  {
    id: 6,
    name: "Sniper",
    hudImage: "/Assets/Sprites/weapons/6.png",
    magSize: 10,
    cost: 400,
  },
];
