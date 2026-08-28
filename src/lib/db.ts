import mongoose from "mongoose";

// Reuse connection across hot-reloads in dev to avoid exhausting connections.
let cached = (global as unknown as { mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } }).mongoose;

if (!cached) {
  cached = (global as unknown as { mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } }).mongoose = {
    conn: null,
    promise: null,
  };
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached!.conn) return cached!.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {};
    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

export default dbConnect;
