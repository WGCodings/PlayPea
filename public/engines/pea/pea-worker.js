/*
 * PlayPea — Pea UCI engine as a Web Worker.
 *
 *   new Worker("/engines/pea/pea-worker.js?v=v9.1")
 *
 * Speaks plain UCI over postMessage, like stockfish.js does: post command
 * strings in, receive output lines back. All computation happens on the
 * visitor's CPU; the server only serves static files.
 *
 * Pea's search runs synchronously, so a running search can't read "stop" from
 * stdin. This outer worker handles "stop" itself: it terminates the inner
 * worker that runs the engine, reports the best move found so far and starts a
 * fresh engine instance (replaying any setoption commands).
 */
"use strict";

const version = new URLSearchParams(self.location.search).get("v");
const base = new URL(".", self.location.href);
const wasmUrl = new URL(`pea-${version}.wasm`, base).href;
const innerUrl = new URL("pea-engine.js", base).href;

const modulePromise = (async () => {
  const res = await fetch(wasmUrl);
  if (!res.ok) throw new Error(`failed to load ${wasmUrl}: ${res.status}`);
  if (WebAssembly.compileStreaming && res.headers.get("content-type") === "application/wasm") {
    return WebAssembly.compileStreaming(res);
  }
  return WebAssembly.compile(await res.arrayBuffer());
})();

const options = new Map(); // setoption commands to replay after a restart
let inner = null;
let searching = false;
let bestSoFar = null;

function spawn() {
  inner = new Worker(innerUrl);
  inner.onmessage = (e) => {
    const line = e.data;
    if (typeof line !== "string") return;
    if (line.startsWith("info") && line.includes(" pv ")) {
      const move = line.split(" pv ")[1].trim().split(" ")[0];
      if (move) bestSoFar = move;
    } else if (line.startsWith("bestmove")) {
      searching = false;
    }
    self.postMessage(line);
  };
  inner.onerror = (e) => {
    self.postMessage(`info string pea worker error: ${e.message || e}`);
  };
  modulePromise.then(
    (module) => inner.postMessage({ module }),
    (err) => self.postMessage(`info string ${err.message || err}`)
  );
}

spawn();

self.onmessage = (e) => {
  const cmd = String(e.data).trim();
  if (!cmd) return;

  if (cmd === "stop") {
    if (!searching) return;
    inner.terminate();
    searching = false;
    self.postMessage(`bestmove ${bestSoFar || "(none)"}`);
    spawn();
    for (const opt of options.values()) inner.postMessage(opt);
    return;
  }

  if (cmd === "quit") {
    inner.terminate();
    self.close();
    return;
  }

  if (cmd.startsWith("setoption")) {
    const m = cmd.match(/^setoption\s+name\s+(.+?)(\s+value\s+.*)?$/i);
    if (m) options.set(m[1].toLowerCase(), cmd);
  }

  if (cmd.startsWith("go")) {
    searching = true;
    bestSoFar = null;
  }

  inner.postMessage(cmd);
};
