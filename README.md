# DeepNotes

Website: [https://deepnotes.app](https://deepnotes.app)

DeepNotes is an open source, end-to-end encrypted infinite canvas note-taking app with deep page navigation and live collaboration.

## Why DeepNotes?

- **Infinite canvas note-taking:** Free yourself from the big wall of text.
- **Deep page navigation:** Explore concepts in all their complexity.
- **End-to-end encryption:** Keep your notes well protected.
- **Live collaboration:** Create groups to collaborate with your team.
- **Flexible note system:** Organize your notes in whatever way you want.
- **Lifelong storage:** Never lose your notes ever again.

## Development

```console
git clone https://github.com/DeepNotesApp/DeepNotes && cd DeepNotes && cp template.env .env && pnpm install && pnpm run repo:build && docker-compose up -d
```

(On Windows, use WSL or Git Bash to run the commands above)

1. Run `pnpm run dev` to start the backend servers.
2. Run one of these commands to start the frontend server:
   - `pnpm run dev:spa` to start the Single Page Application app.
   - `pnpm run dev:ssr` to start the Server Side Rendered app.
   - `pnpm run dev:electron` to start the Electron app.
   - `pnpm run dev:android` to start the Android app (requires Android Studio).
   - `pnpm run dev:ios` to start the iOS app (requires Xcode).

(If you use SPA or SSR, you must access the app through `http://localhost:60379` by default. Other URLs won't work. You can configure the host and ports in the `.env` file.)

## Special thanks to these libraries for making DeepNotes possible:

- [Vue.js](https://vuejs.org/): Reactivity, component system, and more
- [Quasar Framework](https://quasar.dev/): Cross-platform frontend framework
- [Yjs](https://docs.yjs.dev/): Live collaboration
- [Tiptap](https://tiptap.dev/): Rich text editor
- [KeyDB](https://docs.keydb.dev/) and [Redis](https://redis.io/): Scalable shared memory and communication
- And many more...
