import "dotenv/config";
import mongoose from "mongoose";
import dbConnect from "./db";
import User from "./models/User";
import BodyPart from "./models/BodyPart";
import { hashPassword } from "./password";

const DEFAULT_BODY_PARTS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Core/Abs",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Calves",
  "Full Body / Cardio",
];

async function seed() {
  await dbConnect();
  const db = mongoose.connection.db!;

  // --- Create indexes explicitly (reproducible) ---
  console.log("Creating indexes...");
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("exercises").createIndex({ bodyParts: 1 });
  await db.collection("exercises").createIndex({ name: 1 });
  await db.collection("logEntries").createIndex({ userId: 1, exerciseId: 1, date: -1 });
  await db.collection("logEntries").createIndex({ userId: 1, date: -1 });
  await db.collection("bodyMetrics").createIndex({ userId: 1, date: -1 });
  console.log("Indexes created.");

  // --- Seed body parts ---
  console.log("Seeding body parts...");
  for (const name of DEFAULT_BODY_PARTS) {
    await BodyPart.updateOne({ name }, { $setOnInsert: { name, isCustom: false } }, { upsert: true });
  }
  console.log("Body parts seeded.");

  // --- Seed admin athlete account ---
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Athlete";
  if (email && password) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log(`Admin user ${email} already exists — skipping.`);
    } else {
      const passwordHash = await hashPassword(password);
      await User.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "athlete",
        unitPreference: "kg",
      });
      console.log(`Admin athlete account created: ${email}`);
    }
  } else {
    console.log("Skipping admin seed (SEED_ADMIN_EMAIL/PASSWORD not set).");
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
