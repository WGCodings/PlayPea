import Slider from "@/components/slider";
import { Color, EngineName } from "@/types/enums";
import {
  MenuItem,
  Select,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  OutlinedInput,
  DialogActions,
  Typography,
  Grid2 as Grid,
  FormGroup,
  FormControlLabel,
  Switch,
  TextField,
} from "@mui/material";
import { useAtomLocalStorage } from "@/hooks/useAtomLocalStorage";
import { useAtom, useSetAtom } from "jotai";
import {
  engineMoveTimeAtom,
  playerColorAtom,
  isGameInProgressAtom,
  gameAtom,
  enginePlayNameAtom,
} from "../states";
import { useChessActions } from "@/hooks/useChessActions";
import { useEffect, useState } from "react";
import { isEngineSupported } from "@/lib/engine/shared";
import { DEFAULT_ENGINE, ENGINE_LABELS } from "@/constants";
import { getGameFromPgn } from "@/lib/chess";
import { PEA_VERSIONS, isPeaVersionId } from "@/data/peaVersions";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Thinking time options in ms, indexed by the slider value.
const MOVE_TIMES = [100, 250, 500, 1000, 2000, 3000, 5000, 10000];

const formatMoveTime = (ms: number) =>
  ms < 1000 ? `${ms} ms` : `${ms / 1000} s`;

export default function GameSettingsDialog({ open, onClose }: Props) {
  const [moveTime, setMoveTime] = useAtomLocalStorage(
    "engine-move-time",
    engineMoveTimeAtom
  );
  const [engineName, setEngineName] = useAtomLocalStorage(
    "engine-play-name",
    enginePlayNameAtom
  );
  const [playerColor, setPlayerColor] = useAtom(playerColorAtom);
  const setIsGameInProgress = useSetAtom(isGameInProgressAtom);
  const { reset: resetGame } = useChessActions(gameAtom);
  const [startingPositionInput, setStartingPositionInput] = useState("");
  const [parsingError, setParsingError] = useState("");

  const moveTimeIndex = Math.max(
    0,
    MOVE_TIMES.findIndex((t) => t >= moveTime)
  );

  const handleGameStart = () => {
    setParsingError("");

    try {
      const input = startingPositionInput.trim();
      const startingFen = input.startsWith("[")
        ? getGameFromPgn(input).fen()
        : input || undefined;

      const engineLabel = ENGINE_LABELS[engineName];

      resetGame({
        white: {
          name: playerColor === Color.White ? "You" : engineLabel.small,
          rating: playerColor === Color.White ? undefined : engineLabel.elo,
        },
        black: {
          name: playerColor === Color.Black ? "You" : engineLabel.small,
          rating: playerColor === Color.Black ? undefined : engineLabel.elo,
        },
        fen: startingFen,
      });
    } catch (error) {
      console.error(error);
      setParsingError(
        error instanceof Error
          ? `${error.message} !`
          : "Unknown error while parsing input !"
      );
      return;
    }

    setIsGameInProgress(true);
    handleClose();
  };

  useEffect(() => {
    if (!isPeaVersionId(engineName)) setEngineName(DEFAULT_ENGINE);
  }, [setEngineName, engineName]);

  const handleClose = () => {
    onClose();
    setStartingPositionInput("");
    setParsingError("");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle marginY={1} variant="h5">
        Set game parameters
      </DialogTitle>
      <DialogContent sx={{ paddingBottom: 0 }}>
        <Typography>
          Pick a version of Pea to play against. Early versions are much weaker,
          so they make good sparring partners. The engine runs entirely in your
          browser, on your own device.
        </Typography>
        {!isEngineSupported() && (
          <Typography color="salmon" marginTop={2}>
            Your browser doesn&apos;t support WebAssembly SIMD, which Pea needs.
            Please use a recent version of Chrome, Firefox, Edge or Safari.
          </Typography>
        )}
        <Grid
          marginTop={4}
          container
          justifyContent="center"
          alignItems="center"
          rowGap={3}
          size={12}
        >
          <Grid container justifyContent="center" size={12}>
            <FormControl variant="outlined">
              <InputLabel id="dialog-select-label">Pea version</InputLabel>
              <Select
                labelId="dialog-select-label"
                id="dialog-select"
                displayEmpty
                input={<OutlinedInput label="Pea version" />}
                value={isPeaVersionId(engineName) ? engineName : DEFAULT_ENGINE}
                onChange={(e) => setEngineName(e.target.value as EngineName)}
                sx={{ width: 280, maxWidth: "100%" }}
              >
                {PEA_VERSIONS.map(({ id }) => (
                  <MenuItem key={id} value={id}>
                    {ENGINE_LABELS[id].full}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Slider
            label={`Thinking time per move: ${formatMoveTime(
              MOVE_TIMES[moveTimeIndex]
            )}`}
            value={moveTimeIndex}
            setValue={(index: number) => setMoveTime(MOVE_TIMES[index])}
            min={0}
            max={MOVE_TIMES.length - 1}
            step={1}
            marksFilter={1}
            marksLabel={(index: number) => formatMoveTime(MOVE_TIMES[index])}
          />

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  color="default"
                  checked={playerColor === Color.White}
                  onChange={(e) => {
                    setPlayerColor(
                      e.target.checked ? Color.White : Color.Black
                    );
                  }}
                />
              }
              label={
                playerColor === Color.White
                  ? "You play as White"
                  : "You play as Black"
              }
            />
          </FormGroup>

          <FormControl fullWidth>
            <TextField
              label="Optional starting position (FEN or PGN)"
              variant="outlined"
              multiline
              value={startingPositionInput}
              onChange={(e) => setStartingPositionInput(e.target.value)}
            />
          </FormControl>

          {parsingError && (
            <FormControl fullWidth>
              <Typography color="salmon" textAlign="center" marginTop={1}>
                {parsingError}
              </Typography>
            </FormControl>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ m: 2 }}>
        <Button
          variant="outlined"
          sx={{ marginRight: 2 }}
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGameStart}
          disabled={!isEngineSupported()}
        >
          Start game
        </Button>
      </DialogActions>
    </Dialog>
  );
}
