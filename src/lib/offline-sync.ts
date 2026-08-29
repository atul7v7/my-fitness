import Dexie, { type Table } from "dexie";

export interface QueuedLogEntry {
  id?: number;
  payload: {
    exerciseId: string;
    date: string;
    sets: { weight: number; reps: number; rpe: number | null; type?: "normal" | "drop" }[];
    unit: "kg" | "lb";
    notes: string;
  };
  createdAt: string;
}

class FitnessDB extends Dexie {
  queue!: Table<QueuedLogEntry, number>;

  constructor() {
    super("fitness-tracker");
    this.version(1).stores({
      queue: "++id,createdAt",
    });
  }
}

let db: FitnessDB | null = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!db) db = new FitnessDB();
  return db;
}

/** Queue a log entry to be synced when back online. */
export async function queueLogEntry(payload: QueuedLogEntry["payload"]) {
  const d = getDB();
  if (!d) return;
  await d.queue.add({ payload, createdAt: new Date().toISOString() });
  // Try to sync immediately in case we're actually online.
  void syncQueue();
}

/** Process all queued log entries. */
export async function syncQueue() {
  const d = getDB();
  if (!d) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const items = await d.queue.toArray();
  for (const item of items) {
    try {
      const res = await fetch("/api/logentries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await d.queue.delete(item.id!);
      } else {
        // Stop on auth errors; keep retrying server errors later.
        if (res.status === 401 || res.status === 403) return;
      }
    } catch {
      // Network error — will retry on next online event.
      return;
    }
  }
}

export function getQueueCount(): Promise<number> {
  const d = getDB();
  if (!d) return Promise.resolve(0);
  return d.queue.count();
}

/** Initialize listeners for online/offline events. Call once on app mount. */
export function initOfflineSync() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void syncQueue();
  });
  // Attempt an initial sync in case items were queued before mount.
  if (navigator.onLine) {
    void syncQueue();
  }
}
