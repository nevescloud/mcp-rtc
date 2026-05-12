# Example: hands-and-eyes

A page on the laptop you're working at exposes `take_screenshot`, `read_clipboard`, `read_selection`, `record_screen(seconds)`, and (optional, with permission) `read_camera`. A remote Claude — yours, on another machine, or a teammate's — connects via `mcp-rtc` + `bridge-tab` and can *see what you're doing*. You ask: *"watch what I'm doing for 30 seconds and tell me what I'm getting wrong."*

This is the **asymmetric + cross-user** demo: the remote AI doesn't have eyes or hands on your screen until you give it some, scoped to one tab, revocable by closing it.

**Status:** placeholder. Will land alongside `bridge-tab`.

## Planned shape

```
(your machine)                           (anywhere — your other laptop,
                                          a teammate's machine, claude.ai)
+--------------------------+        +-------------------------------+
| hands-and-eyes.html      |        | Claude with Chrome extension  |
|  exposes via WebMCP:     | WebRTC |  via bridge-tab:              |
|    take_screenshot       |<──────>|    your tools in              |
|    read_clipboard        |(mcp-rtc)|    navigator.modelContext    |
|    read_selection        |        |                               |
|    record_screen(seconds)|        | "watch for 30s and call out  |
|    read_camera (opt-in)  |        |  anything you'd flag in code  |
|  every call surfaces in  |        |  review or in the UI"         |
|  a visible audit feed    |        |                               |
+--------------------------+        +-------------------------------+
```

## Why this matters

The "remote pair programming with an AI" experience that screen-share + a separate chat window approximates today, but as native tool calls instead of one-way video. Generalizes:
- Solo: drive a remote machine's Claude from your local one without copy-pasting context.
- Support: a customer shares hands-and-eyes with a support engineer's Claude during a triage call.
- Teaching: a learner shares with a tutor's Claude that can see their attempts and respond.

The pattern that makes this feasible is the same one that makes `phone-as-tools` feasible — bridge-tab takes whatever the local browser can do (Screen Capture API, Clipboard API, getUserMedia) and packages it as MCP tools. mcp-rtc carries the calls.
