"use server";

// The online ladder: finding a match, reporting and answering a score, calling a match off. Each one
// goes through a database function that checks it against the member's own sign-in.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { actionError, GENERIC_ACTION_ERROR, GONE_ERROR, type ActionResult } from "@/lib/actionErrors";
import { getT } from "@/lib/i18n/server";
import { isBirthdayNeeded } from "@/lib/birthdayNeeded";
import { isLadderGame, readScore } from "@/lib/ladder";
import { createClient, getVerifiedUserId } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONNECT = /^[A-Za-z0-9#: /-]{2,40}$/;

async function requireUser() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/signin?next=/ladder");
  return userId;
}

/** actionError's own two messages in the visitor's language (the database's rule messages pass as they are). */
async function translated(res: ActionResult): Promise<ActionResult> {
  if (res.error !== GENERIC_ACTION_ERROR && res.error !== GONE_ERROR) return res;
  const t = await getT();
  return { error: res.error === GONE_ERROR ? t("play.err.goneDeleted") : t("common.tryAgain") };
}

/** Find a match for a game, or keep waiting: the match id when paired, otherwise waiting. */
export async function findMatch(game: string, connect: string): Promise<ActionResult & { matchId?: string; waiting?: boolean }> {
  await requireUser();
  const t = await getT();
  if (!isLadderGame(game)) return { error: t("play.ladder.err.pickGame") };
  const code = typeof connect === "string" ? connect.trim() : "";
  if (!CONNECT.test(code)) return { error: t("play.ladder.err.addCode") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ladder_find_match", { p_game: game, p_connect: code });
  if (isBirthdayNeeded(error)) return { error: t("people.err.needBirthday") };
  if (error) return error.code === "23514" ? { error: t("play.ladder.err.badCode") } : translated(actionError(error));
  return data ? { matchId: data as string } : { waiting: true };
}

export async function leaveQueue(): Promise<ActionResult> {
  await requireUser();
  const { error } = await (await createClient()).rpc("ladder_leave_queue");
  if (!error) refresh();
  return translated(actionError(error));
}

export async function reportScore(matchId: string, mine: number, theirs: number): Promise<ActionResult> {
  await requireUser();
  if (!UUID.test(matchId)) return { error: (await getT())("play.ladder.err.notYours") };
  const score = readScore(mine, theirs);
  if ("error" in score) return { error: (await getT())("play.ladder.err.bestOf3") };
  const { error } = await (await createClient()).rpc("ladder_report", { p_match: matchId, p_mine: score.mine, p_theirs: score.theirs });
  if (!error) refresh();
  return translated(actionError(error));
}

export async function answerScore(matchId: string, agree: boolean): Promise<ActionResult> {
  await requireUser();
  if (!UUID.test(matchId)) return { error: (await getT())("play.ladder.err.notYours") };
  const { error } = await (await createClient()).rpc("ladder_answer", { p_match: matchId, p_agree: agree === true });
  if (!error) refresh();
  return translated(actionError(error));
}

export async function cancelMatch(matchId: string): Promise<ActionResult> {
  await requireUser();
  if (!UUID.test(matchId)) return { error: (await getT())("play.ladder.err.notYours") };
  const { error } = await (await createClient()).rpc("ladder_cancel", { p_match: matchId });
  if (!error) refresh();
  return translated(actionError(error));
}
