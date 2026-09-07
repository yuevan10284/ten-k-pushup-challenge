/**
 * One-time migration: pulls real participants + logs from the old
 * chatgpt.site-hosted backend and inserts them into the new Postgres DB.
 * PINs can't be migrated (one-way hash on the old side) — accounts land
 * as unclaimed; the first successful join with that name sets a real PIN.
 */
import { getDb } from "../db";
import { participants, pushupLogs } from "../db/schema";

const LEGACY_BASE = "https://ten-k-pushup-challenge.yuevan10284.chatgpt.site";

async function main() {
  const db = getDb();
  const board = await fetch(`${LEGACY_BASE}/api/challenge`).then((r) => r.json());
  const leaders: { id: number; name: string }[] = board.leaderboard;

  for (const leader of leaders) {
    const data = await fetch(`${LEGACY_BASE}/api/athletes?id=${leader.id}`).then((r) => r.json());
    const name: string = data.person.name;
    const nameKey = name.trim().toLowerCase();
    const logs: { day: number; count: number }[] = data.logs;

    const [row] = await db
      .insert(participants)
      .values({ name, nameKey, pinHash: "unclaimed", claimed: false })
      .returning({ id: participants.id });

    if (logs.length) {
      await db.insert(pushupLogs).values(logs.map((l) => ({ participantId: row.id, day: l.day, count: l.count })));
    }
    console.log(`migrated ${name} (legacy id ${leader.id} -> new id ${row.id}), ${logs.length} log(s)`);
  }
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
