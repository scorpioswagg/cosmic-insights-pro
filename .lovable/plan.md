# Verify The Brutal Blueprint™ end to end

Goal: actually generate the report from a real birth chart, then confirm all 31 chapters survive into the finished PDF — no truncation, no missing chapters.

## What I'll do

1. Generate a real chart (a fixed sample birth date, time, and place) and run the full Brutal Blueprint generation, both writing passes, exactly as the live app does.
2. Count the chapter headings in the generated text and compare them, in order, against the 31 required chapter titles.
3. Build the luxury PDF from that report and check the finished file: page count, table of contents entries, and that the last chapter and closing verdict are present on the final pages.
4. Visually inspect a sample of pages (cover, contents, a mid chapter, the last chapter) to confirm nothing is clipped or overlapping.
5. Report the results: chapters found vs. expected, word count, page count, and any chapter that came back thin or missing.

## If chapters are missing or short

Rather than accept a partial result, I'll strengthen generation so completeness is enforced:

- Split the writing into three passes instead of two, so each pass carries fewer chapters.
- After generation, check which required chapter headings are absent and run one targeted repair pass that writes only the missing chapters, then merge them back in order.
- Keep the existing evidence and tone rules unchanged.

## Technical notes

- Test harness runs the existing `generateReportMarkdown` directly with a fixed chart, bypassing the paywall and sign-in, so nothing about pricing or access changes.
- Chapter completeness check: parse `## ` headings from the markdown and diff against `sections` in the report catalog.
- PDF verification uses the existing `buildLuxuryReportPdfBytes`, then renders pages to images for inspection.
- Any completeness/repair logic would live in `src/lib/astrology/generate-report-core.server.ts` only.
- Note: each full run makes real AI calls and takes a few minutes.
