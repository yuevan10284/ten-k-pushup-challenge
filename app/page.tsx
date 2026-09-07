"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, Dumbbell, Flame, LockKeyhole, Plus, Target, Trophy, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Athlete from "./athlete";
import Chat from "./chat";
import Motivation, {Celebration} from "./motivation";
import { BASE_TARGETS, adaptiveTargets, type DayLog } from "@/lib/targets";
import { missedDays } from "@/lib/schedule";

export type Leader = { id: number; name: string; total: number; daysLogged: number; streak: number; missedDays: number };

export default function Home() {
  const [celebrating,setCelebrating]=useState<number[]>([]);
  const closeCelebration=useCallback(()=>setCelebrating([]),[]);
  const [athleteId, setAthleteId] = useState<number|null>(null);
  const [search, setSearch] = useState("");
  const [addMode, setAddMode] = useState(true);
  const [boardError,setBoardError]=useState("");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [profile, setProfile] = useState<{ id: number; name: string; pin: string } | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [day, setDay] = useState(1);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const total = logs.reduce((sum, log) => sum + log.count, 0);
  const logMap = useMemo(() => new Map(logs.map((log) => [log.day, log.count])), [logs]);
  const nextDay = BASE_TARGETS.findIndex((t,i)=>(logMap.get(i+1)??0)<t)+1 || 30;
  const latestDay = logs.length ? Math.max(...logs.map((l) => l.day)) : 0;
  // Days already logged keep their original target; everything after
  // re-ramps around actual progress so the plan still lands on 10,000 —
  // ahead of pace shrinks what's left, behind pace grows it.
  const plan = useMemo(() => adaptiveTargets(logs), [logs]);
  // Days already past their calendar date with nothing logged — only
  // meaningful once we know when this person's 30 days actually started.
  const missedSet = useMemo(
    () => new Set(startedAt ? missedDays(new Date(startedAt), new Set(logs.map((l) => l.day))) : []),
    [startedAt, logs]
  );
  const targetToDate = plan.slice(0, latestDay).reduce((sum, value) => sum + value, 0);
  const pace = total - targetToDate;
  const bestDay = logs.length ? Math.max(...logs.map((log) => log.count)) : 0;
  const average = logs.length ? Math.round(total / logs.length) : 0;
  const projected = logs.length ? Math.round((total / latestDay) * 30) : 0;
  const chartData = plan.map((target, index) => {
    const throughDay = index + 1;
    const targetTotal = plan.slice(0, throughDay).reduce((sum, value) => sum + value, 0);
    const actualTotal = logs.filter((log) => log.day <= throughDay).reduce((sum, log) => sum + log.count, 0);
    return { day: `D${throughDay}`, target: targetTotal, actual: throughDay <= latestDay ? actualTotal : undefined };
  });

  async function request(body:unknown) {
    const r=await fetch("/api/challenge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const d=await r.json(); if(!r.ok) throw new Error(d.error||"Unable to save. Try again."); return d;
  }
  async function refresh() { try {const r=await fetch("/api/challenge",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();setLeaders(d.leaderboard);setBoardError("");}catch{setBoardError("Leaderboard unavailable. Refresh to retry.");} }
  useEffect(()=>{refresh();try{const saved=localStorage.getItem("pushup-profile");if(saved){const p=JSON.parse(saved);setProfile(p);loadLogs(p.id,p.pin);}}catch{setMessage("Please sign in again.");}const timer=setInterval(refresh,8000);return()=>clearInterval(timer);},[]);
  async function loadLogs(id:number,savedPin:string) {try{const r=await fetch(`/api/challenge?participant=${id}&pin=${encodeURIComponent(savedPin)}`,{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setLogs(d.logs);if(d.startedAt)setStartedAt(d.startedAt);}catch{setMessage("Could not load your logs. Sign in again to retry.");}}
  async function join(e:React.FormEvent) {e.preventDefault();setBusy(true);setMessage("");try{const data=await request({action:"join",name,pin});const next={id:data.participant.id,name:data.participant.name,pin};localStorage.setItem("pushup-profile",JSON.stringify(next));setProfile(next);setLogs(data.logs||[]);if(data.participant.startedAt)setStartedAt(data.participant.startedAt);setJoinOpen(false);refresh();}catch(e){setMessage(e instanceof Error?e.message:"Could not join.");}finally{setBusy(false);}}
  async function addPushups(e:React.FormEvent) {e.preventDefault();if(!profile){setJoinOpen(true);return;}setBusy(true);setMessage("");try{const data=await request({action:"log",participantId:profile.id,pin:profile.pin,day,count:addMode?(logMap.get(day)||0)+count:count});const savedTotal=data.logs.reduce((sum:number,l:DayLog)=>sum+l.count,0);const crossed=[1000,2500,5000,7500,10000].filter(n=>total<n&&savedTotal>=n);if(crossed.length)setCelebrating(crossed);setLogs(data.logs);setMessage(`Day ${day} saved.`);if(addMode)setCount(0);refresh();}catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false);}}
  function selectDay(index: number) { setDay(index + 1); setCount(addMode?0:(logMap.get(index + 1) ?? 0)); document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth", block: "center" }); }

  return <main className="app-shell min-h-screen text-[#f4f3ef]">
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 sm:px-7 sm:py-8 lg:px-10">
      <header className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><div className="logo-orb grid h-11 w-11 place-items-center rounded-2xl font-black text-[#090a0c]">10K</div><div><h1 className="font-display text-xl font-bold tracking-tight">Pushup Challenge</h1><p className="text-sm text-white/40">30 days · 10,000 reps</p></div></div><Button onClick={() => setJoinOpen(true)} className="glass-button h-11 rounded-full px-4 text-white"><UserRound size={17}/>{profile ? profile.name : "Join challenge"}</Button></header>
      <section className="dashboard-primary mb-7 grid gap-4 lg:grid-cols-[1.55fr_.75fr]">
        <div className="glass-card hero-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-9"><div className="relative z-10"><div className="flex items-start justify-between gap-6"><div><div className="lime-pill mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#dfff73]"><Flame size={17}/> The 10,000 Club</div><p className="number-glow font-display text-[clamp(4.5rem,11vw,7.8rem)] font-black leading-[.76] tracking-[-.07em]">{total.toLocaleString()}</p><p className="mt-5 text-lg text-white/55">of 10,000 pushups completed</p><p className="mt-2 text-sm text-white/35">{logs.length ? (pace>=0?`${pace.toLocaleString()} ahead of your re-ramped pace.`:`${Math.abs(pace).toLocaleString()} behind — the days ahead just adjusted for it.`) : "Log Day 1 and your 30-day plan builds around you."}</p></div><Motivation/></div><div className="mt-7 flex items-center gap-4"><Progress value={Math.min(100, total / 100)} className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-[#c8ff42] [&>div]:to-[#8eff1f] [&>div]:shadow-[0_0_18px_#aaff36]" /><b className="text-sm">{Math.round(total / 100)}%</b></div><div className="mt-7 grid grid-cols-3 divide-x divide-white/10"><Metric icon={<Target/>} value={`${Math.round(total/100)}%`} label="complete"/><Metric icon={<Dumbbell/>} value={Math.max(0,10000-total).toLocaleString()} label="remaining"/><Metric icon={<CalendarDays/>} value={`${logs.length} day${logs.length===1?"":"s"}`} label="logged"/></div></div></div>
        <form id="log-form" onSubmit={addPushups} className="glass-card log-panel rounded-[2rem] p-6 sm:p-8"><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-[#cfff57]">Log work</p><h2 className="font-display mt-1 text-3xl font-bold">Get your reps in.</h2><p className="mt-1 text-sm text-white/40">Small steps. Big results.</p></div><div className="icon-orb"><Plus /></div></div><label className="mb-2 block text-sm text-white/55">Challenge day</label><div className="relative"><CalendarDays className="select-icon" size={18}/><select value={day} onChange={(e) => { const d=Number(e.target.value); setDay(d); setCount(addMode?0:(logMap.get(d) ?? 0)); }} className="glass-input mb-4 h-13 w-full rounded-2xl pl-12 pr-4 text-base text-white outline-none">{plan.map((t,i)=><option className="bg-[#141b1d]" key={i} value={i+1}>Day {i+1} · target {t}</option>)}</select></div><label className="mb-2 block text-sm text-white/55">{addMode ? "Pushups completed" : "Day total (replaces saved total)"}</label><div className="flex flex-wrap gap-2 mb-3">{[10,25,50].map(n=><Button type="button" key={n} className="glass-button" onClick={()=>setCount(v=>Math.min(2000,v+n))}>+{n}</Button>)}<Button type="button" className="glass-button" onClick={()=>{setAddMode(!addMode);setCount(addMode?(logMap.get(day)||0):0)}}>{addMode?"Edit total":"Add reps"}</Button></div><div className="relative mb-4"><Dumbbell className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/45" size={18}/><Input type="number" min={0} max={2000} value={count} onChange={(e)=>setCount(Number(e.target.value))} className="glass-input h-13 rounded-2xl pl-12 text-lg text-white" /></div><Button disabled={busy} className="lime-button h-13 w-full rounded-2xl font-bold text-[#091009]">{busy ? "Saving…" : addMode ? "Update day" : "Replace day total"}<ArrowRight size={18}/></Button>{message && <p className="mt-3 text-sm text-[#ff886f]">{message}</p>}<p className="mt-4 text-center text-xs text-white/35">Tap any day below to add or edit it.</p></form>
      </section>
      <section className="grid gap-7 lg:grid-cols-[1.55fr_.75fr]">
        <div className="glass-card flex flex-col rounded-[2rem] p-5 sm:p-8"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm text-white/45">Your 30-day plan</p><h2 className="font-display text-3xl font-bold">Built to ramp.</h2><p className="mt-1 text-sm text-white/40">A starting template — every day you haven&apos;t logged yet reshapes around your pace.</p></div><span className="glass-chip text-sm text-white/55">Next: Day {nextDay}<ArrowRight size={15}/></span></div><div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6 sm:gap-3 md:grid-cols-10">{plan.map((target,i)=>{ const actual=logMap.get(i+1); const done=actual!==undefined; const hit=done && actual>=target; const missed=!done&&missedSet.has(i+1); return <button key={i} onClick={()=>selectDay(i)} aria-label={`Day ${i+1}, target ${target}${missed?", missed":""}`} className={`day-tile relative aspect-square p-1 text-center ${hit?"day-hit":done?"day-under":missed?"day-missed":""}`}>{hit&&<span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#15200c] text-[#dfff73]"><Check size={13}/></span>}<span className="block text-xs opacity-55">{i+1}</span><span className="block text-sm font-bold sm:text-base">{missed?"—":actual ?? target}</span></button>})}</div><div className="mt-auto flex flex-wrap gap-5 pt-6 text-xs text-white/40"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#baff3b] shadow-[0_0_10px_#baff3b]"/> Target hit</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#ff896f]"/> Under target</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-dashed border-[#ff896f]"/> Missed</span><span>Unlogged days re-ramp to your pace</span></div></div>
        <div className="glass-card relative overflow-hidden rounded-[2rem] p-5 sm:p-8"><div className="relative z-10 mb-6 flex items-center justify-between"><div><p className="text-sm text-white/45">Everybody eats</p><h2 className="font-display text-3xl font-bold">Leaderboard</h2></div><Trophy className="text-[#bdff43] drop-shadow-[0_0_12px_#9dff22]" /></div><Input aria-label="Find participant" placeholder="Find someone in the crew…" value={search} onChange={e=>setSearch(e.target.value)} className="glass-input mb-4"/>{boardError&&<button onClick={refresh} className="text-sm text-amber-200">{boardError}</button>}{leaders.length ? <div className="scroll-list relative z-10 max-h-[27rem] space-y-2 overflow-y-auto pr-1">{leaders.filter(l=>l.name.toLowerCase().includes(search.toLowerCase())).map((leader,i)=><div key={leader.id} role="button" tabIndex={0} aria-label={`View ${leader.name} progress`} onClick={()=>setAthleteId(leader.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setAthleteId(leader.id)}}} className={`leader-row cursor-pointer flex items-center gap-3 rounded-2xl p-3 ${profile?.id===leader.id?"leader-me":""}`}><span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${i===0?"rank-one":"bg-white/8 text-white/55"}`}>{i+1}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{leader.name}</p><p className="text-xs text-white/35">{leader.daysLogged} days · {leader.streak} streak{leader.missedDays>0&&<span className="text-[#ff9c85]"> · {leader.missedDays} missed</span>}</p></div><div className="text-right"><b className="block">{leader.total.toLocaleString()}</b><span className="text-xs text-white/35">{leader.daysLogged?Math.round(leader.total/leader.daysLogged):0}/day avg</span></div></div>)}</div>:<div className="relative z-10 grid min-h-52 place-items-center text-center text-white/40"><div><Users className="mx-auto mb-3"/><p>Be first on the board.</p></div></div>}<p className="mt-5 text-sm text-slate-300">Tap a name to view their calendar and chart.</p></div>
      </section>
      <section className="mt-7 grid gap-4 lg:grid-cols-[1.6fr_.8fr]">
        <div className="glass-card rounded-[2rem] p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm text-white/45">Cumulative progress</p><h2 className="font-display text-2xl font-bold">Are you on pace?</h2></div><div className="flex gap-4 text-sm"><span className="flex items-center gap-2 text-white/45"><i className="h-2 w-5 rounded-full bg-white/35"/> Target</span><span className="flex items-center gap-2 text-white"><i className="h-2 w-5 rounded-full bg-[#e9ff5b]"/> You</span></div></div>
          <div className="h-72 w-full" aria-label="Cumulative pushups compared with the 10,000 target pace"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{top:8,right:10,left:-12,bottom:0}}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="day" stroke="rgba(255,255,255,.28)" tickLine={false} axisLine={false} interval={4}/><YAxis stroke="rgba(255,255,255,.28)" tickLine={false} axisLine={false} tickFormatter={(value)=>value>=1000?`${value/1000}k`:value}/><Tooltip contentStyle={{background:"#1a1b20",border:"1px solid rgba(255,255,255,.12)",borderRadius:12}} labelStyle={{color:"rgba(255,255,255,.5)"}} formatter={(value,name)=>[Number(value).toLocaleString(),name==="actual"?"You":"Target"]}/><Line type="monotone" dataKey="target" stroke="rgba(255,255,255,.32)" strokeWidth={2} dot={false} strokeDasharray="5 6"/><Line type="monotone" dataKey="actual" stroke="#e9ff5b" strokeWidth={4} dot={{r:3,fill:"#e9ff5b",strokeWidth:0}} activeDot={{r:6}} connectNulls={false}/></LineChart></ResponsiveContainer></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Current pace" value={logs.length ? `${pace >= 0 ? "+" : ""}${pace.toLocaleString()}` : "—"} note={logs.length ? (pace>=0?"ahead through last logged day":"behind through last logged day") : "log Day 1"} accent={pace>=0}/>
          <Stat label="Projected finish" value={projected ? projected.toLocaleString() : "—"} note={projected>=10000?"10K trajectory":"estimate through last logged day"} accent={projected>=10000}/>
          <Stat label="Daily average" value={average ? average.toLocaleString() : "—"} note={`${logs.length} day${logs.length===1?"":"s"} logged`}/>
          <Stat label="Personal best" value={bestDay ? bestDay.toLocaleString() : "—"} note="pushups in one day"/>
        </div>
      </section>
      <section className="mt-7"><Chat profile={profile} onNeedJoin={()=>setJoinOpen(true)}/></section>
      <section className="milestone-strip glass-card"><div><p className="text-sm text-slate-300">Your next milestone</p><h2 className="text-2xl font-bold">{total>=10000?"10K club. You made it.":`${([1000,2500,5000,7500,10000].find(n=>n>total)||10000).toLocaleString()} reps`}</h2></div><div className="flex flex-wrap gap-3">{[1000,2500,5000,7500,10000].map(n=><span key={n} className={`glass-chip ${total>=n?"text-lime-300":"text-slate-400"}`}>{total>=n?"✓ ":""}{n/1000}K</span>)}</div></section>
      <footer className="py-8 text-center text-sm text-white/30">Break the reps into clean sets. Perfect form beats junk volume.</footer>
    </div>
    {celebrating.length>0&&<Celebration milestones={celebrating} onClose={closeCelebration}/>}
    <Athlete id={athleteId} onClose={()=>setAthleteId(null)} baseTargets={BASE_TARGETS} mine={profile?leaders.find(l=>l.id===profile.id)??null:null}/>
    {joinOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#020504]/80 p-4 backdrop-blur-xl"><div className="glass-card modal-glow w-full max-w-md rounded-[2rem] p-6 sm:p-8"><div className="mb-6 flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#d4ff62]"><LockKeyhole size={15}/> Your scorecard</div><h2 className="font-display text-3xl font-bold">Join the challenge</h2><p className="mt-2 text-sm leading-6 text-white/45">Use the same name and PIN to pick up your progress on another device.</p></div>{<button aria-label="Close sign in" onClick={()=>setJoinOpen(false)} className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white"><X/></button>}</div><form onSubmit={join} className="space-y-4"><div><label className="mb-2 block text-sm text-white/55">Display name</label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Evan" maxLength={30} className="glass-input h-13 rounded-2xl text-white" /></div><div><label className="mb-2 block text-sm text-white/55">4-digit PIN</label><Input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} type="password" inputMode="numeric" placeholder="••••" className="glass-input h-13 rounded-2xl text-xl tracking-[.4em] text-white" /></div><Button disabled={busy} className="lime-button h-13 w-full rounded-2xl font-bold text-black">{busy?"Joining…":"Enter challenge"}<ArrowRight size={18}/></Button>{message&&<p className="text-sm text-[#ff886f]">{message}</p>}</form></div></div>}
  </main>;
}

function Metric({icon,value,label}:{icon:React.ReactNode;value:string;label:string}) { return <div className="flex items-center gap-3 px-3 first:pl-0 last:pr-0"><span className="metric-icon">{icon}</span><span><b className="block text-base sm:text-lg">{value}</b><small className="text-xs text-white/40">{label}</small></span></div>; }
function Stat({label,value,note,accent=false}:{label:string;value:string;note:string;accent?:boolean}) { return <div className="glass-card stat-card flex min-h-36 flex-col justify-between rounded-[1.5rem] p-5"><p className="text-sm text-white/45">{label}</p><div><p className={`font-display text-3xl font-black ${accent?"text-[#caff4f] drop-shadow-[0_0_10px_rgba(190,255,65,.3)]":"text-white"}`}>{value}</p><p className="mt-1 text-xs text-white/35">{note}</p></div></div>; }
