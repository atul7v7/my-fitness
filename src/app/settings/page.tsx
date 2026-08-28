"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const isAthlete = session.user.role === "athlete";

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {/* Profile */}
        <section className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{session.user.name}</p>
              <p className="text-xs text-slate-400">{session.user.email}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${
                isAthlete ? "bg-brand-600/20 text-brand-300" : "bg-amber-600/20 text-amber-300"
              }`}>
                {isAthlete ? "Athlete" : "Instructor"}
              </span>
            </div>
          </div>
        </section>

        {/* Data export */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">My Data</h2>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/api/export?format=csv"
              className="py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold text-center border border-slate-700 active:scale-[0.98] transition"
            >
              Export CSV
            </a>
            <a
              href="/api/export?format=json"
              className="py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold text-center border border-slate-700 active:scale-[0.98] transition"
            >
              Export JSON
            </a>
          </div>
        </section>

        {/* Create instructor account (athlete only) */}
        {isAthlete && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Account Management</h2>
            <Link
              href="/register"
              className="block py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold text-center border border-slate-700 active:scale-[0.98] transition"
            >
              Create Instructor Account
            </Link>
          </section>
        )}

        {/* Sign out */}
        <section>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full py-3 rounded-xl bg-red-900/30 text-red-400 font-semibold border border-red-900/50 active:scale-[0.98] transition"
          >
            Sign Out
          </button>
        </section>

        {/* About */}
        <section className="text-center pt-4">
          <p className="text-xs text-slate-600">My Fitness Tracker v1.0</p>
          <p className="text-xs text-slate-600 mt-1">Progressive-overload PWA</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
