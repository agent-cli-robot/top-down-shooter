// React hook to use the audio manager in components
import { useEffect, useCallback } from 'react';
import AudioManager from '@/lib/audio-manager';

export const useAudioManager = () => {
  useEffect(() => {
    const audioManager = AudioManager.getInstance();
    audioManager.init();
    
    // Clean up on unmount
    return () => {
      audioManager.stopMusic();
    };
  }, []);

  const audioManager = AudioManager.getInstance();

  return {
    playSound: useCallback((soundName: string) => audioManager.playSound(soundName), [audioManager]),
    playMusic: useCallback((musicName: string, loop: boolean = true) => audioManager.playMusic(musicName, loop), [audioManager]),
    stopMusic: useCallback(() => audioManager.stopMusic(), [audioManager]),
    pauseMusic: useCallback(() => audioManager.pauseMusic(), [audioManager]),
    resumeMusic: useCallback(() => audioManager.resumeMusic(), [audioManager]),
    setMusicVolume: useCallback((volume: number) => audioManager.setMusicVolume(volume), [audioManager]),
    setSoundVolume: useCallback((volume: number) => audioManager.setSoundVolume(volume), [audioManager]),
    setMasterVolume: useCallback((volume: number) => audioManager.setMasterVolume(volume), [audioManager]),
    muteAll: useCallback(() => audioManager.muteAll(), [audioManager]),
    unmuteAll: useCallback(() => audioManager.unmuteAll(), [audioManager]),
    muteMusic: useCallback(() => audioManager.muteMusic(), [audioManager]),
    muteSounds: useCallback(() => audioManager.muteSounds(), [audioManager]),
    unmuteMusic: useCallback(() => audioManager.unmuteMusic(), [audioManager]),
    unmuteSounds: useCallback(() => audioManager.unmuteSounds(), [audioManager]),
    getMusicVolume: useCallback(() => audioManager.getMusicVolume(), [audioManager]),
    getSoundVolume: useCallback(() => audioManager.getSoundVolume(), [audioManager]),
    getMasterVolume: useCallback(() => audioManager.getMasterVolume(), [audioManager]),
    isMusicMuted: useCallback(() => audioManager.isMusicMuted(), [audioManager]),
    isSoundsMuted: useCallback(() => audioManager.isSoundsMuted(), [audioManager]),
    audioManager
  };
};