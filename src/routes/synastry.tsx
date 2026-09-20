import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BirthForm } from "@/components/astrology/BirthForm";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";
import { calculateChart } from "@/lib/astrology/swisseph-client";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { generateMultiSynastryReport } from "@/lib/astrology/generate-multi-synastry.functions";

export const Route=createFileRoute("/synastry")({component:SynastryPage});

function SynastryPage(){
 const [count,setCount]=useState(2);
 const [charts,setCharts]=useState<(ChartCalculation|null)[]>([null,null]);
 const [busy,setBusy]=useState<number|null>(null);
 const [reportId,setReportId]=useState("synastry-power-dynamics");
 const [generating,setGenerating]=useState(false);
 const [report,setReport]=useState<{title:string;markdown:string}|null>(null);
 const [error,setError]=useState<string|null>(null);
 const reports=useMemo(()=>REPORTS.filter(r=>r.id.startsWith("synastry-")&&r.requiresPartner),[]);
 const ready=charts.filter((c):c is ChartCalculation=>!!c);

 function resize(n:number){const safe=Math.max(2,Math.min(5,n));setCount(safe);setCharts(old=>Array.from({length:safe},(_,i)=>old[i]??null));setReport(null);}
 async function calculate(index:number,input:BirthInput){
   setBusy(index);setError(null);
   try{const c=await calculateChart(input);setCharts(old=>old.map((x,i)=>i===index?c:x));setReport(null);}
   catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(null);}
 }
 async function generate(){
   if(ready.length<2){setError("Calculate at least two participant charts first.");return;}
   setGenerating(true);setError(null);
   try{const result=await generateMultiSynastryReport({data:{reportId,charts:ready}});setReport({title:result.title,markdown:result.markdown});}
   catch(e){setError(e instanceof Error?e.message:String(e));}finally{setGenerating(false);}
 }
 function download(){if(!report)return;const a=document.createElement("a");const u=URL.createObjectURL(new Blob([report.markdown],{type:"text/markdown;charset=utf-8"}));a.href=u;a.download=report.title.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".md";a.click();URL.revokeObjectURL(u);}

 return <main className="starfield min-h-screen"><div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
   <header className="text-center space-y-3"><p className="text-xs uppercase tracking-[0.35em] text-gold">Synastry Studio</p><h1 className="font-display text-5xl text-gradient-gold">Two to Five Charts</h1><p className="text-muted-foreground max-w-3xl mx-auto">Calculate real Swiss Ephemeris natal charts, compare every unique pair, and generate evidence-bound multi-chart reports.</p></header>
   <div className="flex items-center gap-3"><label className="text-xs uppercase tracking-widest text-muted-foreground">Participants</label><select value={count} onChange={e=>resize(Number(e.target.value))} className="cosmic-input w-24">{[2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select><span className="text-xs text-muted-foreground">{ready.length} of {count} calculated</span></div>
   <div className="grid lg:grid-cols-2 gap-6">{Array.from({length:count},(_,i)=><div key={i} className="glass rounded-2xl p-5"><p className="text-xs uppercase tracking-widest text-gold mb-3">Participant {String.fromCharCode(65+i)}</p><BirthForm onSubmit={input=>void calculate(i,input)} busy={busy===i} isAuthed={true} showSample={false} title={`Participant ${String.fromCharCode(65+i)}`} hideGuide bare /></div>)}</div>
   <section className="glass rounded-2xl p-6 space-y-4"><label className="text-xs uppercase tracking-widest text-muted-foreground">Report</label><select value={reportId} onChange={e=>setReportId(e.target.value)} className="cosmic-input w-full">{reports.map(r=><option key={r.id} value={r.id}>{r.title} — {r.tagline}</option>)}</select><button type="button" disabled={generating||ready.length<2} onClick={()=>void generate()} className="px-5 py-3 rounded-md bg-gold text-background text-xs uppercase tracking-widest disabled:opacity-50">{generating?"Generating…":"Generate multi-chart report"}</button></section>
   {error&&<div className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</div>}
   {report&&<article className="glass rounded-2xl p-6 space-y-4"><div className="flex justify-between gap-3"><h2 className="font-display text-3xl text-gradient-gold">{report.title}</h2><button type="button" onClick={download} className="text-xs uppercase tracking-widest text-gold border border-gold/50 rounded-md px-4 py-2">Download .md</button></div><div className="prose-cosmic whitespace-pre-wrap">{report.markdown}</div></article>}
 </div></main>;
}
