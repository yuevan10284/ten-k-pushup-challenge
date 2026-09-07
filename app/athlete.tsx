"use client";
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { adaptiveTargets } from '@/lib/targets';
import { missedDays, currentStreak } from '@/lib/schedule';
import type { Leader } from './page';

export default function Athlete({id,onClose,baseTargets,mine}:{id:number|null;onClose:()=>void;baseTargets:number[];mine?:Leader|null}) {
  const [data,setData]=useState<{person:{id:number;name:string;startedAt?:string};logs:{day:number;count:number}[]}|null>(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{if(!id)return; const controller=new AbortController();setData(null);setError('');fetch(`/api/athletes?id=${id}`,{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort();},[id,retry]);
  const logs=data?.logs??[];const total=logs.reduce((s,l)=>s+l.count,0);const last=Math.max(0,...logs.map(l=>l.day));
  const missedSet=new Set(data?.person.startedAt?missedDays(new Date(data.person.startedAt),new Set(logs.map(l=>l.day))):[]);
  const daysLogged=logs.length;
  const average=daysLogged?Math.round(total/daysLogged):0;
  const streak=data?.person.startedAt?currentStreak(new Date(data.person.startedAt),new Set(logs.map(l=>l.day))):0;
  const myStats=mine&&data&&mine.id!==data.person.id?mine:null;
  const myAverage=myStats?(myStats.daysLogged?Math.round(myStats.total/myStats.daysLogged):0):0;
  const h2hRows:[string,number,number][]=myStats?[["Total reps",myStats.total,total],["Daily avg",myAverage,average],["Days logged",myStats.daysLogged,daysLogged],["Streak",myStats.streak,streak]]:[];
  // Re-ramped to this athlete's own pace, same as the main plan — every
  // participant's remaining-day targets adapt to their own progress.
  const targets=adaptiveTargets(logs,baseTargets);
  const chart=targets.map((t,i)=>({day:i+1,target:targets.slice(0,i+1).reduce((a,b)=>a+b,0),actual:i+1<=last?logs.filter(l=>l.day<=i+1).reduce((s,l)=>s+l.count,0):null}));
  return <Dialog open={id!==null} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="glass-card athlete-dialog rounded-3xl text-white sm:max-w-3xl max-h-[90dvh] overflow-y-auto"><div className="athlete-heading"><DialogTitle className="text-3xl">{data?.person.name??'Athlete profile'}</DialogTitle><DialogDescription className="text-slate-300">Read-only progress · only this participant can update their reps.</DialogDescription></div>{error?<div role="alert">{error}<button className="glass-chip ml-3" onClick={()=>setRetry(v=>v+1)}>Retry</button></div>:!data?<p role="status">Loading progress…</p>:<><div className="athlete-summary flex items-end justify-between"><div><strong className="text-5xl tracking-tight">{total.toLocaleString()}</strong><span className="ml-3 text-slate-300">/ 10,000 reps</span></div><b className="text-lime-300">{logs.filter(l=>l.count>0).length} active days</b></div><Progress value={Math.min(100,total/100)} className="[&>div]:bg-lime-300"/>{myStats&&<div className="head-to-head my-6 rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="mb-3 flex items-center justify-between text-sm font-semibold"><span className="text-lime-300">You</span><span className="text-white/45">Head to head</span><span>{data?.person.name}</span></div><div className="space-y-2.5">{h2hRows.map(([label,mineVal,theirVal])=><div key={label} className="flex items-center justify-between text-sm"><b className={`w-16 text-left ${mineVal>theirVal?'text-lime-300':'text-white/50'}`}>{mineVal.toLocaleString()}</b><span className="text-xs text-white/40">{label}</span><b className={`w-16 text-right ${theirVal>mineVal?'text-lime-300':'text-white/50'}`}>{theirVal.toLocaleString()}</b></div>)}</div></div>}<div className="athlete-chart h-52"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><CartesianGrid stroke="#ffffff12" vertical={false}/><XAxis dataKey="day" stroke="#a1b1aa" tickLine={false}/><YAxis stroke="#a1b1aa" width={45}/><Tooltip contentStyle={{background:'#101c19',border:'1px solid #465b42'}}/><Line dataKey="target" name="Target" stroke="#94a3b8" strokeDasharray="5 5" dot={false}/><Line dataKey="actual" name="Completed" stroke="#c9ff57" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div><div className="athlete-days grid grid-cols-5 sm:grid-cols-10 gap-2">{targets.map((target,i)=>{const log=logs.find(l=>l.day===i+1);const missed=!log&&missedSet.has(i+1);return <div key={i} className={`day-tile p-2 text-center ${log&&log.count>=target?'day-hit':missed?'day-missed':''}`}><small className="block">Day {i+1}</small><b>{log?.count??'—'}</b></div>})}</div><p className="text-sm text-slate-300">Lime = daily target met. Dashed = missed. Dashes = not due yet.</p></>}</DialogContent></Dialog>;
}
