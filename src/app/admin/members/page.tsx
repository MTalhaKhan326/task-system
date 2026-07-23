import { createClient } from "@/lib/supabase/server";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("members")
    .select("id, email, full_name, role, status")
    .order("email");

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          Members
        </h1>

        {params.invited && (
          <p className="mb-4 rounded bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Invited {params.invited}.
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
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
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Invite
          </button>
        </form>

        {error ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error.message}
          </p>
        ) : (
          <table className="w-full border-collapse overflow-hidden rounded border border-zinc-200 text-left text-sm dark:border-zinc-800">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Email</th>
                <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Name</th>
                <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Role</th>
                <th className="px-4 py-2 text-zinc-700 dark:text-zinc-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-2 text-black dark:text-zinc-50">
                    {member.email}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {member.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {member.role}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {member.status}
                  </td>
                </tr>
              ))}
              {members?.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-500"
                  >
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
