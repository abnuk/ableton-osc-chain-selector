# AbletonOSC Chain API

OSC API for controlling rack device chains (Instrument Rack, Audio Effect Rack, MIDI Effect Rack) in Ableton Live. Implemented as an extension to [AbletonOSC](https://github.com/ideoforms/AbletonOSC) on the `feature/chain-api` branch.

## Connection

- **Send to**: `127.0.0.1:11000`
- **Receive on**: `127.0.0.1:11001`

## Prerequisites

To work with chains, first identify which devices on a track support chains:

```
/live/track/get/devices/can_have_chains  track_id  →  track_id, [bool, ...]
```

Only devices with `can_have_chains = True` (class names like `InstrumentGroupDevice`, `AudioEffectGroupDevice`, `MidiEffectGroupDevice`) support the endpoints below.

---

## Device-Scoped Endpoints

These operate on the rack device as a whole. Parameters: `(track_id, device_id)`.

### Bulk Chain Queries

| Address | Query Params | Response Params | Description |
|:--------|:-------------|:----------------|:------------|
| `/live/device/get/num_chains` | track_id, device_id | track_id, device_id, num_chains | Number of chains in the rack |
| `/live/device/get/chains/name` | track_id, device_id | track_id, device_id, [name, ...] | All chain names |
| `/live/device/get/chains/color` | track_id, device_id | track_id, device_id, [color, ...] | All chain colors (RGB int) |
| `/live/device/get/chains/color_index` | track_id, device_id | track_id, device_id, [color_index, ...] | All chain color indices |
| `/live/device/get/chains/mute` | track_id, device_id | track_id, device_id, [mute, ...] | Mute state for all chains |
| `/live/device/get/chains/solo` | track_id, device_id | track_id, device_id, [solo, ...] | Solo state for all chains |

### Selected Chain

| Address | Query Params | Response Params | Description |
|:--------|:-------------|:----------------|:------------|
| `/live/device/get/selected_chain` | track_id, device_id | track_id, device_id, chain_index | Index of the currently selected chain |
| `/live/device/set/selected_chain` | track_id, device_id, chain_index | | Set selected chain by index |

> **Note**: `selected_chain` controls UI selection in Live's rack view. It does not affect audio routing -- use `mute`/`solo` to control which chains are audible.

### Device-Scoped Listeners

| Address | Query Params | Response Address | Response Params | Description |
|:--------|:-------------|:-----------------|:----------------|:------------|
| `/live/device/start_listen/chains` | track_id, device_id | `/live/device/get/chains` | track_id, device_id, [name, ...] | Fires when chains are added/removed |
| `/live/device/stop_listen/chains` | track_id, device_id | | | Stop listening |
| `/live/device/start_listen/selected_chain` | track_id, device_id | `/live/device/get/selected_chain` | track_id, device_id, chain_index | Fires when selected chain changes |
| `/live/device/stop_listen/selected_chain` | track_id, device_id | | | Stop listening |

---

## Chain-Scoped Endpoints

These operate on individual chains. Parameters: `(track_id, device_id, chain_id)`.

### Chain Properties

| Address | Query Params | Response Params | Description |
|:--------|:-------------|:----------------|:------------|
| `/live/chain/get/name` | track_id, device_id, chain_id | track_id, device_id, chain_id, name | Chain name |
| `/live/chain/set/name` | track_id, device_id, chain_id, name | | Set chain name |
| `/live/chain/get/color` | track_id, device_id, chain_id | track_id, device_id, chain_id, color | Chain color (RGB int) |
| `/live/chain/get/color_index` | track_id, device_id, chain_id | track_id, device_id, chain_id, color_index | Chain color index |
| `/live/chain/get/mute` | track_id, device_id, chain_id | track_id, device_id, chain_id, mute | Mute state (True/False) |
| `/live/chain/set/mute` | track_id, device_id, chain_id, mute | | Set mute (0/1) |
| `/live/chain/get/solo` | track_id, device_id, chain_id | track_id, device_id, chain_id, solo | Solo state (True/False) |
| `/live/chain/set/solo` | track_id, device_id, chain_id, solo | | Set solo (0/1) |

### Chain Mixer

| Address | Query Params | Response Params | Description |
|:--------|:-------------|:----------------|:------------|
| `/live/chain/get/volume` | track_id, device_id, chain_id | track_id, device_id, chain_id, volume | Chain volume (0.0 - 1.0) |
| `/live/chain/set/volume` | track_id, device_id, chain_id, volume | | Set chain volume |
| `/live/chain/get/panning` | track_id, device_id, chain_id | track_id, device_id, chain_id, panning | Chain panning (-1.0 to 1.0) |
| `/live/chain/set/panning` | track_id, device_id, chain_id, panning | | Set chain panning |

### Chain Devices

| Address | Query Params | Response Params | Description |
|:--------|:-------------|:----------------|:------------|
| `/live/chain/get/num_devices` | track_id, device_id, chain_id | track_id, device_id, chain_id, num_devices | Number of devices in chain |
| `/live/chain/get/devices/name` | track_id, device_id, chain_id | track_id, device_id, chain_id, [name, ...] | Device names within chain |
| `/live/chain/get/devices/type` | track_id, device_id, chain_id | track_id, device_id, chain_id, [type, ...] | Device types within chain |
| `/live/chain/get/devices/class_name` | track_id, device_id, chain_id | track_id, device_id, chain_id, [class_name, ...] | Device class names within chain |
| `/live/chain/set/devices_enabled` | track_id, device_id, chain_id, enabled | | Bulk enable/disable all devices in chain (sets parameter 0 "Device On" on each device; 1 = on, 0 = off). Disabling saves CPU. |

### Chain-Scoped Listeners

| Address | Query Params | Response Address | Response Params | Description |
|:--------|:-------------|:-----------------|:----------------|:------------|
| `/live/chain/start_listen/mute` | track_id, device_id, chain_id | `/live/chain/get/mute` | track_id, device_id, chain_id, mute | Fires on mute change |
| `/live/chain/stop_listen/mute` | track_id, device_id, chain_id | | | Stop listening |
| `/live/chain/start_listen/solo` | track_id, device_id, chain_id | `/live/chain/get/solo` | track_id, device_id, chain_id, solo | Fires on solo change |
| `/live/chain/stop_listen/solo` | track_id, device_id, chain_id | | | Stop listening |
| `/live/chain/start_listen/name` | track_id, device_id, chain_id | `/live/chain/get/name` | track_id, device_id, chain_id, name | Fires on name change |
| `/live/chain/stop_listen/name` | track_id, device_id, chain_id | | | Stop listening |
| `/live/chain/start_listen/volume` | track_id, device_id, chain_id | `/live/chain/get/volume` | track_id, device_id, chain_id, volume | Fires on volume change |
| `/live/chain/stop_listen/volume` | track_id, device_id, chain_id | | | Stop listening |
| `/live/chain/start_listen/panning` | track_id, device_id, chain_id | `/live/chain/get/panning` | track_id, device_id, chain_id, panning | Fires on panning change |
| `/live/chain/stop_listen/panning` | track_id, device_id, chain_id | | | Stop listening |

---

## Typical Workflow: Chain Selector UI

```
1. Discover racks:
   /live/song/get/num_tracks                          → count tracks
   /live/track/get/devices/can_have_chains  track_id  → find rack devices

2. List chains:
   /live/device/get/chains/name   track_id, device_id → all chain names
   /live/device/get/selected_chain track_id, device_id → current selection

3. Subscribe to changes:
   /live/device/start_listen/chains          track_id, device_id
   /live/device/start_listen/selected_chain  track_id, device_id

4. Switch active chain (enable devices on active, disable on others — saves CPU):
   /live/chain/set/devices_enabled  track_id, device_id, 0, 0  → disable chain 0 devices
   /live/chain/set/devices_enabled  track_id, device_id, 1, 0  → disable chain 1 devices
   /live/chain/set/devices_enabled  track_id, device_id, 2, 1  → enable chain 2 devices (active)
   /live/device/set/selected_chain  track_id, device_id, 2     → select in UI
```
