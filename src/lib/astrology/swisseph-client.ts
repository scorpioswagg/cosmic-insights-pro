/**
 * Client-only Swiss Ephemeris wrapper.
 *
 * Runs in the browser. Loads swisseph.wasm + swisseph.data from /wasm/.
 * Uses SEFLG_SWIEPH (with embedded ephemeris files for 1800-2400).
 *
 * NEVER imported by server code. NEVER falls back to fake data — if the
 * WASM module fails to load, every public method throws.
 */
import type {
  BirthInput, BodyPosition, BodyName, ChartCalculation,
} from "./types";
import { signFromLongitude, normalizeDeg, houseOf, calculateAspects } from "./zodiac";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let swePromise: Promise<any> | null = null;

async function getSwe() {
  if (typeof window === "undefined") {
    throw new Error("Swiss Ephemeris must be calculated in the browser.");
  }
  if (!swePromise) {
    swePromise = (async () => {
      const mod = await import("swisseph-wasm");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SwissEph: any = (mod as any).default ?? mod;
      const swe = new SwissEph();
      // Override file locations so emscripten fetches from /wasm/ instead of
      // resolving against the bundled module URL inside node_modules.
      const originalInit = swe.initSwissEph.bind(swe);
      swe.initSwissEph = async function patchedInit() {
        // Monkey-patch by setting a stub configuration before calling original
        // — original ignores prior moduleConfig, so we replicate it here.
        const wasmMod = await import("swisseph-wasm/wasm/swisseph.js" as string);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const WasmSwissEph: any = (wasmMod as any).default ?? wasmMod;
        const moduleConfig = {
          locateFile: (path: string) => {
            if (path.endsWith(".data") || path.endsWith(".wasm")) {
              return `/wasm/${path}`;
            }
            return path;
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (swe as any).SweModule = await WasmSwissEph(moduleConfig);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Mod = (swe as any).SweModule;
        if (!Mod.HEAP32) Mod.HEAP32 = new Int32Array(Mod.HEAPF64.buffer);
        swe.set_ephe_path("sweph");
      };
      // If the default init works (browser path), great; otherwise fall back
      // to our patched version.
      try {
        await originalInit();
      } catch {
        await swe.initSwissEph();
      }
      return swe;
    })();
  }
  return swePromise;
}

const PLANET_IDS: Array<{ id: number; name: BodyName }> = [
  { id: 0, name: "Sun" },
  { id: 1, name: "Moon" },
  { id: 2, name: "Mercury" },
  { id: 3, name: "Venus" },
  { id: 4, name: "Mars" },
  { id: 5, name: "Jupiter" },
  { id: 6, name: "Saturn" },
  { id: 7, name: "Uranus" },
  { id: 8, name: "Neptune" },
  { id: 9, name: "Pluto" },
  { id: 15, name: "Chiron" },
  { id: 11, name: "North Node" }, // true node
  { id: 13, name: "Lilith" },     // mean apogee (Black Moon Lilith - oscillating not requested)
];

const SEFLG_SWIEPH = 2;
const SEFLG_SPEED = 256;
const FLAGS = SEFLG_SWIEPH | SEFLG_SPEED;

export async function calculateChart(input: BirthInput): Promise<ChartCalculation> {
  const swe = await getSwe();

  // Local civil time -> UT
  const [y, m, d] = input.date.split("-").map(Number);
  const [hh, mm] = input.time.split(":").map(Number);
  const utHour = hh + mm / 60 - input.tzOffsetHours;

  const jd: number = swe.julday(y, m, d, utHour);
  const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0) + (utHour * 3600 * 1000);
  const utcIso = new Date(utcMs).toISOString();

  const bodies: BodyPosition[] = [];

  for (const { id, name } of PLANET_IDS) {
    try {
      const res = swe.calc(jd, id, FLAGS);
      const lon = normalizeDeg(res.longitude);
      const { sign, degree } = signFromLongitude(lon);
      bodies.push({
        name,
        longitude: lon,
        latitude: res.latitude,
        distance: res.distance,
        speed: res.longitudeSpeed,
        sign, signDegree: degree,
        retrograde: res.longitudeSpeed < 0 && name !== "North Node" && name !== "South Node",
      });
    } catch (err) {
      throw new Error(`Swiss Ephemeris failed for ${name}: ${(err as Error).message}`);
    }
  }

  // South Node = North Node + 180
  const nn = bodies.find((b) => b.name === "North Node");
  if (nn) {
    const slon = normalizeDeg(nn.longitude + 180);
    const { sign, degree } = signFromLongitude(slon);
    bodies.push({
      name: "South Node",
      longitude: slon, latitude: -nn.latitude, distance: nn.distance,
      speed: nn.speed, sign, signDegree: degree, retrograde: nn.retrograde,
    });
  }

  // Houses (Placidus)
  const housesRes = swe.houses(jd, input.latitude, input.longitude, "P");
  const cusps12 = Array.from(housesRes.cusps as Float64Array).slice(1, 13).map(normalizeDeg);
  const ascendant = normalizeDeg(housesRes.ascmc[0]);
  const midheaven = normalizeDeg(housesRes.ascmc[1]);
  const vertex = normalizeDeg(housesRes.ascmc[3]);

  // Part of Fortune (day formula: ASC + Moon - Sun; night formula flips Moon/Sun).
  const sun = bodies.find((b) => b.name === "Sun")!;
  const moon = bodies.find((b) => b.name === "Moon")!;
  // Determine day birth: Sun above horizon (houses 7..12)
  const sunHouse = houseOf(sun.longitude, cusps12);
  const isDay = sunHouse >= 7;
  const pof = normalizeDeg(
    isDay
      ? ascendant + moon.longitude - sun.longitude
      : ascendant + sun.longitude - moon.longitude,
  );

  // Add ASC, MC, Vertex, Part of Fortune as bodies (no speed)
  for (const [name, lon] of [
    ["Ascendant", ascendant],
    ["Midheaven", midheaven],
    ["Vertex", vertex],
    ["Part of Fortune", pof],
  ] as Array<[BodyName, number]>) {
    const { sign, degree } = signFromLongitude(lon);
    bodies.push({
      name, longitude: lon, latitude: 0, distance: 0, speed: 0,
      sign, signDegree: degree, retrograde: false,
    });
  }

  // Assign houses to every body
  for (const b of bodies) {
    b.house = houseOf(b.longitude, cusps12);
  }

  const aspects = calculateAspects(bodies);

  let version = "unknown";
  try { version = swe.version(); } catch { /* ignore */ }

  return {
    input,
    julianDayUT: jd,
    utcIso,
    bodies,
    houses: cusps12,
    ascendant, midheaven, vertex, partOfFortune: pof,
    aspects,
    engine: {
      name: "Swiss Ephemeris (WASM)",
      version,
      flagsUsed: FLAGS,
      houseSystem: "Placidus",
      zodiac: "Tropical",
      calculatedAt: new Date().toISOString(),
    },
  };
}