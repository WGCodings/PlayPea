/*
 * PlayPea — inner engine worker.
 * Runs one Pea wasm32-wasip1 build (asyncified on fd_read) with a tiny WASI
 * shim. UCI commands arrive via postMessage and are fed to the engine's stdin;
 * every stdout line is posted back. The engine itself is unmodified: it just
 * reads stdin in its normal UCI loop, and asyncify lets that read suspend
 * until the next command arrives.
 */
"use strict";

function createPeaRunner(module, onLine) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const ESUCCESS = 0, EBADF = 8, ENOSYS = 52;
  const NORMAL = 0, UNWINDING = 1, REWINDING = 2;

  let instance, memory, exports;
  let state = NORMAL;
  let dataAddr = 0;
  let input = new Uint8Array(0);
  let wake = null;
  let outBuf = "";
  let exited = false;

  class Exit { constructor(code) { this.code = code; } }

  const u8 = () => new Uint8Array(memory.buffer);
  const dv = () => new DataView(memory.buffer);

  function emit(text) {
    outBuf += text;
    let i;
    while ((i = outBuf.indexOf("\n")) >= 0) {
      const line = outBuf.slice(0, i).replace(/\r$/, "");
      outBuf = outBuf.slice(i + 1);
      if (line.length) onLine(line);
    }
  }

  const wasi = {
    fd_write(fd, iovs, iovsLen, nwrittenPtr) {
      const v = dv();
      let written = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        if (fd === 1 || fd === 2) {
          const text = dec.decode(u8().slice(ptr, ptr + len));
          if (fd === 1) emit(text);
          else console.warn("[pea stderr]", text);
        }
        written += len;
      }
      v.setUint32(nwrittenPtr, written, true);
      return ESUCCESS;
    },
    fd_read(fd, iovs, iovsLen, nreadPtr) {
      if (fd !== 0) return EBADF;
      if (state === REWINDING) {
        exports.asyncify_stop_rewind();
        state = NORMAL;
      }
      if (input.length === 0) {
        // Nothing to read yet: suspend the whole wasm stack until a command arrives.
        exports.asyncify_start_unwind(dataAddr);
        state = UNWINDING;
        return ESUCCESS;
      }
      const v = dv();
      let read = 0;
      for (let i = 0; i < iovsLen && input.length; i++) {
        const ptr = v.getUint32(iovs + i * 8, true);
        const len = v.getUint32(iovs + i * 8 + 4, true);
        const n = Math.min(len, input.length);
        u8().set(input.subarray(0, n), ptr);
        input = input.subarray(n);
        read += n;
      }
      dv().setUint32(nreadPtr, read, true);
      return ESUCCESS;
    },
    clock_time_get(id, _precision, timePtr) {
      const ns = id === 0
        ? BigInt(Date.now()) * 1000000n
        : BigInt(Math.round((performance.timeOrigin + performance.now()) * 1e6));
      dv().setBigUint64(timePtr, ns, true);
      return ESUCCESS;
    },
    random_get(ptr, len) {
      const buf = new Uint8Array(len);
      for (let i = 0; i < len; i += 65536) {
        crypto.getRandomValues(buf.subarray(i, Math.min(len, i + 65536)));
      }
      u8().set(buf, ptr);
      return ESUCCESS;
    },
    args_sizes_get(argcPtr, bufSizePtr) {
      dv().setUint32(argcPtr, 1, true);
      dv().setUint32(bufSizePtr, 4, true);
      return ESUCCESS;
    },
    args_get(argvPtr, bufPtr) {
      dv().setUint32(argvPtr, bufPtr, true);
      u8().set(enc.encode("pea\0"), bufPtr);
      return ESUCCESS;
    },
    environ_sizes_get(countPtr, sizePtr) {
      dv().setUint32(countPtr, 0, true);
      dv().setUint32(sizePtr, 0, true);
      return ESUCCESS;
    },
    environ_get() { return ESUCCESS; },
    fd_prestat_get() { return EBADF; },
    fd_prestat_dir_name() { return EBADF; },
    fd_fdstat_get(fd, statPtr) {
      if (fd > 2) return EBADF;
      const v = dv();
      for (let i = 0; i < 24; i++) v.setUint8(statPtr + i, 0);
      v.setUint8(statPtr, 2); // character device
      return ESUCCESS;
    },
    fd_close() { return ESUCCESS; },
    sched_yield() { return ESUCCESS; },
    proc_exit(code) { throw new Exit(code); },
  };

  const importObject = {
    wasi_snapshot_preview1: new Proxy(wasi, {
      get: (target, name) => target[name] || (() => ENOSYS),
    }),
  };

  async function run() {
    instance = await WebAssembly.instantiate(module, importObject);
    exports = instance.exports;
    memory = exports.memory;
    // One private page for asyncify's saved stack.
    const page = memory.grow(1);
    dataAddr = page * 65536;
    dv().setUint32(dataAddr, dataAddr + 8, true);
    dv().setUint32(dataAddr + 4, dataAddr + 65536, true);

    for (;;) {
      try {
        exports._start();
      } catch (e) {
        if (e instanceof Exit) { exited = true; return; }
        throw e;
      }
      if (state !== UNWINDING) { exited = true; return; } // main returned
      exports.asyncify_stop_unwind();
      state = NORMAL;
      if (input.length === 0) await new Promise((r) => (wake = r));
      exports.asyncify_start_rewind(dataAddr);
      state = REWINDING;
    }
  }

  function send(cmd) {
    if (exited) return;
    const bytes = enc.encode(String(cmd).trim() + "\n");
    const merged = new Uint8Array(input.length + bytes.length);
    merged.set(input);
    merged.set(bytes, input.length);
    input = merged;
    if (wake) { const w = wake; wake = null; w(); }
  }

  return { run, send };
}

if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
  let runner = null;
  const early = [];
  self.onmessage = (e) => {
    if (e.data && e.data.module) {
      runner = createPeaRunner(e.data.module, (line) => self.postMessage(line));
      for (const c of early) runner.send(c);
      runner.run().catch((err) => self.postMessage("info string pea error " + err));
      return;
    }
    if (runner) runner.send(e.data);
    else early.push(e.data);
  };
} else if (typeof module !== "undefined") {
  module.exports = { createPeaRunner };
}
