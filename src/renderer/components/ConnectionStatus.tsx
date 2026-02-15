import React from 'react';
import type { ConnectionState } from '@shared/types';

interface Props {
  connection: ConnectionState;
}

export const ConnectionStatus: React.FC<Props> = ({ connection }) => {
  const oscClass = `status-dot status-${connection.osc}`;
  const midiClass = `status-dot status-${connection.midi}`;

  return (
    <div className="connection-bar">
      <div className="connection-item">
        <span className={oscClass} />
        <span className="connection-label">
          OSC {connection.osc === 'connected' ? 'Connected' : connection.osc === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>
      <div className="connection-item">
        <span className={midiClass} />
        <span className="connection-label">
          {connection.midiDeviceName
            ? `MIDI: ${connection.midiDeviceName}`
            : 'MIDI: Not connected'}
        </span>
      </div>
    </div>
  );
};
