"use client";

export function RoleSelect({
  actionUrl,
  currentRole,
}: {
  actionUrl: string;
  currentRole: string;
}) {
  return (
    <form action={actionUrl} method="POST">
      <select
        name="role"
        defaultValue={currentRole}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded border border-cream-dark px-2 py-1 text-sm text-ink"
      >
        <option value="admin">Admin</option>
        <option value="member">Member</option>
      </select>
    </form>
  );
}
