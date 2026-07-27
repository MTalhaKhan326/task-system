import { createAdminClient } from "@/lib/supabase/admin";
import { getMailTransporter, EMAIL_FROM_ADDRESS } from "./mailer";
import { renderTemplate, type EventType, type EventData } from "./templates";

type NotifyParams<T extends EventType> = {
  eventType: T;
  taskId: string;
  actorId: string;
  recipientId: string;
  data: EventData[T];
};

/**
 * Sends one notification email and logs the outcome to `notifications`.
 * Uses the secret-key client throughout (both the actor/recipient lookup
 * and the log insert) rather than whichever session triggered the
 * calling route — members and admins have different RLS visibility into
 * `members`, and this is a system-generated side effect of the mutation,
 * not something that should depend on the caller's own read access.
 *
 * Never throws: an inner try/catch around the SMTP send captures the
 * send outcome for the log row, and an outer try/catch guarantees this
 * function can't fail the mutation that triggered it, even if the
 * lookup or the log insert itself goes wrong.
 */
export async function notify<T extends EventType>(params: NotifyParams<T>) {
  const { eventType, taskId, actorId, recipientId, data } = params;

  if (actorId === recipientId) {
    // Don't notify someone about their own action.
    return;
  }

  try {
    const admin = createAdminClient();

    const [{ data: actor }, { data: recipient }] = await Promise.all([
      admin.from("members").select("full_name, email").eq("id", actorId).maybeSingle(),
      admin
        .from("members")
        .select("email, notify_mode")
        .eq("id", recipientId)
        .maybeSingle(),
    ]);

    if (!recipient || recipient.notify_mode !== "email") {
      // notify_mode = 'none', or no such member — no attempt made, so
      // nothing to log (notifications is "written after each email
      // attempt", and none was made here).
      return;
    }

    const actorName = actor?.full_name ?? actor?.email ?? "Someone";
    const { subject, html } = renderTemplate(eventType, actorName, data);

    let sendError: string | null = null;
    const mailer = getMailTransporter();
    if (!mailer) {
      sendError = "SMTP is not configured.";
    } else {
      try {
        await mailer.sendMail({
          from: EMAIL_FROM_ADDRESS,
          to: recipient.email,
          subject,
          html,
        });
      } catch (err) {
        sendError = err instanceof Error ? err.message : "Unknown error sending email.";
      }
    }

    await admin.from("notifications").insert({
      event_type: eventType,
      task_id: taskId,
      actor_id: actorId,
      recipient_id: recipientId,
      payload: data,
      error: sendError,
    });
  } catch (err) {
    console.error("notify() failed", err);
  }
}

export async function notifyMany<T extends EventType>(
  recipientIds: string[],
  params: Omit<NotifyParams<T>, "recipientId">
) {
  await Promise.all(
    recipientIds.map((recipientId) => notify({ ...params, recipientId }))
  );
}
