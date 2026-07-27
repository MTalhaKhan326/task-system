import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirectTo?: string }>;
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
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">Log in</h1>

        {params.message && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            {params.message}
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}

        <form action="/auth/login" method="POST" className="flex flex-col gap-4">
          <input type="hidden" name="redirectTo" value={params.redirectTo ?? "/"} />

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded border border-cream-dark px-3 py-2 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Password
            <input
              type="password"
              name="password"
              required
              className="rounded border border-cream-dark px-3 py-2 text-ink"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-full bg-brand px-5 py-2 text-white transition-colors hover:bg-brand-dark"
          >
            Log in
          </button>
        </form>

        <Link
          href="/signup"
          className="mt-4 block text-center text-sm text-ink/50 hover:text-brand hover:underline"
        >
          Need an account? Sign up
        </Link>
      </div>
    </div>
  );
}
