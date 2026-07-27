import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/profile");
  }

  const { data: member } = await supabase
    .from("members")
    .select("email, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8">
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">My profile</h1>

        {params.updated && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Profile updated.
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action="/profile/update" method="POST" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Email
            <input
              type="email"
              value={member?.email ?? user.email ?? ""}
              disabled
              className="rounded border border-cream-dark bg-cream-mid px-3 py-2 text-ink/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Full name
            <input
              type="text"
              name="fullName"
              defaultValue={member?.full_name ?? ""}
              placeholder="Your name"
              className="rounded border border-cream-dark px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-full bg-brand px-5 py-2 text-white transition-colors hover:bg-brand-dark"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
