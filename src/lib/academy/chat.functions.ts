import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { resolveWritingModel, whichWritingProvider } from "@/lib/ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  question: z.string().min(1).max(1000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(12)
    .optional(),
});

export const askAcademy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Unauthorized: please sign in with Google to use the tutor.");
    }

    const provider = whichWritingProvider();
    if (!provider) {
      throw new Error(
        "Tutor AI is not configured. Set GEMINI_API_KEY or GROQ_API_KEY in project secrets, then redeploy.",
      );
    }

    const model = resolveWritingModel();

    const system = `You are the Cosmic Blueprint Academy assistant — a warm, plainspoken astrology tutor for absolute beginners.

RULES:
- Always answer in plain English. Define any astrology term the first time you use it.
- Keep answers under 180 words unless asked for depth. Short paragraphs or a tight bulleted list.
- Tropical zodiac, Placidus houses, geocentric Western astrology.
- Never invent a user's chart placements. If asked about "my" chart and you don't have it, say so and point them to the natal calculator on the home page.
- Never give medical, legal, or financial directives. Astrology describes patterns, not prescriptions.
- When asked about booking a reading, point them to the Book a Reading section on the Academy page and tell them to email kyle.merritt@mycosmicblueprint.online with preferred dates and report titles.
- No emojis. Use markdown sparingly (bold for key terms only).`;

    const history = (data.history ?? [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    const prompt = history
      ? `${history}\n\nUSER: ${data.question}\n\nASSISTANT:`
      : `USER: ${data.question}\n\nASSISTANT:`;

    try {
      const { text } = await generateText({
        model,
        system,
        prompt,
      });
      return {
        answer: text,
        provider,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/payment required|402/i.test(msg)) {
        throw new Error(
          "Tutor AI balance is exhausted. Set GEMINI_API_KEY or GROQ_API_KEY in project secrets to use your own provider.",
        );
      }
      throw new Error(msg || "Tutor could not answer right now. Try again in a moment.");
    }
  });
