import { useAtomValue, useSetAtom } from "jotai";
import {
  enginePlayNameAtom,
  gameAtom,
  isGameInProgressAtom,
  playerColorAtom,
} from "./states";
import { Button, Grid2 as Grid, Typography } from "@mui/material";
import { Color } from "@/types/enums";
import { setGameHeaders } from "@/lib/chess";
import { useGameDatabase } from "@/hooks/useGameDatabase";
import { useRouter } from "next/router";
import { DATABASE_ENABLED, ENGINE_LABELS } from "@/constants";
import { pendingAnalysisGameAtom } from "../analysis/states";

export default function GameRecap() {
  const game = useAtomValue(gameAtom);
  const playerColor = useAtomValue(playerColorAtom);
  const isGameInProgress = useAtomValue(isGameInProgressAtom);
  const engineName = useAtomValue(enginePlayNameAtom);
  const setPendingAnalysisGame = useSetAtom(pendingAnalysisGameAtom);
  const { addGame } = useGameDatabase();
  const router = useRouter();

  if (isGameInProgress || !game.history().length) return null;

  const getResultLabel = () => {
    if (game.isCheckmate()) {
      const winnerColor = game.turn() === "w" ? Color.Black : Color.White;
      const winnerLabel =
        winnerColor === playerColor
          ? "You"
          : (ENGINE_LABELS[engineName]?.small ?? "Pea");
      return `${winnerLabel} won by checkmate !`;
    }
    if (game.isInsufficientMaterial()) return "Draw by insufficient material";
    if (game.isStalemate()) return "Draw by stalemate";
    if (game.isThreefoldRepetition()) return "Draw by threefold repetition";
    if (game.isDraw()) return "Draw by fifty-move rule";

    return "You resigned";
  };

  const handleOpenGameAnalysis = async () => {
    const gameToAnalysis = setGameHeaders(game, {
      resigned: !game.isGameOver() ? playerColor : undefined,
    });

    if (DATABASE_ENABLED) {
      const gameId = await addGame(gameToAnalysis);
      router.push({ pathname: "/", query: { gameId } });
      return;
    }

    // Without the database, hand the game over in memory.
    setPendingAnalysisGame({
      pgn: gameToAnalysis.pgn(),
      orientation: playerColor === Color.White,
    });
    router.push({ pathname: "/" });
  };

  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      gap={2}
      size={12}
    >
      <Grid container justifyContent="center" size={12}>
        <Typography>{getResultLabel()}</Typography>
      </Grid>

      <Button variant="outlined" onClick={handleOpenGameAnalysis}>
        Open game analysis
      </Button>
    </Grid>
  );
}
