import type { ReportDefinition } from "./reports-catalog-base";

const CATEGORY = "Unfiltered Series" as const;
const FRAMING = (premise: string) => `UNFILTERED SERIES / MULTI-CHART SYNASTRY. ${premise}

TWO-OR-MORE-CHART RULES:
- The report receives Person A, Person B, and optionally additional participants.
- For two charts, analyze the relationship symmetrically using mutual cross-chart aspects plus A→B and B→A house overlays.
- For three or more charts, analyze every pairwise relationship and then synthesize the group dynamic without treating the group score as a deterministic verdict.
- A→B means the visiting planets of A are resolved against B's house cusps. B→A means B's planets are resolved against A's house cusps. Never reverse ownership.
- Never invent aspects, overlays, houses, degrees, birth data, motives, secret thoughts, relationship history, diagnoses, crimes, or future events.
- Attraction, karmic, fated, soulmate, or destiny language is symbolic interpretation only, never proof of permanence, betrayal, reunion, abuse, or breakup.
- Use evidence-based language such as "this may suggest", "this pattern can manifest as", "under pressure this may become", "others may experience this as", and "the mature expression is".

${premise}

The reading should distinguish pair-specific chemistry from the overall group pattern, identify alliances and tensions only when supported by the supplied chart evidence, and preserve each participant's individuality.

OUTPUT STANDARD:
- Exactly the required chapters in order.
- Each chapter begins with an italic Chart Anchors line naming the supplied factors it interprets.
- Every substantive paragraph must cite supplied chart evidence.
- No deterministic psychological claims.
- No predictive claims stated as facts.
- Markdown, H2 chapter headings, no emojis.`;

const COMMON_ENDING = `The penultimate chapter must contain exactly five numbered Brutal Truths. The final chapter must end with exactly: "Your chart does not give you an excuse. It gives you a mirror."`;

