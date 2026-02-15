import { OscClient } from '../osc/OscClient';
import type { RackDevice } from '@shared/types';

/**
 * Discovers tracks and rack devices (Instrument Rack, etc.) that support chains.
 */
export class ChainDiscovery {
  constructor(private osc: OscClient) {}

  /**
   * Scan all tracks for rack devices with chains.
   * Returns a list of RackDevices that can be used with ChainManager.
   */
  async discover(): Promise<RackDevice[]> {
    const racks: RackDevice[] = [];

    // 1. Get track count
    const numTracksMsg = await this.osc.request('/live/song/get/num_tracks');
    const numTracks = numTracksMsg.args[0]?.value as number;
    if (!numTracks || numTracks === 0) return racks;

    // 2. For each track, check devices for chain support
    for (let trackId = 0; trackId < numTracks; trackId++) {
      try {
        const [trackNameMsg, canHaveChainsMsg, deviceNamesMsg] = await Promise.all([
          this.osc.request('/live/track/get/name', trackId),
          this.osc.request('/live/track/get/devices/can_have_chains', trackId),
          this.osc.request('/live/track/get/devices/name', trackId),
        ]);

        const trackName = trackNameMsg.args[1]?.value as string ?? `Track ${trackId}`;

        // args[0] is track_id, rest are booleans per device
        const canHaveChains = canHaveChainsMsg.args.slice(1);
        const deviceNames = deviceNamesMsg.args.slice(1);

        for (let deviceIdx = 0; deviceIdx < canHaveChains.length; deviceIdx++) {
          const canHave = canHaveChains[deviceIdx]?.value;
          if (canHave === 1 || canHave === 'true' || canHave === true as unknown) {
            const deviceName = (deviceNames[deviceIdx]?.value as string) ?? `Device ${deviceIdx}`;
            racks.push({
              trackId,
              trackName,
              deviceId: deviceIdx,
              deviceName,
            });
          }
        }
      } catch (err) {
        console.warn(`[ChainDiscovery] Error scanning track ${trackId}:`, err);
      }
    }

    return racks;
  }
}
