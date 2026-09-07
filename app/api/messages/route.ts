import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, participants } from "@/db/schema";
import { verifyPin } from "@/lib/auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

async function authenticate(db: ReturnType<typeof getDb>, participantId: number, pin: string) {
  const [person] = await db.select().from(participants).where(eq(participants.id, participantId));
  if (!person || !person.claimed || !verifyPin(pin, person.pinHash)) return null;
  return person;
}

export async function GET() {
  const db = getDb();
  const rows = await db
    .select({ id: messages.id, body: messages.body, createdAt: messages.createdAt, editedAt: messages.editedAt, name: participants.name, participantId: messages.participantId })
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

  const person = await authenticate(db, participantId, pin);
  if (!person) return json({ error: "Wrong name or PIN." }, 401);

  const [row] = await db.insert(messages).values({ participantId, body: text }).returning({ id: messages.id, createdAt: messages.createdAt });
  return json({ message: { id: row.id, body: text, createdAt: row.createdAt, editedAt: null, name: person.name, participantId } });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const body = await request.json();
  const messageId = Number(body.id);
  const participantId = Number(body.participantId);
  const pin = String(body.pin ?? "");
  const text = String(body.body ?? "").trim().slice(0, 500);
  if (!messageId || !participantId || !text) return json({ error: "Message can't be empty." }, 400);

  const person = await authenticate(db, participantId, pin);
  if (!person) return json({ error: "Wrong name or PIN." }, 401);

  const [row] = await db
    .update(messages)
    .set({ body: text, editedAt: new Date() })
    .where(and(eq(messages.id, messageId), eq(messages.participantId, participantId)))
    .returning({ id: messages.id, createdAt: messages.createdAt, editedAt: messages.editedAt });
  if (!row) return json({ error: "Message not found." }, 404);

  return json({ message: { id: row.id, body: text, createdAt: row.createdAt, editedAt: row.editedAt, name: person.name, participantId } });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const body = await request.json();
  const messageId = Number(body.id);
  const participantId = Number(body.participantId);
  const pin = String(body.pin ?? "");
  if (!messageId || !participantId) return json({ error: "Missing message." }, 400);

  const person = await authenticate(db, participantId, pin);
  if (!person) return json({ error: "Wrong name or PIN." }, 401);

  const [row] = await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.participantId, participantId)))
    .returning({ id: messages.id });
  if (!row) return json({ error: "Message not found." }, 404);

  return json({ ok: true });
}
