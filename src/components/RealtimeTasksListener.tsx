"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Renders nothing — just subscribes to live changes on tasks/task_assignees
// and re-fetches this page's server data whenever something changes, so
// every open Board/List/Calendar/My Tasks screen updates on its own
// instead of only after a manual refresh. Realtime still respects each
// table's RLS, so members only get notified about tasks they can see.
export function RealtimeTasksListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        router.refresh();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
