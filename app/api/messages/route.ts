import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, participants } from "@/db/schema";
import { verifyPin } from "@/lib/auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function GET() {
  const db = getDb();
  const rows = await db
    .select({ id: messages.id, body: messages.body, createdAt: messages.createdAt, name: participants.name, participantId: messages.participantId })
    .from(messages)
    .innerJoin(participants, eq(messages.participantId, participants.id))
    .orderBy(desc(messages.createdAt))
    .limit(200);
  return json({ messages: rows.reverse() });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();
  const participantId = Number(body.participantId);
  const pin = String(body.pin ?? "");
  const text = String(body.body ?? "").trim().slice(0, 500);
  if (!participantId || !text) return json({ error: "Message can't be empty." }, 400);

  const [person] = await db.select().from(participants).where(eq(participants.id, participantId));
  if (!person || !person.claimed || !verifyPin(pin, person.pinHash)) return json({ error: "Wrong name or PIN." }, 401);

  const [row] = await db.insert(messages).values({ participantId, body: text }).returning({ id: messages.id, createdAt: messages.createdAt });
  return json({ message: { id: row.id, body: text, createdAt: row.createdAt, name: person.name, participantId } });
}
