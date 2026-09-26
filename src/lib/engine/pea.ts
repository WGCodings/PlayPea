import { EngineName } from "@/types/enums";
import { UciEngine } from "./uciEngine";
import { isEngineSupported } from "./shared";

export class Pea {
  public static async create(version: EngineName): Promise<UciEngine> {
    if (!Pea.isSupported()) {
      throw new Error("Your browser does not support WebAssembly SIMD");
    }

    return UciEngine.create(
      version,
      `/engines/pea/pea-worker.js?v=${encodeURIComponent(version)}`
    );
  }

  public static isSupported() {
    return isEngineSupported();
  }
}
