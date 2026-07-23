import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type ReassignedData = {
  taskTitle: string;
  change: "added" | "removed";
};

export function renderReassigned(actorName: string, data: ReassignedData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);
  const verb = data.change === "added" ? "assigned you to" : "removed you from";

  return {
    subject:
      data.change === "added"
        ? `You were assigned: ${data.taskTitle}`
        : `You were unassigned: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} ${verb} ${data.taskTitle}`,
      `<p><strong>${name}</strong> ${verb} <strong>${title}</strong>.</p>`
    ),
  };
}
