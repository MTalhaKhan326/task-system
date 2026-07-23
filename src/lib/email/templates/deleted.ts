import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type DeletedData = {
  taskTitle: string;
};

export function renderDeleted(actorName: string, data: DeletedData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);

  return {
    subject: `Task deleted: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} deleted a task you were on`,
      `<p><strong>${name}</strong> deleted <strong>${title}</strong>.</p>`
    ),
  };
}
