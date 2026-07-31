import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8">
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">Sign up</h1>

        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action="/auth/signup" method="POST" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Email
            <input
              type="email"
              name="email"
              required
              defaultValue={params.email ?? ""}
              className="rounded border border-cream-dark px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="rounded border border-cream-dark px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-full bg-brand px-5 py-2 text-white transition-colors hover:bg-brand-dark"
          >
            Sign up
          </button>
        </form>

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-ink/50 hover:text-brand hover:underline"
        >
          Already have an account? Log in
        </Link>
      </div>
    </div>
  );
}
