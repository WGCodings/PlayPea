import { EngineName, MoveClassification } from "./types/enums";
import { PEA_VERSIONS } from "./data/peaVersions";

export const MAIN_THEME_COLOR = "#6DA544";
export const LINEAR_PROGRESS_BAR_COLOR = "#6DA544";

export const CLASSIFICATION_COLORS: Record<MoveClassification, string> = {
  [MoveClassification.Opening]: "#dbac86",
  [MoveClassification.Forced]: "#dbac86",
  [MoveClassification.Splendid]: "#19d4af",
  [MoveClassification.Perfect]: "#3894eb",
  [MoveClassification.Best]: "#22ac38",
  [MoveClassification.Excellent]: "#22ac38",
  [MoveClassification.Okay]: "#74b038",
  [MoveClassification.Inaccuracy]: "#f2be1f",
  [MoveClassification.Mistake]: "#e69f00",
  [MoveClassification.Blunder]: "#df5353",
};

export const DEFAULT_ENGINE: EngineName = "v9.1";
export const STRONGEST_ENGINE: EngineName = "v9.1";

export const ENGINE_LABELS: Record<
  EngineName,
  { small: string; full: string; sizeMb: number; elo?: number }
> = Object.fromEntries(
  PEA_VERSIONS.map((v) => [
    v.id,
    {
      small: `Pea ${v.id}`,
      full: `Pea ${v.id} (${v.eloLabel} Elo)`,
      sizeMb: v.sizeMb,
      elo: v.elo,
    },
  ])
) as Record<
  EngineName,
  { small: string; full: string; sizeMb: number; elo?: number }
>;

// Default thinking time per move when playing against Pea (ms).
export const DEFAULT_MOVE_TIME_MS = 1000;

// The game database (browser IndexedDB) is hidden for now. Flip this to bring
// back the Database page and the save button.
export const DATABASE_ENABLED = false;

export const PIECE_SETS = [
  "alpha",
  "anarcandy",
  "caliente",
  "california",
  "cardinal",
  "cburnett",
  "celtic",
  "chess7",
  "chessnut",
  "chicago",
  "companion",
  "cooke",
  "dubrovny",
  "fantasy",
  "firi",
  "fresca",
  "gioco",
  "governor",
  "horsey",
  "icpieces",
  "iowa",
  "kiwen-suwi",
  "kosal",
  "leipzig",
  "letter",
  "maestro",
  "merida",
  "monarchy",
  "mpchess",
  "oslo",
  "pirouetti",
  "pixel",
  "reillycraig",
  "rhosgfx",
  "riohacha",
  "shapes",
  "spatial",
  "staunty",
  "symmetric",
  "tatiana",
  "xkcd",
] as const satisfies string[];
