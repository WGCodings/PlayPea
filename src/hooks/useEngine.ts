import { Pea } from "@/lib/engine/pea";
import { UciEngine } from "@/lib/engine/uciEngine";
import { isPeaVersionId } from "@/data/peaVersions";
import { DEFAULT_ENGINE } from "@/constants";
import { EngineName } from "@/types/enums";
import { useEffect, useState } from "react";

export const useEngine = (engineName: EngineName | undefined) => {
  const [engine, setEngine] = useState<UciEngine | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!engineName || !Pea.isSupported()) return;

    // Versions saved in localStorage may no longer exist.
    const version = isPeaVersionId(engineName) ? engineName : DEFAULT_ENGINE;

    Pea.create(version).then((newEngine) => {
      if (!isMounted) {
        newEngine.shutdown();
        return;
      }

      setEngine((prev) => {
        prev?.shutdown();
        return newEngine;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [engineName]);

  return engine;
};
