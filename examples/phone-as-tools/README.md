# Example: phone-as-tools

A web page you open on your phone that exposes the device's capabilities — camera, GPS, microphone, clipboard, accelerometer — as MCP tools. Your desktop Claude (any variant with the Anthropic Chrome extension) connects via `mcp-rtc` + `bridge-tab` and calls them. Zero install on either side.

This is the **asymmetric-capability** demo: your phone has things your laptop doesn't, and now your AI can use them.

**Status:** placeholder. Will land alongside `bridge-tab`.

## Planned shape

```
(your phone)                                       (your laptop)
+--------------------------+              +-------------------------+
| open phone-tools.html    |              | Claude w/ Chrome ext    |
| exposes via WebMCP:      |   WebRTC     |   sees phone's tools    |
|   take_photo             | <─────────>  |   via bridge-tab        |
|   get_location           |  (mcp-rtc)   |                         |
|   record_audio(seconds)  |              | "take a photo of the    |
|   read_clipboard         |              |  whiteboard and OCR it" |
|   get_orientation        |              |                         |
+--------------------------+              +-------------------------+
```

Pairing: open the page on your phone, copy the site ID, tell desktop Claude `connect to <site-id>`.

## Why this matters

Centralized MCP makes "tools" sound like SaaS endpoints. This example makes it visceral that an MCP server can be **your pocket**. Anything with a browser is potentially a tool source — the phone is just the loudest version of the point. Same shape applies to Raspberry Pis, Home Assistant tabs, in-browser dev environments, embedded devices.
