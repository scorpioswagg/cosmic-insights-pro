import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  sendReadingBookingConfirmation,
  sendReadingBookingNotification,
} from "@/lib/email/service.server";

const BookingSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  readingType: z.string().min(1).max(80),
  preferredTimes: z.string().min(1).max(500),
  timezone: z.string().max(80).optional(),
  birthDate: z.string().max(40).optional(),
  partnerInfo: z.string().max(300).optional(),
  focus: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  hasReports: z.boolean().optional(),
});

export type ReadingBookingInput = z.infer<typeof BookingSchema>;

export const submitReadingBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BookingSchema.parse(data))
  .handler(async ({ data }) => {
    const notify = await sendReadingBookingNotification({
      name: data.name,
      email: data.email,
      readingType: data.readingType,
      preferredTimes: data.preferredTimes,
      timezone: data.timezone,
      birthDate: data.birthDate,
      partnerInfo: data.partnerInfo,
      focus: data.focus,
      notes: data.notes,
      hasReports: data.hasReports,
    });

    const confirm = await sendReadingBookingConfirmation({
      to: data.email,
      name: data.name,
      readingType: data.readingType,
      preferredTimes: data.preferredTimes,
    });

    if (!notify.ok && !confirm.ok) {
      throw new Error(
        notify.error || confirm.error || "Could not send booking emails. Please try again or email oracle@mycosmicblueprint.online directly.",
      );
    }

    return {
      ok: true as const,
      notifyOk: notify.ok,
      confirmOk: confirm.ok,
      message: confirm.ok
        ? "Request received. Check your inbox for a confirmation — we will reply within 1–2 business days."
        : "Request received on our end. Confirmation email could not be delivered; we will still contact you at the address you provided.",
    };
  });
