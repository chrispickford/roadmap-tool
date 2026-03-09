# Roadmap Tool

An interactive browser-based tool for building and exporting project roadmaps and delivery plans.

## Getting Started

```bash
npm install
npm run build   # compile TypeScript → server.js + public/js/app.js
npm start       # serve on http://localhost:3000
```

## Development

```bash
npm run watch   # rebuild both targets on change (with sourcemaps)
npm run dev     # nodemon server.js — auto-restarts when server.js changes
```

Run `watch` and `dev` in parallel terminals for a full live-reload workflow.

```bash
npm run typecheck   # strict type-check both client and server
```

## Docker

```bash
npm run build          # ensure build artifacts are up to date
npm run docker:build   # docker build -t roadmap-tool .
npm run docker:run     # docker run --rm -p 3000:3000 roadmap-tool
```

## Features

### Canvas
- Swimlane layout with sprint columns, a milestones band, and labelled data rows
- Alternating sprint column shading for readability
- Deliverable bars pack into multiple vertical tracks when items overlap — rows expand automatically
- Text in deliverable boxes wraps to fill bar width; boxes grow taller to show the full label
- Canvas fills the available workspace and redraws on window resize

### Configuration Panel
A tabbed panel at the top of the page updates the canvas in real time.

| Tab | What you can do |
|---|---|
| **General** | Edit the roadmap title, start date, and end date |
| **Sprints** | Add, edit (label + start date), or delete sprint markers |
| **Milestones** | Add, edit (label + date), or delete milestones — rendered as red diamonds in a dedicated swimlane |
| **Swimlanes** | Add, edit (label + colour), or delete swimlane rows |
| **Deliverables** | Add, edit (label + start/end dates), or delete items within the selected swimlane |

The panel height is adjustable — drag the handle below it.

### Canvas Drag-and-Drop
Deliverable bars can be dragged directly on the canvas:
- Horizontal position snaps to the nearest sprint start date; duration is preserved
- Drag vertically to move a deliverable to a different swimlane
- A ghost bar shows the drop target while dragging

### Export and Persistence
- **Export PNG** — renders the roadmap at 1920×1080 and downloads a `.png` file
- **Save JSON** — downloads the current state as a `.json` file
- **Load JSON** — loads a previously saved `.json` file
- **Auto-save** — state is written to `localStorage` after every change

## Project Structure

```
roadmap-tool/
├── src/                     # TypeScript source (compiled by esbuild)
│   ├── server.ts            # Express static file server
│   ├── types.ts             # All TypeScript interfaces
│   ├── state.ts             # App state and persistence helpers
│   ├── dates.ts             # Date/string utilities
│   ├── tracks.ts            # Greedy track-packing algorithm
│   ├── drag-state.ts        # Mutable drag/layout globals
│   ├── renderer.ts          # Canvas rendering
│   ├── modal.ts             # Modal system
│   ├── config-ui.ts         # Config panel rendering
│   ├── drag.ts              # Canvas drag-and-drop + panel resize
│   └── main.ts              # Event wiring and init
├── scripts/
│   └── build.mjs            # esbuild build script (build + watch modes)
├── public/
│   ├── index.html           # App shell
│   ├── css/style.css        # Styles
│   └── js/app.js            # Compiled client bundle (build artifact)
├── server.js                # Compiled server bundle (build artifact)
├── tsconfig.json            # Client TypeScript config
├── tsconfig.server.json     # Server TypeScript config
├── Dockerfile
└── package.json
```

## Architecture Notes

**State** is a typed object with ISO date strings (`YYYY-MM-DD`) and numeric IDs:

```ts
{
  title: string;
  dateStart: string;
  dateEnd: string;
  sprints:    { id, label, start }[];
  milestones: { id, label, date }[];
  rows:       { id, label, color, deliverables: { id, label, start, end }[] }[];
}
```

**Canvas rendering** (`renderToCanvas`) is a two-pass process:
1. Layout pass — `ctx.measureText` computes text wrapping and dynamic bar/row heights
2. Draw pass — sprint columns → milestones swimlane → data rows → date axis → ghost bar (if dragging)

**Track packing** (`assignTracks`) greedily assigns deliverables to the minimum number of horizontal tracks to avoid overlap, sorted by start date.

**Export** renders into a detached offscreen canvas at 1920px wide, then scales to fit 1920×1080 with white letterboxing.

**Build** is handled by `scripts/build.mjs` using esbuild's programmatic API. Client and server are compiled concurrently. Two tsconfigs handle the different module environments (ESNext/bundler for client, CommonJS/node for server).
