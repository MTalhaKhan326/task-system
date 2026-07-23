import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type AssignedData = {
  taskTitle: string;
  dueDate: string | null;
  priority: string;
};

export function renderAssigned(actorName: string, data: AssignedData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);

  return {
    subject: `You were assigned: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} assigned you a task`,
      `<p><strong>${name}</strong> assigned you to <strong>${title}</strong>.</p>
       ${data.dueDate ? `<p>Due ${data.dueDate}.</p>` : ""}
       <p>Priority: ${data.priority}.</p>`
    ),
  };
}
