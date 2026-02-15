import React from 'react';
import type { RackDevice } from '@shared/types';

interface Props {
  racks: RackDevice[];
  selectedRack: RackDevice | null;
  isDiscovering: boolean;
  onDiscover: () => void;
  onSelect: (rack: RackDevice) => void;
  onClear: () => void;
}

export const RackSelector: React.FC<Props> = ({
  racks,
  selectedRack,
  isDiscovering,
  onDiscover,
  onSelect,
  onClear,
}) => {
  return (
    <div className="rack-selector">
      <div className="rack-selector-row">
        <select
          className="rack-select"
          value={selectedRack ? `${selectedRack.trackId}:${selectedRack.deviceId}` : ''}
          onChange={(e) => {
            if (e.target.value === '') {
              onClear();
            } else {
              const rack = racks.find(
                (r) => `${r.trackId}:${r.deviceId}` === e.target.value
              );
              if (rack) onSelect(rack);
            }
          }}
        >
          <option value="">-- Select Instrument Rack --</option>
          {racks.map((rack) => (
            <option
              key={`${rack.trackId}:${rack.deviceId}`}
              value={`${rack.trackId}:${rack.deviceId}`}
            >
              {rack.trackName} / {rack.deviceName}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary"
          onClick={onDiscover}
          disabled={isDiscovering}
        >
          {isDiscovering ? 'Scanning...' : 'Scan'}
        </button>
      </div>
    </div>
  );
};
