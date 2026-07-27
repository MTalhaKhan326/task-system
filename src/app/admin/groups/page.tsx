import { createClient } from "@/lib/supabase/server";
import { GroupDialog } from "@/components/GroupDialog";
import { GroupMembersDialog } from "@/components/GroupMembersDialog";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";

type GroupRow = {
  id: string;
  name: string;
  group_members: {
    members: { id: string; email: string; full_name: string | null } | null;
  }[];
};

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: groups, error: groupsError }, { data: members }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, group_members(members(id, email, full_name))")
      .order("name")
      .returns<GroupRow[]>(),
    supabase
      .from("members")
      .select("id, email, full_name")
      .neq("status", "disabled")
      .order("email"),
  ]);

  const memberOptions = members ?? [];

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-wide text-ink uppercase">Groups</h1>
          <GroupDialog
            triggerLabel="New group"
            heading="New group"
            actionUrl="/admin/groups/create"
          />
        </div>

        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.created && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Created &ldquo;{params.created}&rdquo;.
          </p>
        )}
        {params.updated && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            {params.updated === "membership"
              ? "Membership updated."
              : `Renamed to “${params.updated}”.`}
          </p>
        )}
        {params.deleted && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Group deleted. Existing task assignments were not affected.
          </p>
        )}

        {groupsError ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {groupsError.message}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {(groups ?? []).map((group) => {
              const currentMembers = group.group_members
                .map((row) => row.members)
                .filter((m): m is NonNullable<typeof m> => m !== null);

              return (
                <div
                  key={group.id}
                  className="rounded border border-cream-dark bg-white p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{group.name}</span>
                    <span className="text-xs text-ink/50">
                      {currentMembers.length} member{currentMembers.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {currentMembers.length > 0 && (
                    <p className="mt-1 text-xs text-ink/50">
                      {currentMembers.map((m) => m.full_name ?? m.email).join(", ")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <GroupDialog
                      triggerLabel="Rename"
                      heading="Rename group"
                      actionUrl={`/admin/groups/${group.id}/rename`}
                      defaultValues={{ name: group.name }}
                      small
                    />
                    <GroupMembersDialog
                      actionUrl={`/admin/groups/${group.id}/members`}
                      members={memberOptions}
                      currentMemberIds={currentMembers.map((m) => m.id)}
                    />
                    <DeleteGroupButton actionUrl={`/admin/groups/${group.id}/delete`} />
                  </div>
                </div>
              );
            })}
            {(groups ?? []).length === 0 && (
              <p className="text-center text-sm text-ink/50">No groups yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
