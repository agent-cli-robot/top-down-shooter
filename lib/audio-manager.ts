// Audio Manager for Top-Down Shooter Game
// Handles music and sound effects with appropriate volume levels
// Improved for better compatibility with browser autoplay policies

interface SoundMap {
  [key: string]: HTMLAudioElement;
}

class AudioManager {
  private static instance: AudioManager;
  private musicAudio: HTMLAudioElement | null = null;
  private soundAudio: SoundMap = {};
  private musicVolume: number = 0.1; // 10% for music
  private soundVolume: number = 0.2; // 20% for sounds
  private masterVolume: number = 1.0;
  private musicMuted: boolean = false;
  private soundsMuted: boolean = false;
  private hasUserInteraction: boolean = false;

  private readonly musicAssets: Record<string, string> = {
    'pixel-dreams': '/Assets/Music/Pixel Dreams.mp3',
    'pixel-showdown': '/Assets/Music/Pixel Showdown.mp3',
    'pixel-sky': '/Assets/Music/Pixel Sky.mp3',
  };

  private readonly soundAssets: Record<string, string> = {
    'laser': '/Assets/Sounds/laser_shot_1.mp3',
    'pistol': '/Assets/Sounds/pistol_shot.mp3',
    'rifle': '/Assets/Sounds/rifle_shot-1.mp3',
    'shotgun': '/Assets/Sounds/shotgun_shot_1.mp3',
    'sniper': '/Assets/Sounds/sniper_shot_1.mp3',
    'player-hit': '/Assets/Sounds/player_hit_1.mp3',
    'power-up-1': '/Assets/Sounds/power_up_1.mp3',
    'power-up-2': '/Assets/Sounds/power_up_2.mp3',
    'pick-up': '/Assets/Sounds/pick_up_1.mp3',
    'reload-pistol': '/Assets/Sounds/reload-pistol.mp3',
    'reload-rifle': '/Assets/Sounds/reload_rifle.mp3',
    'reload-shotgun': '/Assets/Sounds/reload_shotgun.mp3',
  };

  private constructor() {
    this.setupUserInteractionHandler();
  }

  private setupUserInteractionHandler() {
    // Track if user has interacted with the page to allow audio playback
    // Only set up event listeners if running in browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const handleUserInteraction = () => {
        this.hasUserInteraction = true;
        // Remove the event listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      };

      // Listen for user interactions to enable audio
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      document.addEventListener('touchstart', handleUserInteraction);
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // Initialize audio elements
  public init() {
    // Preload all sound effects but don't play them until user interaction
    Object.entries(this.soundAssets).forEach(([name, path]) => {
      const audio = new Audio();
      audio.src = path;
      audio.preload = 'auto';
      this.soundAudio[name] = audio;
    });
  }

  // Play a sound effect
  public playSound(soundName: string): void {
    if (this.soundsMuted || !this.hasUserInteraction) return;

    const sound = this.soundAudio[soundName];
    if (sound) {
      // Create a new instance to allow overlapping sounds and avoid the need to reset
      const newSound = new Audio(sound.src);
      newSound.volume = this.getEffectiveVolume(soundName);
      
      // Attempt to play the sound - handle errors gracefully
      newSound.play().catch(e => {
        // If play fails due to autoplay policy, we might need to handle this differently
        console.warn('Error playing sound:', e);
      });
    } else {
      console.warn(`Sound '${soundName}' not found`);
    }
  }

  // Play background music
  public playMusic(musicName: string, loop: boolean = true): void {
    if (this.musicMuted || !this.hasUserInteraction) return;

    const musicPath = this.musicAssets[musicName];
    if (!musicPath) {
      console.warn(`Music '${musicName}' not found`);
      return;
    }

    // Stop current music if playing
    this.stopMusic();

    // Create new audio element for this music
    this.musicAudio = new Audio(musicPath);
    this.musicAudio.volume = this.musicVolume * this.masterVolume;
    this.musicAudio.loop = loop;

    // Attempt to play the music - handle errors gracefully
    this.musicAudio.play().catch(e => {
      console.warn('Error playing music:', e);
    });
  }

  // Stop current music
  public stopMusic(): void {
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.currentTime = 0;
      this.musicAudio = null;
    }
  }

  // Pause current music
  public pauseMusic(): void {
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
  }

  // Resume current music
  public resumeMusic(): void {
    if (this.musicAudio && this.musicAudio.paused) {
      this.musicAudio.play().catch(e => {
        console.warn('Error resuming music:', e);
      });
    }
  }

  // Set music volume (0 to 1)
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicAudio) {
      this.musicAudio.volume = this.musicVolume * this.masterVolume;
    }
  }

  // Set sound effects volume (0 to 1)
  public setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    // Update all sound effect volumes
    Object.entries(this.soundAudio).forEach(([name, audio]) => {
      // Note: This won't affect sounds that have already been played
      // as we create new audio elements each time
    });
  }

  // Set master volume (0 to 1)
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.musicAudio) {
      this.musicAudio.volume = this.musicVolume * this.masterVolume;
    }
    // Note: This won't affect sounds that have already been played
    // as we create new audio elements each time
  }

  // Mute all audio
  public muteAll(): void {
    this.musicMuted = true;
    this.soundsMuted = true;
    this.stopMusic();
  }

  // Unmute all audio
  public unmuteAll(): void {
    this.musicMuted = false;
    this.soundsMuted = false;
  }

  // Mute only music
  public muteMusic(): void {
    this.musicMuted = true;
    this.stopMusic();
  }

  // Mute only sound effects
  public muteSounds(): void {
    this.soundsMuted = true;
  }

  // Unmute only music
  public unmuteMusic(): void {
    this.musicMuted = false;
  }

  // Unmute only sound effects
  public unmuteSounds(): void {
    this.soundsMuted = false;
  }

  // Get the effective volume for a specific sound
  private getEffectiveVolume(soundName: string): number {
    return this.soundVolume * this.masterVolume;
  }

  // Get current music volume
  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // Get current sound volume
  public getSoundVolume(): number {
    return this.soundVolume;
  }

  // Get current master volume
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  // Check if music is muted
  public isMusicMuted(): boolean {
    return this.musicMuted;
  }

  // Check if sounds are muted
  public isSoundsMuted(): boolean {
    return this.soundsMuted;
  }
}

export default AudioManager;