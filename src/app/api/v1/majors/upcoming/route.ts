// Majors that are on now or coming up (round 708), soonest first.
import { connection } from "next/server";
import { getMajors } from "@/lib/majors";
import { apiFailed, apiJson, apiMajor } from "@/lib/publicApi";

export async function GET() {
  await connection(); // worked out at each visit (now vs coming up), never once at build time
  try {
    const { live, upcoming } = await getMajors();
    return apiJson({ live: live.map(apiMajor), upcoming: upcoming.map(apiMajor) });
  } catch (e) {
    return apiFailed("upcoming majors", e);
  }
}
