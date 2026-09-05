"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

/**
 * Captures the browser's install prompt and offers an in-app "Install App"
 * banner. The banner only appears when the browser would actually allow the
 * install (the beforeinstallprompt event fired) and the app is not already
 * running in installed/standalone mode. The raw browser prompt is deferred
 * until the user taps "Install", and dismissed once they accept or the app
 * is installed.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);
  const dismissed = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      if (dismissed.current) return;
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
        setDeferred(null);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    dismissed.current = true;
    setShow(false);
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[60] px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto rounded-2xl bg-slate-800/95 backdrop-blur-md border border-slate-600/60 shadow-2xl px-4 py-3.5 flex items-center gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-brand-600 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={44} height={44} className="w-11 h-11" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install Fitness App</p>
          <p className="text-[11px] text-slate-400 truncate">Add to home screen · works offline</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-500 transition disabled:opacity-60"
          >
            {installing ? "..." : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
