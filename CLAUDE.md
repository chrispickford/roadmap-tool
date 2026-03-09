# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source Structure

All TypeScript source lives in `src/`. The compiled outputs (`server.js`, `public/js/app.js`) are build artifacts committed to the repo so the Docker image requires no build step at runtime.

```
src/
  server.ts       Express static file server
  types.ts        All TypeScript interfaces
  state.ts        App state, uid(), restoreState(), saveToLocalStorage()
  dates.ts        toDate(), fromDate(), formatDate(), escHtml()
  tracks.ts       assignTracks() — greedy track-packing algorithm
  drag-state.ts   Mutable drag/layout globals (hitAreas, rowBounds, layoutCache, dragState)
  renderer.ts     Canvas constants, renderToCanvas(), renderCanvas(), drawGhostBar()
  modal.ts        openModal(), closeModal()
  config-ui.ts    renderConfig(), renderDeliverables(), selectedRowId
  drag.ts         initCanvasDrag(), initPanelResize(), computeSnapDate()
  main.ts         onChange(), all event wiring, init
```

## Build

```bash
npm run build       # compile + minify both client and server
npm run watch       # rebuild on changes (sourcemaps, no minification)
npm run typecheck   # tsc --noEmit for both client and server configs
```

Build is handled by `scripts/build.mjs` (esbuild programmatic API). Two tsconfigs:
- `tsconfig.json` — client (ESNext modules, DOM lib, moduleResolution: bundler)
- `tsconfig.server.json` — server (CommonJS, node moduleResolution, esModuleInterop)
