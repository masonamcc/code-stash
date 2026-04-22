# CodeStash

A lightweight desktop app for saving and organizing code snippets locally. Built with Tauri and React.

## Features

- **Save snippets** — paste code, give it a name and file extension, and save it to your local stash
- **Organize with folders** — create folders to group related snippets
- **40+ file types** — recognized extensions each get a unique icon (.js, .py, .rs, .go, and more)
- **One-click copy** — copy any snippet to your clipboard instantly
- **Soft delete with recovery** — deleted files go to a backup folder; restore or permanently remove them from the Recover view
- **Auto-updates** — the app checks for and installs new releases automatically on launch

## Tech Stack

- [Tauri v2](https://tauri.app/) — Rust-based desktop shell
- [React 19](https://react.dev/) — UI
- Tauri plugins: `plugin-fs`, `plugin-updater`, `plugin-process`

## Development

**Prerequisites:** Node.js, Rust, and the [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build the desktop app
npm run build && npx tauri build
```

The dev server runs at `http://localhost:3000`. Tauri wraps it in a native window automatically.

## Releases

Builds are distributed as signed installers via GitHub Releases. The app auto-updates by polling:

```
https://github.com/masonamcc/code-stash/releases/latest/download/latest.json
```

Current version: `1.0.916`
