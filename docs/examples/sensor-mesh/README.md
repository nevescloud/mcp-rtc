# Example: sensor-mesh

A mesh of N browser tabs, each simulating a small environmental sensor — temperature, light, motion, humidity, sound level. Each tab exposes its readings as MCP tools (`get_reading`, `get_history`, `set_sample_rate`). A single Claude session (via `bridge-tab`) connects to all of them and can query the whole mesh: *"poll every sensor, summarize what's anomalous, plot the last hour."*

This is the **multi-peer mesh** demo: more than two peers, no central node, each peer discoverable and callable as an MCP server.

**Status:** placeholder. Will land alongside `bridge-tab`.

## Planned shape

```
                    (Claude with Chrome ext)
                              │
                       bridge-tab fans out to all
                       discovered peers in the mesh
                              │
        ┌──────────┬──────────┴──────────┬──────────┐
        ▼          ▼                     ▼          ▼
   sensor-tab  sensor-tab           sensor-tab  sensor-tab
   (temp)      (light)              (motion)    (humidity)
       │           │                    │           │
       └───────────┴── shared site id ──┴───────────┘
                       (mesh discovery
                        via mcp-rtc lobby)
```

Open as many sensor tabs as you want — each one announces itself to the lobby; bridge-tab subscribes to all of them. New tab opens → its tools appear in the local AI's tool list within seconds. Tab closes → tools disappear.

## Why this matters

The "sensors" are simulated for demo simplicity. The same multi-peer shape applies to:
- A handful of Raspberry Pis around a house, each running a tab with `read_dht22` / `actuate_relay`.
- Drones, robot arms, ROS nodes — any embedded device with a browser runtime or Node WebRTC.
- Live-data services in a building (BMS, network telemetry, badge readers) exposed as peer endpoints rather than scraped from a central dashboard.

Each peer is reachable directly. There's no central node to scale, queue at, or punch holes in. The protocol behaves the same with 2 peers or 200.
