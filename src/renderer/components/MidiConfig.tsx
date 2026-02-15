import React, { useState } from 'react';
import type { MidiDevice, MidiPadConfig, LearnTarget } from '@shared/types';

interface Props {
  devices: MidiDevice[];
  selectedDeviceName: string | null;
  padConfig: MidiPadConfig;
  onSelectDevice: (name: string) => void;
  onRefreshDevices: () => void;
  onStartLearn: (target: LearnTarget) => void;
  onStopLearn: () => void;
}

function noteToName(note: number | null): string {
  if (note === null) return 'Not set';
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(note / 12) - 1;
  return `${names[note % 12]}${octave} (${note})`;
}

export const MidiConfig: React.FC<Props> = ({
  devices,
  selectedDeviceName,
  padConfig,
  onSelectDevice,
  onRefreshDevices,
  onStartLearn,
  onStopLearn,
}) => {
  const [learning, setLearning] = useState<LearnTarget | null>(null);

  const handleLearn = (target: LearnTarget) => {
    if (learning === target) {
      setLearning(null);
      onStopLearn();
    } else {
      setLearning(target);
      onStartLearn(target);
    }
  };

  // Reset learn state when learn completes (padConfig changes)
  React.useEffect(() => {
    setLearning(null);
  }, [padConfig]);

  return (
    <div className="midi-config">
      <div className="midi-config__device-row">
        <select
          className="midi-select"
          value={selectedDeviceName ?? ''}
          onChange={(e) => e.target.value && onSelectDevice(e.target.value)}
        >
          <option value="">-- MIDI Device --</option>
          {devices.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary btn-small" onClick={onRefreshDevices}>
          Refresh
        </button>
      </div>

      <div className="midi-config__pads">
        <div className="midi-config__pad">
          <span className="midi-config__pad-label">Prev:</span>
          <span className="midi-config__pad-value">{noteToName(padConfig.prevNote)}</span>
          <button
            className={`btn btn-small ${learning === 'prev' ? 'btn-learning' : 'btn-secondary'}`}
            onClick={() => handleLearn('prev')}
          >
            {learning === 'prev' ? 'Hit pad...' : 'Learn'}
          </button>
        </div>
        <div className="midi-config__pad">
          <span className="midi-config__pad-label">Next:</span>
          <span className="midi-config__pad-value">{noteToName(padConfig.nextNote)}</span>
          <button
            className={`btn btn-small ${learning === 'next' ? 'btn-learning' : 'btn-secondary'}`}
            onClick={() => handleLearn('next')}
          >
            {learning === 'next' ? 'Hit pad...' : 'Learn'}
          </button>
        </div>
      </div>
    </div>
  );
};
