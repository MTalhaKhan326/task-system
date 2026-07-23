import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
          Task System
        </h1>
        {user ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Signed in as {user.email}.
          </p>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            to get started.
          </p>
        )}
      </main>
    </div>
  );
}
