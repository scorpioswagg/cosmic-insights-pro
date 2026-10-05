import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const EVENT_BIRTHDAY = "contact.birthday";
const EVENT_INACTIVE = "user.inactive";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service-role configuration is missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function firstName(displayName: string | null | undefined, email: string) {
  const value = displayName?.trim() || email.split("@")[0] || "friend";
  return value.split(/\s+/)[0] || "friend";
}

async function sendEvent(
  resend: Resend,
  event: string,
  email: string,
  payload: Record<string, string | number>,
) {
  const { error } = await resend.events.send({ event, email, payload });
  if (error) throw new Error(error.message ?? `Resend event failed: ${event}`);
}

export default async () => {
  const db = adminClient();
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY is missing");

  const resend = new Resend(resendKey);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonthDay = today.slice(5);
  let birthdaySent = 0;
  let inactiveSent = 0;
  let errors = 0;

  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id,birth_date,display_name,birthday_event_sent_on,inactive_event_sent_at");

  if (profileError) throw new Error(profileError.message);

  const profileByUser = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);

    for (const user of data.users) {
      if (!user.email || user.is_anonymous) continue;

      const profile = profileByUser.get(user.id);

      // Birthday automation: one event per user per calendar year.
      if (profile?.birth_date?.slice(5) === currentMonthDay &&
          profile.birthday_event_sent_on !== today) {
        try {
          await sendEvent(resend, EVENT_BIRTHDAY, user.email, {
            firstName: firstName(profile.display_name, user.email),
            birthday: today,
          });

          await db.from("profiles").update({
            birthday_event_sent_on: today,
          }).eq("id", user.id);

          birthdaySent++;
        } catch (error) {
          errors++;
          console.error("[cosmic-lifecycle] birthday event failed", {
            userId: user.id,
            error,
          });
        }
      }

      // Re-engagement automation: fire once after the user crosses 30 days
      // inactive, then allow a new event after their next sign-in.
      const activityIso = user.last_sign_in_at ?? user.created_at;
      if (!activityIso) continue;

      const activity = new Date(activityIso);
      const daysInactive = Math.floor(
        (now.getTime() - activity.getTime()) / 86_400_000,
      );

      const lastInactiveSent = profile?.inactive_event_sent_at
        ? new Date(profile.inactive_event_sent_at)
        : null;

      if (daysInactive >= 30 &&
          (!lastInactiveSent || lastInactiveSent < activity)) {
        try {
          await sendEvent(resend, EVENT_INACTIVE, user.email, {
            daysInactive,
          });

          await db.from("profiles").update({
            inactive_event_sent_at: now.toISOString(),
          }).eq("id", user.id);

          inactiveSent++;
        } catch (error) {
          errors++;
          console.error("[cosmic-lifecycle] inactive event failed", {
            userId: user.id,
            error,
          });
        }
      }
    }

    if (data.users.length < 1000) break;
  }

  console.log("[cosmic-lifecycle] completed", {
    ranAt: now.toISOString(),
    birthdaySent,
    inactiveSent,
    errors,
  });
};

export const config = {
  schedule: "15 8 * * *",
};
