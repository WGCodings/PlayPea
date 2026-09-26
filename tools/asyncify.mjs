#!/usr/bin/env node
// Make a Pea wasm32-wasip1 build suspendable on stdin reads (fd_read) so it can
// run its normal UCI loop inside a browser Web Worker.
//
// Instead of instrumenting the whole engine (which costs ~20% nps), we run the
// module once in Node with stub imports, capture the wasm call stack at the
// first fd_read, and tell Binaryen's asyncify pass to instrument only those
// functions. The search code is left untouched.
//
// usage: node asyncify.mjs <in.wasm> <out.wasm> [path/to/wasm-opt]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [input, output, wasmOpt = "wasm-opt"] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node asyncify.mjs <in.wasm> <out.wasm> [wasm-opt]");
  process.exit(2);
}

const module = await WebAssembly.compile(readFileSync(input));
let instance;
let stack = null;
const SENTINEL = Symbol("fd_read reached");
const view = () => new DataView(instance.exports.memory.buffer);

const imports = {
  wasi_snapshot_preview1: new Proxy({}, {
    get: (_t, name) => (...args) => {
      switch (name) {
        case "fd_read":
          Error.stackTraceLimit = Infinity;
          stack = new Error().stack;
          throw SENTINEL;
        case "fd_prestat_get":
          return 8; // EBADF: no preopened dirs
        case "args_sizes_get":
        case "environ_sizes_get":
          view().setUint32(args[0], 0, true);
          view().setUint32(args[1], 0, true);
          return 0;
        case "proc_exit":
          throw new Error("engine exited before reading stdin");
        default:
          return 0;
      }
    },
  }),
};

instance = await WebAssembly.instantiate(module, imports);
try {
  instance.exports._start();
} catch (e) {
  if (e !== SENTINEL) throw e;
}
if (!stack) throw new Error("fd_read was never called");

const names = [];
for (const line of stack.split("\n")) {
  const m = line.match(/^\s*at (.+?) \(wasm:\/\//);
  if (!m) continue;
  let name = m[1];
  const i = name.indexOf(".wasm.");
  if (i >= 0) name = name.slice(i + ".wasm.".length);
  if (!names.includes(name)) names.push(name);
}
if (names.length === 0) throw new Error("could not parse wasm frames:\n" + stack);
console.log(`asyncify: instrumenting ${names.length} functions on the stdin path`);

execFileSync(wasmOpt, [
  input,
  "--asyncify",
  "--pass-arg=asyncify-imports@wasi_snapshot_preview1.fd_read",
  `--pass-arg=asyncify-onlylist@${names.join(",")}`,
  "-O3",
  "--strip-debug",
  "-o", output,
], { stdio: "inherit" });
