# Carom

Carom is a browser arcade paddle duel about spin and bank shots. Move into a hit to bend the ball's flight, work around two solid amber obstacles, and send the ball past the other paddle. Play Solo against the machine or Versus with a friend on one keyboard. First to 11 wins, with a two-point lead.

Everything is drawn on canvas and every sound is synthesized. There are no external assets, runtime requests, accounts, or backend services. The supplied Simple 2D engine handles the clock, input, touch controls, audio, viewport fitting, and diagnostic overlay.

## Run locally

```sh
npm ci
npm run dev
```

Open the URL Vite prints. A current browser with Canvas 2D support is required.

## Production

```sh
npm ci
npm run build
```

Serve `dist/` from the root of any static web server. `npm run preview` serves the production build locally.

## Controls

| Action | Controls |
| --- | --- |
| Solo movement | W / S or Up / Down |
| Versus player one | W / S |
| Versus player two | Up / Down |
| Select a menu item | W / S or Up / Down; mouse or touch |
| Confirm | Enter or Space; click or tap |
| Pause / resume | P or Escape |
| Back | Escape |
| Toggle sound | M |
| Engine diagnostics | Backtick |

Touching the game reveals the engine's vertical paddle controls and menu buttons. Landscape gives the court more room on a phone. Move the paddle at contact to add spin; a stationary hit keeps existing spin. Top and bottom walls and the amber obstacles reflect the ball. Each paddle hit accelerates it up to a capped speed.

## Development and verification

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

The tests create a real engine over an in-process canvas and advance counted frames with a controlled clock. They exercise input, state transitions, physics, AI, sound events, and debug poses. `src/game.ts` exports the complete game and debug contract; `world.ts` builds initial and parked entities, `simulation.ts` contains the render-free simulation, `menus.ts` resolves input and screen transitions, `debug.ts` implements poses and readings, and `render.ts` draws the screens.

The debug API is returned only through `engine.debug`; it is not exposed on the page. Poses run through `engine.apply`, and snapshots are detached readings. Pointer press provenance stays with the state so a release on a later frame can be matched to its original menu item.

The `showcase/` directory contains a player description, three screenshots of the running game, and a six-second recording made with the engine's drawing recorder. The carousel manifest lists their presentation order.
