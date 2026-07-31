import { emailShell, APP_URL } from "./shell";
import { escapeHtml } from "./escape-html";

export type InvitedData = {
  email: string;
};

export function renderInvited(actorName: string, data: InvitedData) {
  const name = escapeHtml(actorName);
  const signupUrl = `${APP_URL}/signup?email=${encodeURIComponent(data.email)}`;

  return {
    subject: "You've been invited to Eternity Task Management",
    html: emailShell(
      `${actorName} invited you to Eternity Task Management`,
      `<p><strong>${name}</strong> invited you to Eternity Task Management.</p>
       <p>Create your account to get started.</p>`,
      { url: signupUrl, label: "Create your account" }
    ),
  };
}
