import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { participants, pushupLogs } from "@/db/schema";

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return new Response(JSON.stringify({ error: "Missing id." }), { status: 400, headers: { "content-type": "application/json" } });

  const [person] = await db.select().from(participants).where(eq(participants.id, id));
  if (!person) return new Response(JSON.stringify({ error: "Not found." }), { status: 404, headers: { "content-type": "application/json" } });

  const logs = await db.select({ day: pushupLogs.day, count: pushupLogs.count }).from(pushupLogs).where(eq(pushupLogs.participantId, id));

  return new Response(
    JSON.stringify({ person: { id: person.id, name: person.name, startedAt: person.startedAt }, logs }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
