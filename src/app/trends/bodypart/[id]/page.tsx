"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TrendView from "@/components/TrendView";
import type { BodyPartDTO } from "@/lib/types";

export default function BodyPartTrendPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bodyPart, setBodyPart] = useState<BodyPartDTO | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    fetch("/api/bodyparts")
      .then((r) => r.json())
      .then((bps: BodyPartDTO[]) => {
        setBodyPart(bps.find((b) => b._id === params.id) || null);
      });
  }, [status, params.id, router]);

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/trends" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white flex-1 truncate">
            {bodyPart?.name || "Body Part"} Trends
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <TrendView
          fetchUrl={`/api/trends/bodypart/${params.id}?`}
          title={bodyPart?.name || ""}
        />
      </main>
    </div>
  );
}
