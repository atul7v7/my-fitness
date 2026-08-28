"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"athlete" | "instructor">("instructor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status !== "authenticated" || session?.user.role !== "athlete") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setSaving(false);
    if (res.ok) {
      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create account");
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/settings" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">Create Account</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {success && (
          <div className="rounded-xl bg-green-600/10 border border-green-600/30 p-4 mb-4">
            <p className="text-sm text-green-300">Account created successfully. The new user can now log in.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="Instructor name"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="instructor@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="Min 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("instructor")}
                className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                  role === "instructor" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                Instructor (read-only)
              </button>
              <button
                type="button"
                onClick={() => setRole("athlete")}
                className={`flex-1 py-3 rounded-xl text-sm font-medium ${
                  role === "athlete" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                Athlete (full access)
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Account"}
          </button>
        </form>
      </main>
    </div>
  );
}
