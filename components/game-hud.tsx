import { weapons, Weapon } from "@/lib/weapons";

interface Player {
  health: number
  maxHealth: number
  kills: number
  currency: number
  weapons: { id: number; ammo: number; magSize: number }[];
  currentWeapon: number // Current selected weapon
}

interface GameHUDProps {
  player: Player
  powerupActive: boolean
  currentWeapon: number
}

export function GameHUD({ player, powerupActive, currentWeapon }: GameHUDProps) {
  const healthPercent = (player.health / player.maxHealth) * 100

  return (
    <>
      {/* Bottom center HUD - health display */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {/* Top health bar with number */}
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-sm bg-red-600 px-3 py-1">
            <span className="font-mono text-2xl font-bold text-white">{Math.max(0, Math.floor(player.health))}</span>
          </div>
        </div>

        {/* Bottom health bar with icons */}
        <div className="flex w-80 flex-col items-center gap-2">
          <div className="h-3 w-full overflow-hidden rounded-sm bg-gray-800">
            <div className="flex h-full">
              <div className="bg-red-600 transition-all duration-200" style={{ width: `${healthPercent}%` }} />
              <div
                className="bg-cyan-500 transition-all duration-200"
                style={{ width: `${Math.max(0, 100 - healthPercent)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            {powerupActive && (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-600 animate-pulse">
                <span className="text-lg">⚡</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 flex flex-col gap-3">
        {player.weapons.map((weapon) => {
          const weaponData = weapons.find((w) => w.id === weapon.id);
          if (!weaponData) return null;
          return (
            <div key={weapon.id} className="flex items-center gap-2">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded border-2 ${
                  currentWeapon === weapon.id ? "border-yellow-400 bg-yellow-900/80" : "border-gray-600 bg-gray-900/80"
                }`}
              >
                <span
                  className={`font-mono text-xl font-bold ${currentWeapon === weapon.id ? "text-yellow-400" : "text-gray-500"}`}
                >
                  {player.weapons.indexOf(weapon) + 1}
                </span>
              </div>
              <div
                className={`relative h-16 w-20 rounded border-2 ${
                  currentWeapon === weapon.id ? "border-yellow-400" : "border-gray-600"
                } bg-gray-800/80 p-1`}
              >
                <div className="h-full w-full bg-gray-700" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src={weaponData.hudImage} alt={weaponData.name} className="h-10" />
                </div>
                <div className="absolute bottom-0 right-1">
                  <span
                    className={`font-mono text-sm font-bold ${currentWeapon === weapon.id ? "text-yellow-400" : "text-gray-500"}`}
                  >
                    {weapon.ammo}/{weapon.magSize}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cash and kills in bottom right */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2">
        {/* Kills/Score */}
        <div className="rounded-sm bg-gray-900/80 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-400">KILLS</span>
            <span className="font-mono text-2xl font-bold text-white">{player.kills}</span>
          </div>
        </div>
        {/* Cash with $ prefix */}
        <div className="rounded-sm bg-gray-900/80 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-400">CASH</span>
            <span className="font-mono text-2xl font-bold text-green-500">${player.currency}</span>
          </div>
        </div>
      </div>
    </>
  )
}
