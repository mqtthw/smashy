// The games Smashy follows, with the keys the other endpoints use (round 708).
import { GAMES, GAME_KEYS } from "@/lib/games";
import { apiJson } from "@/lib/publicApi";

export function GET() {
  return apiJson({ games: GAME_KEYS.map((key) => ({ key, name: GAMES[key].name, short: GAMES[key].short })) }, "long");
}
