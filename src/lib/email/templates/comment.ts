import { emailShell } from "./shell";
import { escapeHtml } from "./escape-html";

export type CommentData = {
  taskTitle: string;
  body: string;
};

export function renderComment(actorName: string, data: CommentData) {
  const title = escapeHtml(data.taskTitle);
  const name = escapeHtml(actorName);
  const body = escapeHtml(data.body);

  return {
    subject: `New comment on: ${data.taskTitle}`,
    html: emailShell(
      `${actorName} commented on ${data.taskTitle}`,
      `<p><strong>${name}</strong> commented on <strong>${title}</strong>:</p>
       <blockquote style="margin:8px 0;padding:8px 12px;border-left:3px solid #d4d4d8;color:#3f3f46;">${body}</blockquote>`
    ),
  };
}
