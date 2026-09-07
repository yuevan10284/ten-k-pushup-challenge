"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Pencil, Send, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { id: number; body: string; createdAt: string; editedAt: string | null; name: string; participantId: number };
type Profile = { id: number; name: string; pin: string };

function timeLabel(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function Chat({ profile, onNeedJoin }: { profile: Profile | null; onNeedJoin: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/messages", { cache: "no-store" });
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {}
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) { onNeedJoin(); return; }
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: profile.id, pin: profile.pin, body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not send.");
      setMessages((m) => [...m, d.message]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(m: Msg) {
    setConfirmDeleteId(null);
    setEditingId(m.id);
    setEditText(m.body);
  }

  async function saveEdit(id: number) {
    if (!profile) return;
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, participantId: profile.id, pin: profile.pin, body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save edit.");
      setMessages((ms) => ms.map((m) => (m.id === id ? d.message : m)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save edit.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(id: number) {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, participantId: profile.id, pin: profile.pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not delete.");
      setMessages((ms) => ms.filter((m) => m.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card rounded-[2rem] p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div><p className="text-sm text-white/45">Talk it out</p><h2 className="font-display text-2xl font-bold">Crew chat</h2></div>
        <MessageCircle className="text-[#bdff43]" />
      </div>
      <div ref={listRef} className="chat-list mb-4 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {messages.length ? (
          messages.map((m) => {
            const mine = profile?.id === m.participantId;
            const editing = editingId === m.id;
            return (
              <div key={m.id} className="chat-bubble group rounded-2xl p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-sm">{m.name}</b>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/35">{timeLabel(m.createdAt)}{m.editedAt ? " · edited" : ""}</span>
                    {mine && !editing && (
                      <span className="hidden items-center gap-1 group-hover:flex">
                        <button aria-label="Edit message" onClick={() => startEdit(m)} className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"><Pencil size={12} /></button>
                        <button aria-label="Delete message" onClick={() => setConfirmDeleteId(m.id)} className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-[#ff886f]"><Trash2 size={12} /></button>
                      </span>
                    )}
                  </div>
                </div>
                {editing ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(m.id); if (e.key === "Escape") setEditingId(null); }}
                      maxLength={500}
                      className="glass-input h-9 rounded-lg text-sm text-white"
                    />
                    <button aria-label="Save edit" disabled={busy} onClick={() => saveEdit(m.id)} className="rounded-full p-1.5 text-[#bdff43] hover:bg-white/10"><Check size={15} /></button>
                    <button aria-label="Cancel edit" onClick={() => setEditingId(null)} className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"><X size={15} /></button>
                  </div>
                ) : confirmDeleteId === m.id ? (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <span className="text-[#ff886f]">Delete this message?</span>
                    <button disabled={busy} onClick={() => confirmDelete(m.id)} className="font-semibold text-[#ff886f] hover:underline">Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-white/45 hover:underline">Cancel</button>
                  </div>
                ) : (
                  <p className="mt-1 break-words text-sm text-white/80">{m.body}</p>
                )}
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-white/35">No messages yet — say something.</p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={profile ? "Say something to the crew…" : "Join to chat"}
          maxLength={500}
          className="glass-input h-12 rounded-xl text-white"
        />
        <Button disabled={busy} className="glass-button h-12 rounded-xl px-4"><Send size={16} /></Button>
      </form>
      {error && <p className="mt-2 text-sm text-[#ff886f]">{error}</p>}
    </div>
  );
}
