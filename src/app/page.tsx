import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: testItems, error } = await supabase
    .from("test_items")
    .select();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-6">
          Supabase connection check
        </h1>
        {error ? (
          <pre className="max-w-full overflow-auto rounded bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error.message}
          </pre>
        ) : (
          <pre className="max-w-full overflow-auto rounded bg-zinc-100 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {JSON.stringify(testItems, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}
