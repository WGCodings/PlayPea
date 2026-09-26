// Pea releases available on the site. Each one needs a matching
// public/engines/pea/pea-<id>.wasm (build it with tools/build-engines.sh).
//
// elo: rough strength estimate from the release notes / CHANGELOG
// (matches vs Stash at 8s+0.08). Shown in the UI and used as the bot's rating.
export interface PeaVersion {
  id: string;
  elo?: number;
  eloLabel: string;
  net: string;
  sizeMb: number;
}

export const PEA_VERSIONS = [
  {
    id: "v9.1",
    elo: 3390,
    eloLabel: "~3390", // v9.0 estimate + 195 Elo (STC) from the v9.1 release notes
    net: "Gen 9, Net 0",
    sizeMb: 3.6,
  },
  {
    id: "v9.0",
    elo: 3193,
    eloLabel: "~3193",
    net: "Gen 9, Net 0",
    sizeMb: 3.6,
  },
  {
    id: "v8.0",
    elo: 2993,
    eloLabel: "~2993",
    net: "Gen 8, Net 0",
    sizeMb: 3.6,
  },
  {
    id: "v7.0",
    elo: 2850,
    eloLabel: "~2850",
    net: "Gen 7, Net 1",
    sizeMb: 1.3,
  },
  {
    id: "v6.0",
    elo: 2811,
    eloLabel: "~2811",
    net: "Gen 6, Net 1",
    sizeMb: 1.3,
  },
  {
    id: "v5.0",
    elo: 2501,
    eloLabel: "~2501",
    net: "Gen 5, Net 0",
    sizeMb: 3.6,
  },
  {
    id: "v4.0",
    elo: 2271,
    eloLabel: "~2271",
    net: "Gen 4, Net 1",
    sizeMb: 1.3,
  },
  {
    id: "v3.0",
    elo: 1981,
    eloLabel: "~1981",
    net: "Gen 3, Net 1",
    sizeMb: 1.3,
  },
  {
    id: "v2.0",
    elo: 1257,
    eloLabel: "~1257",
    net: "Gen 2, Net 1",
    sizeMb: 1.3,
  },
  {
    id: "v1.0",
    elo: 650,
    eloLabel: "~500-800",
    net: "Gen 1, Net 1",
    sizeMb: 1.3,
  },
] as const satisfies readonly PeaVersion[];

export type PeaVersionId = (typeof PEA_VERSIONS)[number]["id"];

export const PEA_VERSION_IDS: PeaVersionId[] = PEA_VERSIONS.map((v) => v.id);

export const getPeaVersion = (id: string): PeaVersion | undefined =>
  PEA_VERSIONS.find((v) => v.id === id);

export const isPeaVersionId = (id: unknown): id is PeaVersionId =>
  typeof id === "string" && PEA_VERSIONS.some((v) => v.id === id);
