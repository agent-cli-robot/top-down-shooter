"use client"

import { useEffect, useRef, useState } from "react"
import { GameHUD } from "./game-hud"
import { MiniMap } from "./mini-map"
import { useAudioManager } from "@/lib/use-audio"
import { useSpriteManager } from "@/lib/use-sprites"
import { weapons } from "@/lib/weapons"
import { inputManager } from "@/lib/input-manager"
import { 
  GameState, 
  createInitialGameState, 
  resetGameState 
} from "./game-state/state-manager"
import { 
  runGameLoop 
} from "./game-loop/game-loop"
import { renderGame } from "./rendering/renderer"
import { GamePrompts } from "./ui/game-prompts"

const WORLD_WIDTH = 3000
const WORLD_HEIGHT = 2000
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 800
const ENEMY_SPAWN_INTERVAL = 2000
const MAX_ENEMIES = 15
const BUY_STATION_SIZE = 40
const AMMO_COST = 50
const HEALTH_COST = 75

export type BuyPrompt = { type: string; cost: number, weaponType?: number } | null;
export type DoorPrompt = { cost: number } | null;

export default function TopDownShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [showSettings, setShowSettings] = useState(false) // Added settings state
  const [buyPrompt, setBuyPrompt] = useState<BuyPrompt>(null)
  const [doorPrompt, setDoorPrompt] = useState<DoorPrompt>(null)
  const [minimapUpdate, setMinimapUpdate] = useState(0)
  const [controllerConnected, setControllerConnected] = useState(false) // Track controller connection
  const [selectedMenuButton, setSelectedMenuButton] = useState(0) // 0 = Start Game, 1 = Settings
  const [selectedSettingsButton, setSelectedSettingsButton] = useState(0) // For settings close button
  const [reloadPrompt, setReloadPrompt] = useState(false) // Added reload prompt state
  const [audioSettings, setAudioSettings] = useState({
    musicVolume: 0.1, // 10% default
    soundVolume: 0.2, // 20% default
    masterVolume: 1.0,
  })
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const { playSound, playMusic, stopMusic, setMusicVolume, setSoundVolume, setMasterVolume, muteMusic, unmuteMusic, muteSounds, unmuteSounds, isMusicMuted, isSoundsMuted } = useAudioManager()
  const sprites = useSpriteManager(); // Get sprites at the top level

  const gameStateRef = useRef<GameState>(createInitialGameState())

  useEffect(() => {
    if (gameStarted) return // Only handle menu navigation when not in game

    const checkMenuNavigation = () => {
      if (showSettings) {
        // Settings menu navigation
        if (inputManager.isKeyPressed("Enter") || inputManager.isKeyPressed("Space")) {
          setShowSettings(false)
        }
      } else {
        // Main menu navigation
        if (inputManager.isKeyPressed("ArrowLeft") && !showSettings) {
          if (selectedDifficulty === 'hard') setSelectedDifficulty('medium');
          else if (selectedDifficulty === 'medium') setSelectedDifficulty('easy');
        } else if (inputManager.isKeyPressed("ArrowRight") && !showSettings) {
          if (selectedDifficulty === 'easy') setSelectedDifficulty('medium');
          else if (selectedDifficulty === 'medium') setSelectedDifficulty('hard');
        } else if (inputManager.isKeyPressed("ArrowUp") && !showSettings) {
          setSelectedMenuButton((prev) => Math.max(0, prev - 1))
        } else if (inputManager.isKeyPressed("ArrowDown") && !showSettings) {
          setSelectedMenuButton((prev) => Math.min(1, prev + 1)) // Now 0-1 for Start, Settings
        } else if (inputManager.isKeyPressed("Enter") || inputManager.isKeyPressed("Space")) {
          if (selectedMenuButton === 0) {
            startGame() // Start with current difficulty
          } else if (selectedMenuButton === 1) {
            setShowSettings(true) // Settings
          }
        }
      }
    }

    const menuInterval = setInterval(checkMenuNavigation, 100)

    return () => {
      clearInterval(menuInterval)
    }
  }, [gameStarted, showSettings, selectedMenuButton, selectedDifficulty])

  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log("[v0] Gamepad connected:", e.gamepad.id)
      gameStateRef.current.gamepadIndex = e.gamepad.index
      setControllerConnected(true)
    }

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log("[v0] Gamepad disconnected")
      if (gameStateRef.current.gamepadIndex === e.gamepad.index) {
        gameStateRef.current.gamepadIndex = -1
        setControllerConnected(false)
      }
    }

    window.addEventListener("gamepadconnected", handleGamepadConnected)
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected)

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected)
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected)
    }
  }, [])

  useEffect(() => {
    if (gameStarted && !gameOver) {
      // Start background music when game starts
      playMusic('pixel-showdown', true);
    } else if (!gameStarted) {
      // Stop music when game is not started
      stopMusic();
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      const state = gameStateRef.current;
      if (now - state.lastWeaponSwitch < 200) return // Debounce

      const currentWeaponIndex = state.player.weapons.findIndex(w => w.id === state.currentWeapon);
      if (e.deltaY < 0) {
        const nextWeaponIndex = (currentWeaponIndex + 1) % state.player.weapons.length;
        state.currentWeapon = state.player.weapons[nextWeaponIndex].id;
      } else if (e.deltaY > 0) {
        const nextWeaponIndex = (currentWeaponIndex - 1 + state.player.weapons.length) % state.player.weapons.length;
        state.currentWeapon = state.player.weapons[nextWeaponIndex].id;
      }
      state.lastWeaponSwitch = now
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })

    const gameLoop = (timestamp: number) => {
      // Calculate deltaTime in seconds for consistent frame rate independent movement
      const state = gameStateRef.current;
      const deltaTime = state.lastTime > 0 ? (timestamp - state.lastTime) / 1000 : 0;
      state.lastTime = timestamp;

      runGameLoop(
        timestamp,
        deltaTime,
        gameStateRef.current,
        canvas,
        { playSound, playMusic, stopMusic, setMusicVolume, setSoundVolume, setMasterVolume, muteMusic, unmuteMusic, muteSounds, unmuteSounds, isMusicMuted, isSoundsMuted },
        setGameOver,
        setBuyPrompt,
        setDoorPrompt,
        setReloadPrompt,
        setControllerConnected,
        setMinimapUpdate
      );

      // Render the game
      renderGame(
        ctx,
        gameStateRef.current,
        sprites,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      );

      requestAnimationFrame(gameLoop)
    }

    requestAnimationFrame(gameLoop)

    return () => {
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [gameStarted, gameOver, playSound, playMusic, stopMusic, setMusicVolume, setSoundVolume, setMasterVolume, muteMusic, unmuteMusic, muteSounds, unmuteSounds, isMusicMuted, isSoundsMuted, setGameOver, setBuyPrompt, setDoorPrompt, setReloadPrompt, setControllerConnected, setMinimapUpdate, sprites])

  const startGame = () => {
    setGameOver(false)
    setGameStarted(true)
    
    // Apply audio settings when starting the game
    setMusicVolume(audioSettings.musicVolume)
    setSoundVolume(audioSettings.soundVolume)
    setMasterVolume(audioSettings.masterVolume)

    // Reset game state, preserving the gamepad index and setting difficulty
    gameStateRef.current = resetGameState(gameStateRef.current.gamepadIndex, selectedDifficulty);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      {!gameStarted ? (
        <div className="text-center">
          <h1 className="mb-8 font-mono text-6xl font-bold text-primary">TOP-DOWN SHOOTER</h1>
          <div className="mb-8 space-y-2 text-muted-foreground">
            <p className="font-mono">WASD - Move</p>
            <p className="font-mono">Mouse - Aim</p>
            <p className="font-mono">Click - Shoot</p>
            <p className="font-mono">E - Buy at Station / Open Door</p>
            <p className="font-mono">1/3 or Scroll - Switch Weapon</p>
            <p className="font-mono text-sm opacity-70">
              Controller: Left Stick - Move, Right Stick - Aim, RT - Shoot, A - Interact, Y - Switch Weapon
            </p>
          </div>
          
          {/* Difficulty Selector */}
          <div className="mb-8">
            <h2 className="mb-4 font-mono text-xl font-bold text-primary">SELECT DIFFICULTY</h2>
            <div className="flex justify-center space-x-4 mb-6">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-6 py-3 font-mono text-lg transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-primary text-primary-foreground scale-105 ring-2 ring-primary/50'
                      : 'border-2 border-primary text-primary hover:bg-primary/10 hover:scale-105'
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-sm text-muted-foreground max-w-2xl mx-auto">
              <p className="mb-1"><span className="font-bold">Easy:</span> Enemies move normally with basic pathfinding</p>
              <p className="mb-1"><span className="font-bold">Medium:</span> Enemies have 30% chance to use advanced collision avoidance</p>
              <p className="mb-1"><span className="font-bold">Hard:</span> Enemies always use advanced navigation and avoid overlapping</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startGame}
              className={`px-8 py-4 font-mono text-xl font-bold transition-all ${
                selectedMenuButton === 0
                  ? "scale-110 bg-primary text-primary-foreground ring-4 ring-primary/50"
                  : "bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105"
              }`}
            >
              START GAME
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`border-2 border-primary bg-transparent px-8 py-4 font-mono text-xl font-bold text-primary transition-all ${
                selectedMenuButton === 1 ? "scale-110 bg-primary/20 ring-4 ring-primary/50 hover:bg-primary/10" : "hover:bg-primary/10 hover:scale-105"
              }`}
            >
              SETTINGS
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border-2 border-primary" />
            <GameHUD
              player={gameStateRef.current.player}
              powerupActive={gameStateRef.current.powerupActive}
              currentWeapon={gameStateRef.current.currentWeapon}
            />
            <MiniMap
              player={gameStateRef.current.player}
              enemies={gameStateRef.current.enemies}
              buyStations={gameStateRef.current.buyStations}
              walls={gameStateRef.current.walls}
              doors={gameStateRef.current.doors}
              canvasWidth={WORLD_WIDTH}
              canvasHeight={WORLD_HEIGHT}
              updateTrigger={minimapUpdate}
            />

            <GamePrompts 
              reloadPrompt={reloadPrompt}
              controllerConnected={controllerConnected}
              doorPrompt={doorPrompt}
              buyPrompt={buyPrompt}
            />
          </div>

          {gameOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
              <div className="text-center">
                <h2 className="mb-4 font-mono text-6xl font-bold text-destructive">GAME OVER</h2>
                <p className="mb-8 font-mono text-2xl text-foreground">Kills: {gameStateRef.current.player.kills}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary px-8 py-4 font-mono text-xl font-bold text-primary-foreground transition-all hover:bg-primary/80"
                >
                  RESTART
                </button>
              </div>
            </div>
          )}
        </>
      )}



      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95">
          <div className="w-full max-w-md rounded-lg border-2 border-primary bg-card p-8">
            <h2 className="mb-6 font-mono text-3xl font-bold text-primary">SETTINGS</h2>
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-foreground">Sound Volume</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings.soundVolume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setAudioSettings(prev => ({
                        ...prev,
                        soundVolume: newVolume
                      }));
                      setSoundVolume(newVolume);
                    }}
                    className="w-32 accent-primary"
                  />
                  <span className="font-mono text-muted-foreground w-10">
                    {Math.round(audioSettings.soundVolume * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-foreground">Music Volume</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings.musicVolume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setAudioSettings(prev => ({
                        ...prev,
                        musicVolume: newVolume
                      }));
                      setMusicVolume(newVolume);
                    }}
                    className="w-32 accent-primary"
                  />
                  <span className="font-mono text-muted-foreground w-10">
                    {Math.round(audioSettings.musicVolume * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-foreground">Master Volume</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings.masterVolume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setAudioSettings(prev => ({
                        ...prev,
                        masterVolume: newVolume
                      }));
                      setMasterVolume(newVolume);
                    }}
                    className="w-32 accent-primary"
                  />
                  <span className="font-mono text-muted-foreground w-10">
                    {Math.round(audioSettings.masterVolume * 100)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-foreground">Controller Sensitivity</span>
                <span className="font-mono text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-foreground">Controller Status</span>
                <span className={`font-mono ${controllerConnected ? "text-green-500" : "text-red-500"}`}>
                  {controllerConnected ? "🎮 Connected" : "❌ Not Connected"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-primary px-6 py-3 font-mono text-lg font-bold text-primary-foreground transition-all hover:bg-primary/80"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
