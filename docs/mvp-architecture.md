# My Pet Assistant MVP

## Stack

- Desktop shell: Tauri 2 + Rust
- Frontend: Next.js + React + TypeScript
- Animation: existing Live2D pipeline from BongoCat Next
- Local AI orchestrator: `apps/agent-service`
- Shared contracts: `packages/shared-*`
- Local data: `data/*.json`

## Current MVP scope

- Desktop pet stage with the existing Live2D model
- Chat panel and task queue on the main window
- Dedicated settings window with 4 tabs:
  - General
  - Pet
  - AI
  - Permissions
- Global shortcut support driven by the saved desktop settings
- Tauri tool bridge for:
  - `open_app`
  - `open_url`
  - `run_command`
  - `file_search`
- Permission confirmation modal before risky actions
- JSON-backed settings, permissions, memory and task storage
- Audit logs written to `data/logs`

## Development commands

```bash
pnpm install
pnpm dev:agent
pnpm tauri:dev
```

## Next step suggestions

1. Replace the rule-based planner in `apps/agent-service` with real OpenAI routing.
2. Register the global hotkey from settings into Tauri.
3. Add richer task lifecycle updates and streaming chat feedback.
4. Expand the tool bridge to Browser automation / AutoHotkey / MCP adapters.
