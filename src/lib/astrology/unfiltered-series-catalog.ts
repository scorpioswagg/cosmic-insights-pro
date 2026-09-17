import type { ReportDefinition } from "./reports-catalog-base";

/**
 * Production catalog specification for the Unfiltered Series.
 * The first three entries are the original flagship reports; the remaining
 * fifteen are the requested additions. The merge wrapper de-duplicates IDs
 * so this remains safe if any original entries already exist in the base catalog.
 */

const COMMON_CHAPTERS = [
  "Opening the File: How to Read This Report",
  "The Core Pattern: What the Chart Actually Shows",
  "Self-Image vs. Observable Pattern",
  "The Mask, Persona, and First Impression",
  "What You May Prefer Not to Notice",
  "Primary Pressure Points",
  "The Pattern at Full Volume",
  "The Shadow Expression",
  "Default Defense Mechanisms",
  "How the Pattern Repeats",
  "What Other People May Experience",
  "Control, Autonomy, and Power",
  "Fear, Insecurity, and Vulnerability",
  "Desire, Attachment, and Pull",
  "When You Are Triggered",
  "Communication Under Pressure",
  "Conflict and Escalation",
  "Boundaries and Responsibility",
  "Relationship Consequences",
  "Work, Ambition, and Output",
  "Money, Value, and Exchange",
  "The Contradiction Test",
  "The Story You Tell Yourself",
  "What You May Blame Outside Yourself",
  "The Conversation You Need to Have",
  "Strength Without Flattery",
  "Turning Shadow Into Skill",
  "The Cost of Staying the Same",
  "The Mature Expression",
  "Five Brutal Truths",
  "Final Verdict and Cosmic Reality Check",
] as const;

const NATAL_FRAMING = (focus: string) =>
  `UNFILTERED SERIES / NATAL. Write an intensely candid, psychologically penetrating astrological interpretation focused on ${focus}. Use only calculated natal-chart evidence: exact placements, signs, houses, degrees, and defined aspects. Never invent birth data, events, memories, diagnoses, motives, trauma, crimes, or relationship history. For every difficult claim distinguish chart evidence, astrological interpretation, behavioral possibility, shadow manifestation, and mature manifestation. Use language such as “this may suggest,” “this can manifest as,” and “under pressure, this pattern may become.” Never diagnose or declare a person inherently abusive, dangerous, narcissistic, sociopathic, mentally ill, or destined to behave a certain way. Aggressively test contradictions such as self-image versus impact, independence versus avoidance, confidence versus ego, standards versus perfectionism, passion versus obsession, and loyalty versus possessiveness. For each major pattern identify the signature, conventional symbolism, healthy expression, shadow expression, real-world effects, an uncomfortable question, and a mature path. Strengths must be honest and must explain how overuse can become a liability. End with exactly five concise Brutal Truths, a transformation-oriented close, and the exact final sentence: “Your chart does not give you an excuse. It gives you a mirror.” This is symbolic astrology, not scientific diagnosis or factual mind-reading.`;

const SYNASTRY_FRAMING = (focus: string) =>
  `UNFILTERED SERIES / SYNASTRY. Write an intensely candid, psychologically penetrating two-chart interpretation focused on ${focus}. Use only calculated evidence from both charts: exact placements, signs, houses, degrees, mutual aspects, and verified A→B and B→A house overlays. A→B overlays must use Person B’s houses; B→A overlays must use Person A’s houses. Never invent birth data, events, memories, motives, diagnoses, trauma, crimes, or relationship history. Clearly label chart evidence, astrological interpretation, behavioral possibility, shadow manifestation, and mature manifestation. Treat attraction, conflict, power, familiarity, and “karmic” symbolism as interpretive possibilities, never proof of destiny, permanence, cheating, abuse, or inevitable breakup/reunion. Examine both people symmetrically and avoid assigning blame from astrology. For each major dynamic identify the exact signature, conventional symbolism, constructive expression, shadow expression, effects on communication/intimacy/conflict/trust, an uncomfortable question, and a repair or sovereignty path. End with exactly five concise Brutal Truths, a transformation-oriented close, and the exact final sentence: “Your chart does not give you an excuse. It gives you a mirror.” This is symbolic astrology, not scientific diagnosis or factual mind-reading.`;

