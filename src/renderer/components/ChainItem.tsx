import React from 'react';
import type { Chain } from '@shared/types';
import { abletonColorFromIndex } from '../utils/colors';

interface Props {
  chain: Chain;
  isActive: boolean;
  onClick: () => void;
}

export const ChainItem: React.FC<Props> = ({ chain, isActive, onClick }) => {
  const color = abletonColorFromIndex(chain.colorIndex);

  return (
    <button
      className={`chain-item ${isActive ? 'chain-item--active' : ''}`}
      onClick={onClick}
      style={{
        borderLeftColor: color,
        ...(isActive ? { backgroundColor: `${color}22` } : {}),
      }}
    >
      <span className="chain-item__indicator">
        {isActive ? '\u25C9' : '\u25CB'}
      </span>
      <span className="chain-item__name">{chain.name}</span>
      <span className="chain-item__index">#{chain.index + 1}</span>
    </button>
  );
};
