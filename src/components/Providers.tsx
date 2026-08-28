"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { initOfflineSync } from "@/lib/offline-sync";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initOfflineSync();
    // Register service worker for PWA offline support.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
