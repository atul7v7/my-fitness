import mongoose, { Schema, Document } from "mongoose";

export interface ISet {
  weight: number;
  reps: number;
  rpe: number | null;
}

export interface ILogEntry extends Document {
  exerciseId: string;
  userId: string;
  date: Date;
  sets: ISet[];
  unit: "kg" | "lb";
  totalVolume: number;
  notes: string;
  createdAt: Date;
}

const SetSchema = new Schema(
  {
    weight: { type: Number, required: true, min: 0 },
    reps: { type: Number, required: true, min: 0 },
    rpe: { type: Number, default: null, min: 0, max: 10 },
  },
  { _id: false }
);

const LogEntrySchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    sets: { type: [SetSchema], default: [] },
    unit: { type: String, enum: ["kg", "lb"], required: true },
    totalVolume: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "logEntries" }
);

// { userId: 1, exerciseId: 1, date: -1 } — primary access pattern: this user's
// history for this exercise, most recent first (trend view + suggestions)
LogEntrySchema.index({ userId: 1, exerciseId: 1, date: -1 });
// { userId: 1, date: -1 } — general "all my recent workouts" feed
LogEntrySchema.index({ userId: 1, date: -1 });

export default mongoose.models.LogEntry || mongoose.model<ILogEntry>("LogEntry", LogEntrySchema);
