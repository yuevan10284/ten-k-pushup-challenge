import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { participants, pushupLogs } from "@/db/schema";
import { hashPin, verifyPin } from "@/lib/auth";
import { currentStreak, missedDays } from "@/lib/schedule";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const db = getDb();
  const url = new URL(request.url);
  const participantId = url.searchParams.get("participant");
  const pin = url.searchParams.get("pin");

  if (participantId) {
    if (!pin) return json({ error: "PIN required." }, 400);
    const [person] = await db.select().from(participants).where(eq(participants.id, Number(participantId)));
    if (!person || !person.claimed || !verifyPin(pin, person.pinHash)) return json({ error: "Wrong name or PIN." }, 401);
    const logs = await db
      .select({ day: pushupLogs.day, count: pushupLogs.count })
      .from(pushupLogs)
      .where(eq(pushupLogs.participantId, person.id));
    return json({ logs, startedAt: person.startedAt });
  }

  const all = await db.select().from(participants);
  const logs = await db.select().from(pushupLogs);
  const leaderboard = all
    .map((p) => {
      const mine = logs.filter((l) => l.participantId === p.id);
      const total = mine.reduce((sum, l) => sum + l.count, 0);
      const loggedSet = new Set(mine.map((l) => l.day));
      return {
        id: p.id,
        name: p.name,
        total,
        daysLogged: mine.length,
        streak: currentStreak(p.startedAt, loggedSet),
        missedDays: missedDays(p.startedAt, loggedSet).length,
      };
    })
    .sort((a, b) => b.total - a.total);
  return json({ leaderboard });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json();

  if (body.action === "join") {
    const name = String(body.name ?? "").trim();
    const pin = String(body.pin ?? "");
    if (!name || !/^\d{4}$/.test(pin)) return json({ error: "Name and a 4-digit PIN are required." }, 400);
    const nameKey = name.toLowerCase();
    if (/kell[iy]/i.test(nameKey)) return json({ error: "Invalid name." }, 400);

    const [existing] = await db.select().from(participants).where(eq(participants.nameKey, nameKey));

    if (existing && existing.claimed) {
      if (!verifyPin(pin, existing.pinHash)) return json({ error: "Wrong PIN for that name." }, 401);
      const logs = await db
        .select({ day: pushupLogs.day, count: pushupLogs.count })
        .from(pushupLogs)
        .where(eq(pushupLogs.participantId, existing.id));
      return json({ participant: { id: existing.id, name: existing.name, startedAt: existing.startedAt }, logs });
    }

    if (existing && !existing.claimed) {
      // Migrated placeholder — first PIN submitted for this name claims it.
      await db.update(participants).set({ pinHash: hashPin(pin), claimed: true }).where(eq(participants.id, existing.id));
      const logs = await db
        .select({ day: pushupLogs.day, count: pushupLogs.count })
        .from(pushupLogs)
        .where(eq(pushupLogs.participantId, existing.id));
      return json({ participant: { id: existing.id, name: existing.name, startedAt: existing.startedAt }, logs });
    }

    const [created] = await db
      .insert(participants)
      .values({ name, nameKey, pinHash: hashPin(pin), claimed: true })
      .returning({ id: participants.id, name: participants.name, startedAt: participants.startedAt });
    return json({ participant: created, logs: [] });
  }

  if (body.action === "log") {
    const participantId = Number(body.participantId);
    const pin = String(body.pin ?? "");
    const day = Number(body.day);
    const count = Math.max(0, Math.round(Number(body.count)));
    if (!participantId || !day || day < 1 || day > 30 || !Number.isFinite(count)) return json({ error: "Invalid log." }, 400);

    const [person] = await db.select().from(participants).where(eq(participants.id, participantId));
    if (!person || !person.claimed || !verifyPin(pin, person.pinHash)) return json({ error: "Wrong name or PIN." }, 401);

    await db
      .insert(pushupLogs)
      .values({ participantId, day, count })
      .onConflictDoUpdate({ target: [pushupLogs.participantId, pushupLogs.day], set: { count, updatedAt: new Date() } });

    const logs = await db
      .select({ day: pushupLogs.day, count: pushupLogs.count })
      .from(pushupLogs)
      .where(eq(pushupLogs.participantId, participantId));
    return json({ logs });
  }

  return json({ error: "Unknown action." }, 400);
}
