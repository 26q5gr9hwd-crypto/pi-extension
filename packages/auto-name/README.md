# @ryan_nookpi/pi-extension-auto-name

This extension automatically names a pi session based on the first user message — **without an LLM**.

It derives the title via simple string processing: strip markdown noise, cut at the first sentence boundary, hard-cap at 30 characters. No API key, no model, no latency, no cost.

## Install

    pi install npm:@ryan_nookpi/pi-extension-auto-name

## Great for

- quickly understanding what a session is about
- avoiding manual naming with `/name`
- showing the current task clearly in the terminal title and status area
- zero-cost, zero-latency naming with no LLM dependency

## How it works

- Reads the first user message from the `before_agent_start` event.
- Cleans markdown noise:
  - strips fenced and inline code blocks
  - strips leading list / heading / quote markers
  - collapses whitespace
- Cuts at the first natural clause boundary: sentence-ender (`. ! ?`), colon, semicolon, em/en dash, or `" - "` separator.
- Hard-caps at 30 characters with an ellipsis (`…`).
- Applies the result via `pi.setSessionName()` and updates the terminal title (`π - {name} - {cwd}`) and status footer.
- Never overwrites an existing session name.
- Skips automatic naming for subagent sessions.

## Manual override

Use pi's built-in `/name <new title>` command to override the auto-derived name at any time.

## Examples

| First message                                          | Resulting title         |
| ------------------------------------------------------ | ----------------------- |
| `Ship the next release`                                | `Ship the next release` |
| `Fix login bug. Then deploy to staging.`               | `Fix login bug`         |
| `VPS deploy: rebuild and restart`                      | `VPS deploy`            |
| `Refactor parser — split lexer`                        | `Refactor parser`       |
| `Update ` + "`package.json`" + ` and rebuild`          | `Update and rebuild`    |
| 200 characters of `x`                                  | `xxx…` (30 chars total) |