function chapters(extra: string[]): string[] {
  return COMMON_CHAPTERS.map((chapter, index) => {
    const additions: Record<number, string> = {
      0: extra[0] ?? "",
      1: extra[1] ?? "",
      5: extra[2] ?? "",
      10: extra[3] ?? "",
      19: extra[4] ?? "",
      25: extra[5] ?? "",
      28: extra[6] ?? "",
    };
    const addition = additions[index];
    return addition ? `${chapter} — ${addition}` : chapter;
  });
}

const make = (
  id: string,
  title: string,
  tagline: string,
  icon: string,
  focus: string,
  extra: string[],
  synastry = false,
): ReportDefinition => ({
  id,
  title,
  tagline,
  icon,
  category: "Unfiltered Series",
  adult: false,
  sections: chapters(extra),
  targetWords: 5000,
  systemFraming: synastry ? SYNASTRY_FRAMING(focus) : NATAL_FRAMING(focus),
});

export const UNFILTERED_SERIES_REPORTS: ReportDefinition[] = [
  make("the-brutal-blueprint", "THE BRUTAL BLUEPRINT™", "The astrology report that tells you what everyone else is too afraid to say.", "☠", "personality, contradictions, blind spots, shadow traits, relationship red flags, self-sabotage, accountability, power dynamics, and mature expression", ["the brutal orientation", "the person beneath the performance", "your pressure points", "the impact others may feel", "work and ambition", "strengths without flattery", "the mature version of you"]),
  make("the-unspoken-contract", "THE UNSPOKEN CONTRACT™", "The brutally honest truth about how you actually love people.", "⚭", "relational dynamics, promises versus delivery, unspoken agreements, desire, hurt, conflict, exits, partner fears, and mature partnership", ["the relationship contract", "how you actually bond", "where intimacy gets difficult", "what partners may experience", "work and commitment spillover", "what love asks you to own", "mature partnership"]),
  make("the-ambition-autopsy", "THE AMBITION AUTOPSY™", "Why you haven’t gotten where you said you’d be.", "⚒", "stated goals versus actual behavior, procrastination, perfectionism, money avoidance, envy, comparison, status, quitting patterns, self-image, and mature output", ["the ambition autopsy", "the goal beneath the goal", "your friction with execution", "how your behavior affects collaborators", "career and output", "the work ethic beneath the image", "mature achievement"]),
  make("the-self-sabotage-file", "THE SELF-SABOTAGE FILE™", "You already know what you're doing. This report explains why you keep doing it.", "⚠", "self-sabotage, avoidance, fear, perfectionism, procrastination, emotional defense, repetition, self-trust, and accountability", ["the sabotage signature", "the hidden payoff of avoidance", "the fear underneath the stall", "how your cycles affect others", "where execution breaks", "the skill hidden inside the sabotage", "a replacement pattern"]),
  make("the-mirror-you-avoid", "THE MIRROR YOU AVOID™", "The version of you that exists when nobody is watching.", "◉", "self-image, private impulses, persona, hidden needs, image management, authenticity, and identity integration", ["the private mirror", "persona versus essence", "the identity you protect", "the impression you leave", "public identity and performance", "the truth beneath presentation", "integrated identity"]),
  make("the-shadow-ledger", "THE SHADOW LEDGER™", "Every strength has a bill. This report shows you the balance.", "♇", "strengths and their hidden costs, overuse, compensation, shadow expressions, consequences, and responsible power", ["the strength inventory", "the price of your gifts", "where excellence becomes excess", "the cost others may absorb", "the performance tax", "power without self-flattery", "balanced mastery"]),
  make("the-inner-courtroom", "THE INNER COURTROOM™", "The prosecution has evidence. The defense has excuses. You get to hear both.", "⚖", "self-accusation, defense mechanisms, evidence, excuses, contradictions, accountability, and a fairer inner standard", ["the case against you", "the defense strategy", "the evidence in the chart", "the witnesses around you", "the work record", "a fair cross-examination", "the verdict you can change"]),
  make("the-pattern-that-wont-die", "THE PATTERN THAT WON'T DIE™", "Different people. Different circumstances. Same damn pattern.", "⟳", "repetition, triggers, recurring relational and work patterns, familiar pain, reinforcement loops, interruption, and redesign", ["the repeating loop", "why familiar patterns feel safe", "the trigger sequence", "how repetition lands on others", "where the loop hits your work", "the interruption point", "the redesigned pattern"]),
  make("the-relationship-crime-scene", "THE RELATIONSHIP CRIME SCENE™", "Something happened between you. Your charts may explain what.", "⚯", "mutual attraction, emotional activation, house overlays, aspects, friction, power, communication, repair, and relational responsibility", ["the scene reconstruction", "the first activation", "the pressure signature", "what each person may experience", "the practical relationship", "the evidence both charts provide", "repair without assigning blame"], true),
  make("the-chemistry-autopsy", "THE CHEMISTRY AUTOPSY™", "Why does this person get under your skin?", "⚗", "attraction, fascination, emotional charge, romantic and sexual symbolism, projection, friction, intensity, and grounded choice", ["the chemistry signature", "what activates first", "the emotional charge", "how attraction may be experienced by each person", "how chemistry affects real-life functioning", "what is chemistry versus projection", "conscious choice"] , true),
  make("the-power-struggle", "THE POWER STRUGGLE™", "Who pulls the strings—and what happens when neither of you lets go?", "♜", "control, autonomy, influence, authority, vulnerability, competition, negotiation, mutual empowerment, and repair", ["the power map", "who activates whose defenses", "control and autonomy", "where each person feels constrained", "shared goals and competition", "negotiating power without domination", "mutual empowerment"], true),
  make("the-unfinished-business", "THE UNFINISHED BUSINESS™", "Some connections feel bigger than the amount of time you've known each other.", "∞", "familiarity, recurring themes, unresolved tension, nodal symbolism, growth, projection, attachment, and sovereignty without destiny claims", ["the familiarity signature", "why this connection may feel significant", "the unresolved thread", "how significance can be experienced by each person", "real-world growth implications", "symbolism without destiny claims", "sovereignty and choice"], true),
  make("the-attraction-trap", "THE ATTRACTION TRAP™", "The person you can't stop wanting may be activating the exact thing you need to understand.", "♥", "desire, projection, activation, idealization, chemistry, unmet needs, boundaries, discernment, and conscious relating", ["the attraction mechanism", "the need beneath desire", "projection and idealization", "what the other person may feel", "how desire changes decisions", "discernment over compulsion", "conscious relating"], true),
  make("the-things-we-wont-say", "THE THINGS WE WON'T SAY™", "The conversation happening underneath the conversation.", "☿", "communication, avoidance, assumptions, indirect expression, silence, vulnerability, conflict, listening, and honest dialogue", ["the unsaid message", "how each person processes words", "avoidance signatures", "what silence may communicate", "communication at work and home", "the truth that needs language", "a better conversation"], true),
  make("the-breaking-point", "THE BREAKING POINT™", "Every connection has a pressure limit. Find yours before you reach it.", "◈", "relational pressure, escalation, triggers, rupture, repair, boundaries, conflict cycles, resilience, and non-deterministic choices", ["the pressure system", "the first crack", "what raises the temperature", "how each person responds under pressure", "pressure in shared responsibilities", "repair before rupture", "resilience and choice"], true),
  make("the-identity-collapse", "THE IDENTITY COLLAPSE™", "What happens when the person you built isn't the person you're becoming?", "◇", "identity transitions, outdated self-concepts, reinvention, grief, authenticity, social roles, and coherent becoming", ["the identity architecture", "the self that has expired", "grief in reinvention", "how others may react to your change", "career identity and reinvention", "authenticity over performance", "coherent becoming"]),
  make("the-excuse-machine", "THE EXCUSE MACHINE™", "Your reasons may be real. They may also be protecting you.", "⚙", "rationalization, blame, delay, avoidance, protective stories, accountability, action, and replacing excuses with experiments", ["the excuse architecture", "the reason behind the reason", "where delay protects you", "how excuses affect other people", "the cost to execution", "accountability without shame", "experiments instead of excuses"]),
  make("the-power-bill", "THE POWER BILL™", "You asked for power. Here's what it's going to cost you.", "♜", "ambition, influence, authority, leadership, control, responsibility, consequences, stewardship, and mature power", ["the power signature", "what authority means to you", "the temptation of control", "how your power is experienced by others", "leadership and responsibility", "power with stewardship", "mature authority"]),
];

export const UNFILTERED_SERIES_PRICE_CENTS = 9900;
export const UNFILTERED_SERIES_CATEGORY = "Unfiltered Series" as const;
export const UNFILTERED_SERIES_TARGET_WORDS = 5000;
