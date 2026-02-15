import { useState, useEffect } from 'react';
import type { ConnectionState } from '@shared/types';

const INITIAL: ConnectionState = {
  osc: 'disconnected',
  midi: 'disconnected',
  midiDeviceName: null,
};

export function useConnection() {
  const [state, setState] = useState<ConnectionState>(INITIAL);

  useEffect(() => {
    window.api.connection.getStatus().then(setState);
    const unsub = window.api.connection.onStatusChanged(setState);
    return unsub;
  }, []);

  return state;
}
