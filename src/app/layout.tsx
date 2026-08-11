import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { GlobalPendingOverlay } from "@/components/GlobalPendingOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eternity Task Management",
  description: "Task management for Eternity Healthclub.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    role = member?.role ?? null;
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-cream" suppressHydrationWarning>
        <GlobalPendingOverlay />
        <header className="flex items-center justify-between border-b border-cream-dark bg-white px-6 py-4">
          <Link href="/" className="flex items-center gap-3 font-display text-lg tracking-wide text-brand uppercase">
            <Image src="/eternity-logo.svg" alt="Eternity" width={44} height={44} unoptimized />
            Eternity Task Management
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink/70">
            {user ? (
              <>
                <Link href="/tasks" className="hover:text-brand">
                  My Tasks
                </Link>
                <Link href="/profile" className="hover:text-brand">
                  Profile
                </Link>
                {role !== "admin" && (
                  <Link href="/tasks/groups" className="hover:text-brand">
                    My Groups
                  </Link>
                )}
                {role === "admin" && (
                  <Link href="/admin/tasks" className="hover:text-brand">
                    Task Board
                  </Link>
                )}
                {role === "admin" && (
                  <Link href="/admin/groups" className="hover:text-brand">
                    Groups
                  </Link>
                )}
                {role === "admin" && (
                  <Link href="/admin/members" className="hover:text-brand">
                    Members
                  </Link>
                )}
                <form action="/auth/logout" method="POST">
                  <button type="submit" className="hover:text-brand hover:underline">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-brand">
                  Log in
                </Link>
                <Link href="/signup" className="hover:text-brand">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
