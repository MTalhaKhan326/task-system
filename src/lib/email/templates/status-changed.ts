import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type StatusChangedData = {
  taskTitle: string;
  status: string;
};

export function renderStatusChanged(actorName: string, data: StatusChangedData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);

  return {
    subject: `Status changed: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} moved ${data.taskTitle} to ${data.status}`,
      `<p><strong>${name}</strong> changed the status of <strong>${title}</strong> to <strong>${data.status}</strong>.</p>`
    ),
  };
}
