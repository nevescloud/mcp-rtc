# Example: phone-as-tools

A web page you open on your phone that exposes the device's capabilities — camera, GPS, clipboard, orientation — as MCP tools. Your laptop's Claude (or any AI consuming `mcp-rtc`) calls them. Zero install on the AI side.

This is the **asymmetric-capability** demo: your phone has things your laptop doesn't, and now your AI can use them.

**Live at [`neves.cloud/p/`](https://neves.cloud/p/)** — open it on a phone.

## What it exposes

| Tool | Returns | Permission |
|---|---|---|
| `take_photo` | JPEG (base64), 800×600, ~30–50 KB | camera |
| `get_location` | `{ latitude, longitude, accuracy_m, timestamp_ms }` | geolocation |
| `read_clipboard` | text | clipboard-read (often gesture-gated) |
| `get_orientation` | `{ alpha_deg, beta_deg, gamma_deg }` | DeviceOrientation (iOS 13+ requires explicit grant) |

Permissions are requested lazily on the first call to each tool. The page surfaces a per-tool permission badge (`unknown` / `granted` / `denied` / `blocked`) so the user can see which capabilities have been authorized.

## Demo flow

```
(your phone)                                      (your laptop)
─────────────                                     ─────────────
Open neves.cloud/p/                               Claude Code (with
  ↓                                               @jonasneves/mcp-webrtc-bridge)
Site id: ph-XXXXXXXX appears                      OR
in URL bar; copy a "Paste in                      Claude.ai in a Chrome 146+
Claude Code" prompt or share the                  tab with a WebMCP consumer
"open in Chrome 146+" URL with                       ↓
your laptop                                       paste / open the prompt
                                                     ↓
                                                  Claude calls take_photo,
                                                  get_location, etc. — phone
                                                  prompts the user once per
                                                  capability, then the call
                                                  routes back via mcp-rtc
```

A user typing *"take a photo of the whiteboard and OCR it"* on their laptop's Claude triggers a tool call that:

1. Reaches the phone via WebRTC.
2. Captures from the rear camera (after permission).
3. Returns the JPEG as image content over the same wire.
4. Claude reads the image and replies.

## Caveats

- **HTTPS required** for `getUserMedia`, `geolocation`, and `clipboard.readText`. `neves.cloud` serves HTTPS, so the live URL works; if you fork and self-host, use HTTPS or `localhost`.
- **iOS Safari** gates DeviceOrientation behind an explicit user-gesture permission grant (`DeviceOrientationEvent.requestPermission()`). The page handles this; the user taps "Allow motion" once.
- **Clipboard reads** are heavily gated on most mobile browsers. The tool will often return an error explaining a user gesture is needed; not the page's bug.
- **Photo size** is intentionally bounded (800×600 JPEG quality 0.6) to stay well within mcp-rtc's recommended 256 KB single-frame limit. Larger photos would risk drops on poor connections.

## Source

- Live page (canonical): [`jonasneves.github.io/docs/p/index.html`](https://github.com/jonasneves/jonasneves.github.io/blob/main/docs/p/index.html) → served at `neves.cloud/p/`.
- The page imports `@jonasneves/mcp-rtc` from esm.sh; it is otherwise a self-contained single HTML file (~250 lines).
