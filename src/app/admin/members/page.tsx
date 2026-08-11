import { createClient } from "@/lib/supabase/server";
import { DeleteMemberButton } from "@/components/DeleteMemberButton";
import { RoleSelect } from "@/components/RoleSelect";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string; deleted?: string; roleUpdated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: members, error }, { data: currentMember }] = await Promise.all([
    supabase
      .from("members")
      .select("id, email, full_name, role, status")
      .neq("status", "disabled")
      .order("email"),
    user
      ? supabase.from("members").select("id").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">Members</h1>

        {params.invited && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Invited {params.invited}.
          </p>
        )}
        {params.deleted && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Member deleted. Their task history and comments were kept.
          </p>
        )}
        {params.roleUpdated && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Role updated.
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form
          action="/admin/members/invite"
          method="POST"
          className="mb-8 flex gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="email@example.com"
            className="flex-1 rounded border border-cream-dark px-3 py-2 text-ink"
          />
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-white transition-colors hover:bg-brand-dark"
          >
            Invite
          </button>
        </form>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message}
          </p>
        ) : (
          <table className="w-full border-collapse overflow-hidden rounded border border-cream-dark bg-white text-left text-sm">
            <thead className="bg-cream-mid">
              <tr>
                <th className="px-4 py-2 text-ink/80">Email</th>
                <th className="px-4 py-2 text-ink/80">Name</th>
                <th className="px-4 py-2 text-ink/80">Role</th>
                <th className="px-4 py-2 text-ink/80">Status</th>
                <th className="px-4 py-2 text-ink/80">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((member) => (
                <tr key={member.id} className="border-t border-cream-dark">
                  <td className="px-4 py-2 text-ink">{member.email}</td>
                  <td className="px-4 py-2 text-ink/70">
                    {member.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-ink/70">
                    {member.id === currentMember?.id ? (
                      member.role
                    ) : (
                      <RoleSelect
                        actionUrl={`/admin/members/${member.id}/role`}
                        currentRole={member.role}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-ink/70">{member.status}</td>
                  <td className="px-4 py-2">
                    {member.id !== currentMember?.id && member.status !== "disabled" && (
                      <DeleteMemberButton actionUrl={`/admin/members/${member.id}/delete`} />
                    )}
                  </td>
                </tr>
              ))}
              {members?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
