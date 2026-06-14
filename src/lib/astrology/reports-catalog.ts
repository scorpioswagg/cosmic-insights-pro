export interface ReportDefinition {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  category: "Core" | "Relationships" | "Growth" | "Timing" | "Vocation" | "Esoteric";
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
];

export function getReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}