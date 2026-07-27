import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cream font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center bg-white px-16 py-32">
        <h1 className="mb-4 font-display text-3xl tracking-wide text-ink uppercase">Eternity Task Management</h1>
        {user ? (
          <p className="text-ink/70">Signed in as {user.email}.</p>
        ) : (
          <p className="text-ink/70">
            <Link href="/login" className="text-brand hover:underline">
              Log in
            </Link>{" "}
            to get started.
          </p>
        )}
      </main>
    </div>
  );
}
