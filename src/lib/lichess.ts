import { LichessGame, LichessResponse } from "@/types/lichess";
import { LoadedGame } from "@/types/game";

export const getLichessUserRecentGames = async (
  username: string,
  signal?: AbortSignal
): Promise<LoadedGame[]> => {
  const res = await fetch(
    `https://lichess.org/api/games/user/${username}?until=${Date.now()}&max=50&pgnInJson=true&sort=dateDesc&clocks=true`,
    { method: "GET", headers: { accept: "application/x-ndjson" }, signal }
  );

  if (res.status >= 400) {
    throw new Error("Error fetching games from Lichess");
  }

  const rawData = await res.text();
  const games: LichessGame[] = rawData
    .split("\n")
    .filter((game) => game.length > 0)
    .map((game) => JSON.parse(game));

  return games.map(formatLichessGame);
};

export const fetchLichessGame = async (
  gameId: string,
  signal?: AbortSignal
): Promise<LichessResponse<string>> => {
  try {
    const res = await fetch(
      `https://lichess.org/game/export/${gameId}?pgnInJson=true&clocks=true`,
      { method: "GET", headers: { accept: "application/x-ndjson" }, signal }
    );

    if (res.status >= 400) {
      throw new Error(`Error fetching game ${gameId} from Lichess`);
    }

    const gameData: LichessGame = await res.json();
    return gameData.pgn;
  } catch (error) {
    console.error(error);

    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const formatLichessGame = (data: LichessGame): LoadedGame => {
  return {
    id: data.id,
    pgn: data.pgn || "",
    white: {
      name: data.players.white.user?.name || "White",
      rating: data.players.white.rating,
      title: data.players.white.user?.title,
    },
    black: {
      name: data.players.black.user?.name || "Black",
      rating: data.players.black.rating,
      title: data.players.black.user?.title,
    },
    result: getGameResult(data),
    timeControl: `${Math.floor(data.clock?.initial / 60 || 0)}+${data.clock?.increment || 0}`,
    date: new Date(data.createdAt || data.lastMoveAt).toLocaleDateString(),
    movesNb: data.moves?.split(" ").length || 0,
    url: `https://lichess.org/${data.id}`,
  };
};

const getGameResult = (data: LichessGame): string => {
  if (data.status === "draw") return "1/2-1/2";

  if (data.winner) return data.winner === "white" ? "1-0" : "0-1";

  return "*";
};
