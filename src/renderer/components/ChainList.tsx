import React, { useRef, useCallback, useEffect } from 'react';
import { ChainItem } from './ChainItem';
import type { Chain } from '@shared/types';

interface Props {
  chains: Chain[];
  activeChainIndex: number;
  onSelectChain: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ChainList: React.FC<Props> = ({
  chains,
  activeChainIndex,
  onSelectChain,
  onPrev,
  onNext,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current || activeChainIndex < 0) return;
    const activeEl = listRef.current.querySelector('.chain-item--active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeChainIndex]);

  const scrollPage = useCallback((direction: 'up' | 'down') => {
    if (!listRef.current) return;
    const height = listRef.current.clientHeight;
    listRef.current.scrollBy({
      top: direction === 'up' ? -height : height,
      behavior: 'smooth',
    });
  }, []);

  if (chains.length === 0) {
    return (
      <div className="chain-list chain-list--empty">
        <p>No chains loaded. Select an Instrument Rack above.</p>
      </div>
    );
  }

  return (
    <div className="chain-list">
      <div className="chain-list__scroll-row">
        <div className="chain-list__items" ref={listRef}>
          {chains.map((chain) => (
            <ChainItem
              key={chain.index}
              chain={chain}
              isActive={chain.index === activeChainIndex}
              onClick={() => onSelectChain(chain.index)}
            />
          ))}
        </div>
        <div className="chain-list__scroll-buttons">
          <button className="btn btn-scroll" onClick={() => scrollPage('up')}>
            &#9650;
          </button>
          <button className="btn btn-scroll" onClick={() => scrollPage('down')}>
            &#9660;
          </button>
        </div>
      </div>
      <div className="chain-list__nav">
        <button className="btn btn-nav" onClick={onPrev}>
          &larr; Prev
        </button>
        <span className="chain-list__current">
          {activeChainIndex >= 0 && activeChainIndex < chains.length
            ? chains[activeChainIndex].name
            : '---'}
        </span>
        <button className="btn btn-nav" onClick={onNext}>
          Next &rarr;
        </button>
      </div>
    </div>
  );
};
