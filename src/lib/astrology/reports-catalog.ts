export interface ReportDefinition {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  category: "Core" | "Relationships" | "Growth" | "Timing" | "Vocation" | "Esoteric" | "Intimacy (18+)";
  /** Marks reports with mature/explicit sexual content. UI should gate behind an 18+ confirmation. */
  adult?: boolean;
  /** Sections the LLM must produce, in order. */
  sections: string[];
  /** Approx target length in words for the whole report. */
  targetWords: number;
  /** Specialized framing handed to the LLM. */
  systemFraming: string;
}

export const REPORTS: ReportDefinition[] = [
  {
    id: "natal-essence",
    title: "Natal Essence",
    tagline: "The complete portrait of your birth chart.",
    icon: "☉",
    category: "Core",
    targetWords: 1400,
    sections: [
      "Overview & Cosmic Signature",
      "The Big Three (Sun, Moon, Rising)",
      "Personal Planets (Mercury, Venus, Mars)",
      "Social & Generational Planets",
      "Elemental & Modality Balance",
      "Defining Aspects",
      "Integration & Path Forward",
    ],
    systemFraming:
      "You are writing a definitive natal interpretation. Focus on synthesis — how the placements weave into one coherent identity.",
  },
  {
    id: "soul-purpose",
    title: "Soul Purpose & Life Path",
    tagline: "Your karmic axis through the Lunar Nodes.",
    icon: "☊",
    category: "Esoteric",
    targetWords: 1100,
    sections: [
      "The Karmic Axis (North & South Node)",
      "Past-Life Imprint",
      "This Life's Direction",
      "Nodal Ruler & Its Story",
      "Aspects to the Nodes",
      "Practical Steps Toward the North Node",
    ],
    systemFraming:
      "Frame this through evolutionary astrology. Treat the South Node as inherited mastery and the North Node as unfamiliar growth.",
  },
  {
    id: "love-romance",
    title: "Love & Romance Blueprint",
    tagline: "Venus, Mars, the 5th & 7th houses, and your relational patterns.",
    icon: "♀",
    category: "Relationships",
    targetWords: 1200,
    sections: [
      "How You Love (Venus)",
      "How You Pursue & Desire (Mars)",
      "The Venus-Mars Dynamic",
      "Romance & Pleasure (5th House)",
      "Partnership Style (7th House & Descendant)",
      "Patterns to Honor and to Heal",
    ],
    systemFraming:
      "Write with warmth and psychological depth. Distinguish romantic style (Venus/5th) from committed partnership (7th).",
  },
  {
    id: "career-vocation",
    title: "Career & Vocation",
    tagline: "Midheaven, 10th house, and the work you were built for.",
    icon: "♃",
    category: "Vocation",
    targetWords: 1100,
    sections: [
      "Your Public Calling (Midheaven)",
      "The 10th House Story",
      "Saturn — Your Mastery Path",
      "Jupiter — Where You Expand",
      "Aptitudes from the 2nd & 6th Houses",
      "Recommended Fields & Modes of Work",
    ],
    systemFraming:
      "Be specific about career archetypes. Translate symbols into concrete vocational language.",
  },
  {
    id: "money-abundance",
    title: "Money & Abundance",
    tagline: "2nd house values, 8th house resources, Venus & Jupiter.",
    icon: "⊗",
    category: "Vocation",
    targetWords: 1000,
    sections: [
      "What You Value (2nd House)",
      "Shared Resources & Power (8th House)",
      "Venus — Your Magnetism",
      "Jupiter — Where Luck Flows",
      "Saturn's Lessons with Money",
      "Wealth-Building Strategy",
    ],
    systemFraming:
      "Combine practical financial framing with symbolic interpretation. Avoid fortune-telling; frame as patterns.",
  },
  {
    id: "shadow-work",
    title: "Shadow Work & Healing",
    tagline: "Pluto, Chiron, Lilith, and the 8th & 12th houses.",
    icon: "♇",
    category: "Growth",
    targetWords: 1200,
    sections: [
      "Pluto — The Transformative Wound",
      "Chiron — The Sacred Injury",
      "Lilith — The Exiled Power",
      "8th House Themes",
      "12th House Inheritance",
      "An Integration Practice",
    ],
    systemFraming:
      "Write with depth psychology vocabulary (Jung). Compassionate, never fatalistic.",
  },
  {
    id: "lunar-emotional",
    title: "Lunar & Emotional Body",
    tagline: "Moon sign, house, phase, and aspects.",
    icon: "☽",
    category: "Core",
    targetWords: 950,
    sections: [
      "Moon Sign — Your Inner Climate",
      "Moon House — Where You Need Nourishment",
      "Aspects to the Moon",
      "Mother & Family Imprint",
      "Self-Care Practices",
    ],
    systemFraming:
      "Tender, embodied tone. Center emotional truth and somatic awareness.",
  },
  {
    id: "mind-communication",
    title: "Mind & Communication",
    tagline: "Mercury, 3rd house, and how you think.",
    icon: "☿",
    category: "Core",
    targetWords: 900,
    sections: [
      "Mercury Sign — Your Cognitive Style",
      "Mercury House — Where You Focus",
      "Mercury Aspects",
      "The 3rd House — Learning & Voice",
      "Strengths & Blind Spots",
    ],
    systemFraming:
      "Clear, practical, intellectually engaged tone.",
  },
  {
    id: "saturn-return",
    title: "Saturn Return Map",
    tagline: "The maturity passage near ages 28–30 and 58–60.",
    icon: "♄",
    category: "Timing",
    targetWords: 1100,
    sections: [
      "Natal Saturn — The Architect",
      "Saturn's House & Aspects",
      "What the First Saturn Return Demands",
      "What the Second Saturn Return Demands",
      "Practices to Meet Saturn",
    ],
    systemFraming:
      "Grounded, slightly stoic tone. Treat Saturn as initiator into adulthood and elderhood.",
  },
  {
    id: "jupiter-expansion",
    title: "Jupiter — Your Field of Expansion",
    tagline: "Where you grow, teach, and find meaning.",
    icon: "♃",
    category: "Growth",
    targetWords: 900,
    sections: [
      "Jupiter Sign — Your Faith Style",
      "Jupiter House — Where You Expand",
      "Jupiter Aspects",
      "Cautions Against Excess",
      "How to Cooperate with Jupiter",
    ],
    systemFraming:
      "Optimistic but mature. Avoid empty positivity; ground in real chart factors.",
  },
  {
    id: "mars-drive",
    title: "Mars — Drive, Desire & Anger",
    tagline: "How you assert, pursue, and fight.",
    icon: "♂",
    category: "Growth",
    targetWords: 850,
    sections: [
      "Mars Sign — Your Action Style",
      "Mars House — Where You Fight For Life",
      "Mars Aspects",
      "Anger & Conflict Patterns",
      "Channeling Mars Productively",
    ],
    systemFraming:
      "Direct, energizing tone. Treat anger as information, not pathology.",
  },
  {
    id: "venus-love-language",
    title: "Venus — Aesthetics & Affection",
    tagline: "Beauty, pleasure, and the way you receive love.",
    icon: "♀",
    category: "Relationships",
    targetWords: 850,
    sections: [
      "Venus Sign — Your Love Language",
      "Venus House — Where Beauty Lives",
      "Venus Aspects",
      "Aesthetic Signature",
      "Pleasure Practices",
    ],
    systemFraming:
      "Sensual, refined, embodied tone.",
  },
  {
    id: "family-roots",
    title: "Family, Home & Roots",
    tagline: "IC, 4th house, Moon, and ancestral lineage.",
    icon: "⌂",
    category: "Relationships",
    targetWords: 1000,
    sections: [
      "The IC — Your Foundation",
      "4th House Story",
      "Moon — The Mothering Imprint",
      "Sun — The Fathering Imprint",
      "Ancestral Patterns Worth Composting",
    ],
    systemFraming:
      "Compassionate, lineage-aware. Acknowledge complexity of family without diagnosing.",
  },
  {
    id: "creative-expression",
    title: "Creative Expression & Joy",
    tagline: "Sun, 5th house, Venus, and the muse within.",
    icon: "★",
    category: "Growth",
    targetWords: 900,
    sections: [
      "The Sun — Your Creative Center",
      "5th House — The Playground",
      "Venus & The Aesthetic Eye",
      "Aspects That Free or Block Creativity",
      "Practices to Live in Play",
    ],
    systemFraming:
      "Alive, generative, encouraging tone — but anchored in chart specifics.",
  },
  {
    id: "spiritual-mystic",
    title: "Spiritual & Mystical Path",
    tagline: "12th house, Neptune, Pisces, and the unseen.",
    icon: "♆",
    category: "Esoteric",
    targetWords: 1100,
    sections: [
      "Neptune — The Dissolving Veil",
      "12th House — The Sanctuary",
      "Pisces Placements",
      "Mystical Aspects in Your Chart",
      "Practices That Match Your Spiritual Wiring",
    ],
    systemFraming:
      "Reverent, poetic, but grounded. Differentiate genuine mysticism from escapism.",
  },
  {
    id: "year-ahead",
    title: "Year Ahead Forecast",
    tagline: "Transits, progressions, and the year's defining storylines.",
    icon: "❍",
    category: "Timing",
    targetWords: 1300,
    sections: [
      "Opening Snapshot of the Year",
      "Outer-Planet Transits to Your Chart",
      "Jupiter & Saturn — Growth and Discipline",
      "Progressed Moon Phase",
      "Eclipse Season Themes",
      "Month-by-Month Highlights",
      "Guiding Practices for the Year",
    ],
    systemFraming:
      "Forecast tone — confident but non-deterministic. Frame transits as openings and invitations, never as fate.",
  },
  {
    id: "friendship-community",
    title: "Friendship & Community",
    tagline: "11th house, Uranus, and your chosen circle.",
    icon: "♒",
    category: "Relationships",
    targetWords: 900,
    sections: [
      "The 11th House — Your Tribe",
      "Uranus — The Outsider Signature",
      "Friendship Patterns Through Venus & Mercury",
      "Group Roles You Naturally Take",
      "How to Build Lasting Community",
    ],
    systemFraming:
      "Warm, social, modern tone. Honor both introverted and extroverted chart signatures.",
  },
  {
    id: "health-vitality",
    title: "Health & Vitality",
    tagline: "6th house, Mars, Sun, and your body's wisdom.",
    icon: "✚",
    category: "Growth",
    targetWords: 1000,
    sections: [
      "The 6th House — Daily Rhythm",
      "Sun — Core Vitality",
      "Mars — Physical Drive",
      "Stress Signatures in Your Chart",
      "Practices for Embodied Wellbeing",
    ],
    systemFraming:
      "Holistic, body-positive tone. Never diagnose; speak in terms of tendencies and supportive practices.",
  },
  {
    id: "intuition-psychic",
    title: "Intuition & Psychic Gifts",
    tagline: "Moon, Neptune, 8th & 12th houses, and the unseen senses.",
    icon: "👁",
    category: "Esoteric",
    targetWords: 1000,
    sections: [
      "Your Intuitive Channel (Moon & Neptune)",
      "Psychic Inheritance (12th House)",
      "Depth Perception (8th House)",
      "Aspects That Sharpen or Cloud Intuition",
      "Practices to Trust Your Inner Knowing",
    ],
    systemFraming:
      "Mystical yet grounded. Distinguish intuition from anxiety; honor lineage without making it spooky.",
  },
  {
    id: "manifestation-power",
    title: "Manifestation & Personal Power",
    tagline: "Sun, Mars, Pluto, 1st & 10th houses — your engine of becoming.",
    icon: "✦",
    category: "Growth",
    targetWords: 1100,
    sections: [
      "The Sun — Your Will",
      "Mars — Your Engine",
      "Pluto — Deep Transformation",
      "The Ascendant — How You Enter Rooms",
      "The Midheaven — Your Visible Becoming",
      "A Manifestation Protocol Built From Your Chart",
    ],
    systemFraming:
      "Empowering, modern, ritual-aware tone. Anchor every claim in chart specifics — never generic law-of-attraction.",
  },
  {
    id: "inner-child",
    title: "Inner Child & Emotional Origins",
    tagline: "Moon, IC, 4th house, and the formative years that still shape you.",
    icon: "✿",
    category: "Growth",
    targetWords: 1200,
    sections: [
      "The Emotional Climate You Were Born Into",
      "Moon — The Child Self Still Listening",
      "IC & 4th House — The Inner Home",
      "Wounds Carried Forward (Chiron Touchpoints)",
      "Reparenting Practices Tailored to Your Chart",
      "Restoring Wonder and Safety",
    ],
    systemFraming:
      "Tender, trauma-informed, never pathologizing. Speak to the reader as both the adult and the child within.",
  },
  {
    id: "attachment-style",
    title: "Attachment Style & Intimacy Patterns",
    tagline: "Moon, Venus, 4th, 7th & 8th houses — how you bond, withdraw, and trust.",
    icon: "∞",
    category: "Relationships",
    targetWords: 1300,
    sections: [
      "Your Core Attachment Signature",
      "Moon — The Safety Blueprint",
      "Venus — How You Receive Closeness",
      "7th House — What You Project Onto Partners",
      "8th House — Trust, Merging, and Power",
      "Triggers, Ruptures, and Repair",
      "Building Secure Attachment Through Your Chart",
    ],
    systemFraming:
      "Blend attachment theory (secure, anxious, avoidant, disorganized) with astrology. Compassionate, never diagnostic.",
  },
  {
    id: "grief-loss",
    title: "Grief, Loss & Letting Go",
    tagline: "Saturn, Pluto, 8th & 12th houses — the alchemy of endings.",
    icon: "❀",
    category: "Growth",
    targetWords: 1100,
    sections: [
      "How Your Chart Metabolizes Loss",
      "Saturn — The Weight You Learn to Carry",
      "Pluto — Death and Rebirth Cycles",
      "8th House — What Must Be Surrendered",
      "12th House — Hidden Grief and Ancestral Sorrow",
      "Rituals of Release Designed for You",
    ],
    systemFraming:
      "Reverent, unhurried, deeply compassionate. Honor grief as sacred work; offer no spiritual bypass.",
  },
  {
    id: "self-worth",
    title: "Self-Worth & Inner Authority",
    tagline: "Sun, 2nd house, Saturn, and the voice that names your value.",
    icon: "❖",
    category: "Growth",
    targetWords: 1000,
    sections: [
      "The Sun — Your Right to Take Up Space",
      "2nd House — What You Believe You Deserve",
      "Saturn — The Inner Critic and Inner Elder",
      "Aspects That Inflate or Deflate Self-Worth",
      "Reclaiming Authority From Internalized Voices",
      "Daily Practices to Anchor Worth",
    ],
    systemFraming:
      "Direct, empowering, psychologically literate. Distinguish ego from authentic self-worth.",
  },
  {
    id: "boundaries-energy",
    title: "Boundaries & Energetic Sovereignty",
    tagline: "Ascendant, Saturn, 1st & 12th houses — where you end and others begin.",
    icon: "◈",
    category: "Growth",
    targetWords: 1000,
    sections: [
      "Your Energetic Skin (Ascendant & 1st House)",
      "Saturn — The Architect of Healthy Limits",
      "12th House — Where Boundaries Dissolve",
      "Patterns of Over-Giving or Over-Guarding",
      "Scripts and Practices for Sovereign Boundaries",
    ],
    systemFraming:
      "Grounded, body-aware. Frame boundaries as care, not walls.",
  },
  {
    id: "purpose-meaning",
    title: "Purpose, Meaning & the Sacred Yes",
    tagline: "Sun, North Node, Jupiter, Midheaven — what your life is for.",
    icon: "☼",
    category: "Esoteric",
    targetWords: 1300,
    sections: [
      "The Question Your Life Is Asking",
      "Sun — The Light You Came to Shine",
      "North Node — The Direction of Becoming",
      "Jupiter — Where Meaning Multiplies",
      "Midheaven — Your Visible Contribution",
      "Cross-Confirmations Across the Chart",
      "Living the Sacred Yes",
    ],
    systemFraming:
      "Soulful, integrative, and specific. Synthesize multiple chart factors into one coherent thread of purpose.",
  },
  {
    id: "fears-anxieties",
    title: "Fears, Anxieties & the Nervous System",
    tagline: "Moon, Mercury, Saturn, 12th house — the inner weather of fear.",
    icon: "☁",
    category: "Growth",
    targetWords: 1100,
    sections: [
      "Your Baseline Nervous System (Moon)",
      "Mercury — The Worrying Mind",
      "Saturn — Fear as Teacher",
      "12th House — Inherited and Unconscious Fears",
      "Aspects That Heighten or Soothe Anxiety",
      "Regulation Practices Matched to Your Chart",
    ],
    systemFraming:
      "Nervous-system literate (polyvagal aware), compassionate, practical. Never minimize, never catastrophize.",
  },
  {
    id: "ancestral-lineage",
    title: "Ancestral Lineage & Karmic Inheritance",
    tagline: "Moon, IC, 4th, 8th & 12th houses, South Node — the rivers behind you.",
    icon: "⚭",
    category: "Esoteric",
    targetWords: 1300,
    sections: [
      "The Maternal Line (Moon & IC)",
      "The Paternal Line (Sun & MC)",
      "8th House — Inherited Power and Secrets",
      "12th House — Unspoken Family Currents",
      "South Node — Karmic Patterns Carried Forward",
      "Gifts to Claim, Patterns to Compost",
    ],
    systemFraming:
      "Lineage-aware, reverent, non-deterministic. Honor ancestors without romanticizing or blaming them.",
  },
  {
    id: "midlife-passage",
    title: "Midlife Passage & Soul Reawakening",
    tagline: "Uranus opposition, Neptune square, Pluto square — the great turning.",
    icon: "✺",
    category: "Timing",
    targetWords: 1200,
    sections: [
      "The Architecture of Midlife (Ages 38–45)",
      "Uranus Opposition — The Authentic Self Returns",
      "Neptune Square — Disillusionment as Doorway",
      "Pluto Square — Power Reclaimed",
      "Themes Specific to Your Natal Chart",
      "How to Move Through the Passage With Grace",
    ],
    systemFraming:
      "Mature, mythic, encouraging. Treat midlife as initiation rather than crisis.",
  },
  {
    id: "dreams-subconscious",
    title: "Dreams, Symbols & the Subconscious",
    tagline: "Moon, Neptune, 12th house — the inner theater after dark.",
    icon: "☾",
    category: "Esoteric",
    targetWords: 1000,
    sections: [
      "Your Dreaming Signature (Moon & Neptune)",
      "12th House — The Threshold of the Unconscious",
      "Recurring Symbols Likely in Your Inner World",
      "Aspects That Open or Block Dream Recall",
      "A Dreamwork Practice Built for You",
    ],
    systemFraming:
      "Dreamy yet precise. Weave Jungian symbolism with astrological specificity.",
  },
  {
    id: "identity-becoming",
    title: "Identity, Persona & Becoming",
    tagline: "Ascendant, Sun, Moon, and the masks you wear and shed.",
    icon: "◉",
    category: "Core",
    targetWords: 1200,
    sections: [
      "The Mask (Ascendant) vs the Core (Sun)",
      "The Inner Self (Moon) Beneath Both",
      "Where Persona and Essence Conflict",
      "Identity Shifts You're Wired to Move Through",
      "Becoming Whole — Integration Practices",
    ],
    systemFraming:
      "Psychologically literate, identity-aware, expansive about gender and selfhood.",
  },
  {
    id: "trauma-resilience",
    title: "Trauma Patterns & Resilience",
    tagline: "Chiron, Pluto, Saturn, 8th & 12th houses — wound and recovery.",
    icon: "✜",
    category: "Growth",
    targetWords: 1300,
    sections: [
      "How Your Chart Encodes Wounding (Without Determinism)",
      "Chiron — The Wound That Becomes the Gift",
      "Pluto — Survival Intelligence",
      "Saturn — Structure as Safety",
      "8th & 12th Houses — The Hidden Layers",
      "Resilience Resources Already in Your Chart",
      "A Trauma-Informed Path Forward",
    ],
    systemFraming:
      "Trauma-informed, never diagnostic, always agency-respecting. Reference the body and somatic awareness.",
  },
];

export function getReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}