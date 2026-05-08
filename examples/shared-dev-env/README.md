# Example: shared-dev-env

Two developers, two laptops, two Claudes — but one shared set of tools. Alice opens a tab in front of her dev environment that exposes `query_staging_db`, `tail_logs`, `run_migration`, `read_file`. Bob's Claude (running anywhere — Code, Desktop, claude.ai with Chrome extension) connects via `mcp-rtc` + `bridge-tab` and can call those tools as if they were local. Alice sees every call; nothing leaves her machine without her tab brokering it.

This is the **cross-user collaboration** demo: two humans, two AIs, shared tool access without setting up a server, sharing credentials, or installing anything on Bob's side.

**Status:** placeholder. Will land alongside `bridge-tab`.

## Planned shape

```
(Alice's laptop)                              (Bob's laptop)
+---------------------------+        +-----------------------------+
| dev-env.html              |        | Claude (any variant)        |
|  exposes via WebMCP:      | WebRTC |  via bridge-tab:            |
|    query_staging_db       |<──────>|    Alice's tools appear     |
|    tail_logs              |(mcp-rtc)|    in navigator.modelContext|
|    run_migration          |        |                             |
|    read_file              |        | "Bob: pull last 5 minutes   |
|  shows audit log of every |        |  of logs from staging and   |
|  remote call as it lands  |        |  diff against my repo"      |
+---------------------------+        +-----------------------------+
```

## Why this matters

The status quo for "let me poke at your environment" is screen-share, paste-into-Slack, or "here's a temporary VPN cred." All of those leak more than the asker needs and take more setup than the answerer wants to do. With `mcp-rtc`, Alice picks the exact tools she's willing to share, sees every invocation, and can revoke by closing the tab. Same shape generalizes to support engineers helping customers, oncall handing off context to a teammate, or interview pairing where the candidate wants to show what they're working in without giving the interviewer write access to anything.
