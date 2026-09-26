# PlayPea

Play against, and analyse with, every released version of my chess engine
[Pea](https://github.com/WGCodings/Pea), right in the browser.
Live at **https://playpea.wgcodings.com**.

The site is fully static. Every Pea version is compiled to WebAssembly and runs
in a Web Worker on the **visitor's own CPU**; the Raspberry Pi only serves
files. That keeps the Pi idle no matter how many people are playing.

The interface is a fork of [Chesskit](https://github.com/GuillaumeSD/Chesskit)
(AGPL-3.0) with Stockfish swapped out for Pea.

## Features

- **Play** against any Pea release (v1.0 ≈ 650 Elo up to v9.1), pick your
  colour, thinking time per move and an optional starting position.
- **Analysis**: live evaluation and principal variation, eval bar, arrows,
  game review with move classification, accuracy and an eval graph.
- Load games from PGN, chess.com or lichess.
- The game database is hidden for now (`DATABASE_ENABLED` in
  `src/constants.ts`). It stores games in the visitor's browser (IndexedDB),
  not on the server.

## How the engine runs in the browser

```
page ──postMessage(UCI)──► pea-worker.js ──► pea-engine.js (inner worker)
                              │                  └─ pea-vX.wasm (wasm32-wasip1, unmodified Pea)
                              └─ handles "stop"
```

- Each release is built from its git tag for `wasm32-wasip1` with SIMD
  (`simd128`); Pea's AVX2 code is behind `cfg` so the scalar/auto-vectorised
  path is used. Speed is close to a native build without AVX2.
- The engine's normal stdin UCI loop is kept as is. `tools/asyncify.mjs` runs
  Binaryen's asyncify pass on only the ~12 functions on the stdin path, so a
  read can pause until the next UCI command arrives. The search code isn't
  touched.
- Pea's search is synchronous, so it can't read `stop` while searching. The
  outer worker handles `stop` by terminating the engine worker, reporting the
  best move so far and starting a fresh one.
- Single-threaded. No `SharedArrayBuffer`, so no special COOP/COEP headers are
  needed.

Every build was checked against the published Linux release binary: same
node counts and best moves on fixed-depth searches.

Two releases needed a fix to match their published binaries:

- **v4.0**: the release binary embeds the small Gen 4 Net 1, while the tag
  points at Net 0. See `tools/patches/v4.0.sh`.
- **v7.0**: the net was never committed, so it was recovered from the release
  binary into `tools/nets/v7.0/`.

## Adding a new Pea version

1. Build it (needs `rustup target add wasm32-wasip1`, Node 18+ and
   [binaryen](https://github.com/WebAssembly/binaryen/releases)'s `wasm-opt`):
   ```bash
   tools/build-engines.sh v10.0          # -> public/engines/pea/pea-v10.0.wasm
   ```
   Add the tag to `tools/pea-versions.txt` so full rebuilds include it.
2. Add an entry at the top of `PEA_VERSIONS` in `src/data/peaVersions.ts`
   (id, Elo estimate, net). The newest entry should also be `DEFAULT_ENGINE`
   in `src/constants.ts`.
3. Commit the `.wasm` and deploy.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build      # static site in out/
```

## Deploying on the Pi

The Pi runs Caddy (in the Monitoring stack) as the reverse proxy for every
site. PlayPea is one nginx container on the shared `edge` network.

```bash
git clone https://github.com/WGCodings/PlayPea.git ~/PlayPea
cd ~/PlayPea
docker compose up -d --build
```

Then, in `~/Monitoring`:

1. Add `caddy/sites/playpea.caddy`:
   ```
   playpea.wgcodings.com {
   	import access_log
   	reverse_proxy playpea:80
   }
   ```
2. Add a DNS record at Combell: `playpea` CNAME `monitor.wgcodings.com`.
3. `docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`

To update: `git pull && docker compose up -d --build`.

If building on the Pi is too slow or runs out of memory, run `npm run build`
on your PC and copy `out/` to the Pi. Then serve that folder with the same
nginx config by mounting it into an `nginx:stable-alpine` container.

## License

AGPL-3.0, like Chesskit. See [LICENCE](LICENCE) and [COPYING.md](COPYING.md)
for the licences of the piece sets and sounds. The original Chesskit README is
kept in [CHESSKIT_README.md](CHESSKIT_README.md).