const SPECS: Array<{
  id: string; title: string; tagline: string; icon: string; premise: string; sections: string[];
}> = [
{
id:"synastry-power-dynamics",title:"THE POWER DYNAMICS FILE™",tagline:"Where influence, autonomy, and control collide between two or more charts.",icon:"♜",
premise:"Map how each participant's Sun, Mars, Saturn, Pluto, angles, and 1st/8th/10th house overlays can describe symbolic power dynamics, leadership friction, autonomy needs, and the difference between influence and control.",
sections:["Open the File: How Multi-Chart Power Works","Person A: Their Relationship to Power","Person B: Their Relationship to Power","The Additional Participants","The First Power Signature","Mutual Aspects That Change the Balance","A→B House Power","B→A House Power","Pair Three: Where the Third Chart Changes the Field","Who Initiates and Who Resists","Autonomy vs. Influence","Control vs. Cooperation","Pride, Status and Recognition","Mars Under Pressure","Saturn and the Rules","Pluto and Intensity","Sun and Identity","The 1st House Mirror","The 8th House Pressure Chamber","The 10th House Stage","Where Power Becomes Protection","Where Power Becomes Friction","What Each Person May Experience","The Group Pattern","The Contradictions","The Accountability Question","The Mature Use of Influence","Repairing Power Imbalances","What Happens When Nobody Bends","Five Brutal Truths","The Power You Choose to Build"]},
{
id:"synastry-emotional-weather",title:"THE EMOTIONAL WEATHER REPORT™",tagline:"The emotional climate created when two or more inner worlds meet.",icon:"☾",
premise:"Examine Moon, Venus, Neptune, Cancer/Pisces symbolism, 4th/7th/12th house overlays, and relevant mutual aspects to describe emotional resonance, sensitivity, reassurance needs, withdrawal, and repair without claiming anyone's private feelings.",
sections:["Forecast Begins: Reading Emotional Weather","Person A's Emotional Climate","Person B's Emotional Climate","The Third Chart's Weather","Moon-to-Moon Resonance","Moon-to-Personal-Planet Contacts","Venus and Emotional Reassurance","Neptune and Sensitivity","4th House Overlays","7th House Emotional Mirroring","12th House Emotional Fog","Where Comfort Comes Easily","Where Feelings Become Complicated","The Need to Be Understood","Withdrawal and Re-entry","Sensitivity Under Pressure","Emotional Timing Differences","Communication During Emotional Storms","The Group's Emotional Climate","Where One Person Absorbs Too Much","Boundaries and Reassurance","Trust and Vulnerability","The Contradictions","What the Charts Actually Support","The Repair Conversation","The Mature Emotional Pattern","What Makes the Weather Clear","What Keeps the Storm Returning","The Choice Before Reactivity","Five Brutal Truths","The Forecast You Can Change"]},
{
id:"synastry-communication-code",title:"THE COMMUNICATION CODE™",tagline:"What the charts say about how people connect, clash, clarify, and misread.",icon:"☿",
premise:"Analyze Mercury, Moon, Jupiter, Uranus, 3rd/9th/11th house overlays, and mutual aspects to describe communication styles, interpretation gaps, intellectual chemistry, interruptions, silence, and repair.",
sections:["Decode the Signal","Person A's Communication Operating System","Person B's Communication Operating System","Additional Voices in the Room","Mercury-to-Mercury","Mercury-to-Moon","Mercury-to-Venus and Mars","Mercury-to-Jupiter","Mercury-to-Uranus","The 3rd House Conversation","The 9th House Worldview","The 11th House Network","Where Conversation Flows","Where Words Become Weapons","Silence, Delay and Withdrawal","Intellectual Chemistry","Different Definitions of Honesty","The Argument Loop","The Misunderstanding Pattern","Communication in the Group","Who Translates Whom","Where Ego Enters the Conversation","The Contradictions","What the Evidence Says","The Conversation Nobody Wants to Have","The Repair Protocol","The Mature Communication Pattern","What Must Stop Being Assumed","The Choice to Clarify","Five Brutal Truths","The Code You Can Rewrite"]},
{
id:"synastry-attraction-architecture",title:"THE ATTRACTION ARCHITECTURE™",tagline:"The chart mechanics behind fascination, desire, chemistry, and distance.",icon:"♀",
premise:"Explore Venus, Mars, Pluto, Sun, Ascendant, 5th/7th/8th house overlays and mutual aspects to describe attraction and its shadow without asserting consent, intent, sexual behavior, or inevitability.",
sections:["Enter the Attraction Field","Person A's Desire Signature","Person B's Desire Signature","The Third-Chart Effect","Venus Meets Venus","Venus Meets Mars","Mars Meets Mars","Pluto and Intensity","Sun and Recognition","Ascendant Chemistry","5th House Spark","7th House Projection","8th House Depth","The First Pull","What Sustains Fascination","Where Attraction Becomes Projection","Distance and Pursuit","Desire Under Pressure","Boundaries and Consent","The Group Attraction Pattern","Chemistry vs. Compatibility","Intensity vs. Stability","The Contradictions","What the Charts Actually Show","What They Do Not Prove","Mature Desire","The Choice Beyond Chemistry","How to Keep Attraction From Becoming a Trap","The Integrated Pattern","Five Brutal Truths","The Attraction You Can Understand"]},
{
id:"synastry-karmic-patterns",title:"THE KARMIC THREADS FILE™",tagline:"Symbolic patterns of familiarity, repetition, and growth across two or more charts.",icon:"☊",
premise:"Use Nodes, Saturn, Chiron, Pluto, 12th/8th/9th house overlays, and relevant mutual aspects to explore symbolic familiarity, repetition, lessons, and growth. Karmic language must remain explicitly interpretive rather than factual past-life claims.",
sections:["What 'Karmic' Means Here","Person A's Growth Axis","Person B's Growth Axis","The Additional Participant","North Node Contacts","South Node Symbolism","Saturn and Responsibility","Chiron and Tender Places","Pluto and Transformation","12th House Symbolism","8th House Symbolism","9th House Meaning","The Feeling of Familiarity","The Repeating Pattern","The Lesson Each Person May Trigger","The Group's Repeating Theme","Where History Is Symbolic","Where Projection Can Begin","What the Charts Cannot Prove","Responsibility Without Blame","Growth vs. Attachment","The Contradictions","The Choice Point","What Mature Growth Looks Like","How to Break the Repetition","Repair and Boundaries","What Becomes Possible","What Must Not Be Romanticized","The Integrated Lesson","Five Brutal Truths","The Thread You Choose to Continue"]},
{
id:"synastry-friendship-alliance",title:"THE FRIENDSHIP ALLIANCE™",tagline:"How two or more charts build trust, loyalty, laughter, and shared purpose.",icon:"♧",
premise:"Analyze Mercury, Venus, Jupiter, Uranus, Sun, 3rd/5th/11th house overlays and mutual aspects to describe friendship chemistry, loyalty, collaboration, humor, independence, and social friction.",
sections:["The Alliance Begins","Person A as a Friend","Person B as a Friend","The Group Member Who Changes Everything","Sun-to-Sun Recognition","Mercury and Conversation","Venus and Affection","Jupiter and Generosity","Uranus and Freedom","3rd House Friendship","5th House Play","11th House Belonging","Where Trust Builds","Where Loyalty Gets Tested","Independence Inside Friendship","Humor and Shared Meaning","Competition and Comparison","Social Boundaries","Conflict Between Friends","The Group Dynamic","Who Connects Whom","Where the Alliance Becomes a Team","The Contradictions","What the Evidence Supports","What Could Fracture the Bond","Repairing Friendship","Healthy Independence","Shared Purpose","The Mature Alliance","Five Brutal Truths","The Friendship You Can Choose"]},
{
id:"synastry-ambition-coalition",title:"THE AMBITION COALITION™",tagline:"What happens when two or more ambitions occupy the same room.",icon:"⚒",
premise:"Examine Sun, Mars, Saturn, Jupiter, Midheaven, 2nd/6th/10th/11th house overlays and mutual aspects to describe collaboration, competition, leadership, money themes, standards, and shared ambition.",
sections:["The Coalition Forms","Person A's Ambition","Person B's Ambition","The Additional Ambition","Sun and Visibility","Mars and Drive","Saturn and Standards","Jupiter and Expansion","Midheaven and Direction","2nd House Resources","6th House Work","10th House Reputation","11th House Networks","Who Leads","Who Challenges","Who Builds","Competition and Comparison","Money and Resource Tension","Different Definitions of Success","The Group Strategy","When Collaboration Works","When Competition Takes Over","The Contradictions","What the Charts Actually Support","The Feedback Problem","Power and Responsibility","The Mature Coalition","How to Divide Roles","What Happens If Nobody Listens","Five Brutal Truths","The Work Worth Building Together"]},
{
id:"synastry-vulnerability-mirror",title:"THE VULNERABILITY MIRROR™",tagline:"Where closeness, defenses, trust, and emotional exposure meet.",icon:"◇",
premise:"Use Moon, Venus, Neptune, Chiron, Pluto, Saturn and 4th/8th/12th house overlays to explore vulnerability, emotional defenses, trust, boundaries, and repair.",
sections:["Before the Mirror","Person A's Vulnerability Pattern","Person B's Vulnerability Pattern","The Third Mirror","Moon and Safety","Venus and Receiving","Chiron and Tenderness","Saturn and Guarding","Pluto and Exposure","Neptune and Sensitivity","4th House Safety","8th House Exposure","12th House Vulnerability","What Opens the Door","What Closes It","Defenses Under Pressure","Trust Takes Time","The Fear of Being Misread","The Group Vulnerability Pattern","Where One Person Carries More","Boundaries Without Walls","Intimacy Without Assumption","The Contradictions","What the Evidence Supports","What It Does Not Prove","The Conversation Beneath the Conversation","Repair After Exposure","The Mature Vulnerability Pattern","What Safety Can Be Built","Five Brutal Truths","The Mirror You Can Face Together"]},
{
id:"synastry-conflict-repair",title:"THE CONFLICT & REPAIR ATLAS™",tagline:"Map the friction points—and the evidence-based routes back to connection.",icon:"⚔",
premise:"Analyze Mars, Saturn, Uranus, Pluto, Mercury, Moon, 1st/6th/7th/8th house overlays and mutual aspects to describe conflict triggers, escalation patterns, accountability, boundaries, and repair potential without predicting collapse.",
sections:["Read the Map Before the Fight","Person A Under Conflict","Person B Under Conflict","The Additional Participant","Mars Triggers","Saturn Friction","Uranus Disruption","Pluto Intensity","Mercury During Conflict","Moon During Conflict","1st House Reactivity","6th House Irritation","7th House Opposition","8th House Pressure","The First Trigger","The Escalation Sequence","Where Misunderstanding Enters","Control and Defensiveness","Withdrawal and Pursuit","Conflict in the Group","Who Needs Space","Who Needs Resolution","What the Charts Actually Support","What They Cannot Predict","Accountability Without Blame","The Repair Sequence","Boundaries and Reconnection","The Mature Conflict Pattern","The Choice Before Escalation","Five Brutal Truths","The Repair Atlas"]},
{
id:"synastry-composite-family",title:"THE CONSTELLATION BETWEEN US™",tagline:"A whole-system reading of the bonds, roles, and patterns among multiple charts.",icon:"✦",
premise:"Synthesize two or more charts as a constellation: pairwise aspects, house overlays, domain patterns, roles, shared themes, autonomy, communication, trust, attraction, ambition, and repair. Never reduce the people to a single group score.",
sections:["Welcome to the Constellation","Person A: Their Orbit","Person B: Their Orbit","Person C and Beyond","The Strongest Pairwise Signals","The House Overlay Network","The Attraction Network","The Emotional Network","The Communication Network","The Trust Network","The Power Network","The Autonomy Network","The Growth Network","The Friendship Network","The Ambition Network","The Friction Network","The Repair Network","Who Activates Whom","Where Roles Form","Where Alliances Form","Where Tensions Form","The Group's Shared Story","Individuality Inside the Group","The Contradictions","The Evidence We Can Actually Use","What the Network Cannot Tell Us","Accountability Across the Constellation","Healthy Boundaries","The Mature Group Pattern","Five Brutal Truths","The Constellation You Choose"]},
];

export const SYNASTRY_EXPANSION_REPORTS: ReportDefinition[] = SPECS.map((spec) => ({
  id: spec.id, title: spec.title, tagline: spec.tagline, icon: spec.icon, category: CATEGORY,
  adult: false, sections: spec.sections, targetWords: 5000,
  systemFraming: `${FRAMING(spec.premise)}\n\n${COMMON_ENDING}`,
  requiresPartner: true, minCharts: 2, maxCharts: 5,
  seoTitle: `${spec.title} | Multi-Chart Synastry | Cosmic Blueprint`,
  seoDescription: `${spec.tagline} A multi-chart Cosmic Blueprint reading grounded in calculated cross-chart aspects and house overlays.`,
  estimatedPages: 35, readingMinutes: 25, difficulty: "Masterwork",
}));
