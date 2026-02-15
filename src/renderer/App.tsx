import React, { useEffect } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus';
import { RackSelector } from './components/RackSelector';
import { ChainList } from './components/ChainList';
import { MidiConfig } from './components/MidiConfig';
import { useChains } from './hooks/useChains';
import { useConnection } from './hooks/useConnection';
import { useMidiConfig } from './hooks/useMidiConfig';

const App: React.FC = () => {
  const connection = useConnection();
  const {
    chains,
    activeChainIndex,
    rack,
    racks,
    isDiscovering,
    discover,
    selectRack,
    clearRack,
    selectChain,
    selectNext,
    selectPrev,
  } = useChains();
  const midi = useMidiConfig();

  // Auto-discover on first connect
  useEffect(() => {
    if (connection.osc === 'connected' && racks.length === 0) {
      discover();
    }
  }, [connection.osc, racks.length, discover]);

  return (
    <div className="app">
      <ConnectionStatus connection={connection} />

      <RackSelector
        racks={racks}
        selectedRack={rack}
        isDiscovering={isDiscovering}
        onDiscover={discover}
        onSelect={selectRack}
        onClear={clearRack}
      />

      <ChainList
        chains={chains}
        activeChainIndex={activeChainIndex}
        onSelectChain={selectChain}
        onPrev={selectPrev}
        onNext={selectNext}
      />

      <div className="divider" />

      <MidiConfig
        devices={midi.devices}
        selectedDeviceName={connection.midiDeviceName}
        padConfig={midi.padConfig}
        onSelectDevice={midi.selectDevice}
        onRefreshDevices={midi.refreshDevices}
        onStartLearn={midi.startLearn}
        onStopLearn={midi.stopLearn}
      />
    </div>
  );
};

export default App;
