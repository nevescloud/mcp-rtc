# Example: echo

Two-process echo demo that exercises the `@jonasneves/mcp-rtc` transport end-to-end. Server registers a single `echo` tool that returns its input reversed; client connects, lists tools, calls echo, prints the response.

**Status:** placeholder. Will land alongside `@jonasneves/mcp-rtc`.

## Planned shape

```sh
node server.mjs my-room    # in one terminal
node client.mjs my-room    # in another, possibly on a different machine
# expected output on the client:
#   discovered tools: echo
#   echo result: olleh
```
