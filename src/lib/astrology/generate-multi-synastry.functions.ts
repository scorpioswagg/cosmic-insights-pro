import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REPORTS } from "./reports-catalog";
import { computeMultiSynastry, type SerialChart } from "./synastry";
import { synastryEvidence } from "./evidence";

const Body=z.object({name:z.string(),longitude:z.number().optional(),sign:z.string(),signDegree:z.number(),house:z.number().optional(),retrograde:z.boolean(),speed:z.number().optional()});
const Chart=z.object({
 input:z.object({name:z.string(),date:z.string(),time:z.string(),place:z.string(),latitude:z.number(),longitude:z.number(),timezone:z.string(),timeUnknown:z.boolean().optional()}),
 julianDayUT:z.number(),utcIso:z.string(),ascendant:z.number(),midheaven:z.number(),
 bodies:z.array(Body).min(1).max(40),houses:z.array(z.number()).length(12),
 aspects:z.array(z.object({a:z.string(),b:z.string(),type:z.string(),angle:z.number().optional(),orb:z.number(),applying:z.boolean()})).max(120)
});
const Input=z.object({reportId:z.string().min(1).max(64),charts:z.array(Chart).min(2).max(5)});

function serial(c:z.infer<typeof Chart>):SerialChart{return {...c,aspects:c.aspects.map(a=>({a:a.a,b:a.b,type:a.type,orb:a.orb,applying:a.applying}))};}

export const generateMultiSynastryReport=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .inputValidator((input:unknown)=>Input.parse(input&&typeof input==="object"&&"data" in input?(input as {data:unknown}).data:input))
 .handler(async({data,context})=>{
   if((context.claims as {is_anonymous?:boolean})?.is_anonymous) throw new Error("Unauthorized: please sign in with Google to generate reports.");
   const def=REPORTS.find(r=>r.id===data.reportId);
   if(!def) throw new Error("Unknown report: "+data.reportId);
   if(!def.requiresPartner) throw new Error("This report is not a multi-chart synastry report.");
   if(data.charts.length<2||data.charts.length>5) throw new Error("Multi-chart synastry requires 2–5 charts.");
   const {assertReportAccess}=await import("@/lib/reports/access.server");
   await assertReportAccess(context.userId,data.reportId);
   if(def.adult){
     const {data:p,error}=await context.supabase.from("profiles").select("adult_consent").eq("id",context.userId).maybeSingle();
     if(error) throw new Error(error.message);
     if(!p?.adult_consent) throw new Error("ADULT_CONSENT_REQUIRED");
   }
   const key=process.env.LOVABLE_API_KEY;
   if(!key) throw new Error("Missing LOVABLE_API_KEY");
   const charts=data.charts.map(serial);
   const group=computeMultiSynastry(charts);
   const model=createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
   const system=`You are a master astrologer writing for The Cosmic Blueprint.

Use only supplied calculated chart evidence. Never invent placements, houses, aspects, motives, history, diagnoses or future events. A→B means A planets in B houses; B→A is the reverse. For 3–5 participants analyze every unique pair, then describe supported network patterns without reducing people to a deterministic group verdict. Astrology is symbolic interpretation, not factual mind-reading or diagnosis.

Every chapter must open with an italic Chart Anchors line. Every substantive paragraph must cite supplied evidence. Use grounded language such as "this may suggest" and "this can manifest as". Chapter 30 must contain exactly five numbered Brutal Truths. Chapter 31 must end exactly with: Your chart does not give you an excuse. It gives you a mirror.`;

   const pairEvidence=group.pairs.map(pair=>`PAIR: ${pair.aName} ↔ ${pair.bName}\n${synastryEvidence(charts[pair.aIndex],charts[pair.bIndex],pair.result,def.title)}`).join("\n\n--- PAIR ---\n\n");
   const names=group.participants.join(", ");
   const words=Math.max(140,Math.round(def.targetWords/def.sections.length));
   const chapters:string[]=[]; let rolling="";
   for(let i=0;i<def.sections.length;i++){
     const chapter=def.sections[i];
     const prompt=`Write chapter ${i+1} of ${def.sections.length} of **${def.title}** for ${names}.

Exact H2 heading:
## ${chapter}

Target length: ~${words} words.

MULTI-CHART EVIDENCE:
${pairEvidence}

Prior chapter excerpt (continuity only; do not repeat):
${rolling.slice(-2500)}

Rules: only this chapter; begin with one italic Chart Anchors line; every paragraph cites supplied evidence; do not invent data. If this is chapter 30, provide exactly five numbered Brutal Truths. If chapter 31, end with the required mirror sentence.`;
     const result=await generateText({model,system,prompt});
     const piece=result.text.trim();
     chapters.push(piece); rolling=(rolling+"\n\n"+piece).slice(-6000);
   }
   return {reportId:data.reportId,title:def.title,markdown:chapters.join("\n\n"),generatedAt:new Date().toISOString()};
 });
