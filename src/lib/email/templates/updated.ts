import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type UpdatedData = {
  taskTitle: string;
};

export function renderUpdated(actorName: string, data: UpdatedData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);

  return {
    subject: `Task updated: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} updated a task you're on`,
      `<p><strong>${name}</strong> updated <strong>${title}</strong>.</p>`
    ),
  };
}
