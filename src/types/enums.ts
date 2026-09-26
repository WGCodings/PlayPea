export enum GameOrigin {
  Pgn = "pgn",
  ChessCom = "chesscom",
  Lichess = "lichess",
}

export type { PeaVersionId as EngineName } from "@/data/peaVersions";

export enum MoveClassification {
  Blunder = "blunder",
  Mistake = "mistake",
  Inaccuracy = "inaccuracy",
  Okay = "okay",
  Excellent = "excellent",
  Best = "best",
  Forced = "forced",
  Opening = "opening",
  Perfect = "perfect",
  Splendid = "splendid",
}

export enum Color {
  White = "w",
  Black = "b",
}
