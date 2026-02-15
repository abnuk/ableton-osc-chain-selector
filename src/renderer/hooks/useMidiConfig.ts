import { useState, useEffect, useCallback } from 'react';
import type { MidiDevice, MidiPadConfig, LearnTarget } from '@shared/types';

export function useMidiConfig() {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [padConfig, setPadConfig] = useState<MidiPadConfig>({
    prevNote: null,
    nextNote: null,
    prevChannel: 1,
    nextChannel: 1,
  });

  useEffect(() => {
    window.api.midi.getDevices().then(setDevices);
    window.api.midi.getConfig().then(setPadConfig);

    const unsub = window.api.midi.onLearnComplete(setPadConfig);
    return unsub;
  }, []);

  const refreshDevices = useCallback(async () => {
    const found = await window.api.midi.getDevices();
    setDevices(found);
  }, []);

  const selectDevice = useCallback(async (name: string) => {
    await window.api.midi.selectDevice(name);
  }, []);

  const startLearn = useCallback(async (target: LearnTarget) => {
    await window.api.midi.learnStart(target);
  }, []);

  const stopLearn = useCallback(async () => {
    await window.api.midi.learnStop();
  }, []);

  return {
    devices,
    padConfig,
    refreshDevices,
    selectDevice,
    startLearn,
    stopLearn,
  };
}
