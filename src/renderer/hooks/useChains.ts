import { useState, useEffect, useCallback } from 'react';
import type { ChainState, RackDevice } from '@shared/types';

const EMPTY_STATE: ChainState = {
  chains: [],
  activeChainIndex: -1,
  rack: null,
};

export function useChains() {
  const [state, setState] = useState<ChainState>(EMPTY_STATE);
  const [racks, setRacks] = useState<RackDevice[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    // Load initial state
    window.api.chain.list().then(setState);

    // Subscribe to state changes
    const unsub = window.api.chain.onStateChanged(setState);
    return unsub;
  }, []);

  const discover = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const found = await window.api.chain.discover();
      setRacks(found);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const selectRack = useCallback(async (rack: RackDevice) => {
    await window.api.rack.select(rack);
  }, []);

  const clearRack = useCallback(async () => {
    await window.api.rack.clear();
    setState(EMPTY_STATE);
  }, []);

  const selectChain = useCallback(async (index: number) => {
    await window.api.chain.select(index);
  }, []);

  const selectNext = useCallback(async () => {
    await window.api.chain.next();
  }, []);

  const selectPrev = useCallback(async () => {
    await window.api.chain.prev();
  }, []);

  return {
    ...state,
    racks,
    isDiscovering,
    discover,
    selectRack,
    clearRack,
    selectChain,
    selectNext,
    selectPrev,
  };
}
