import mongoose, { Schema, Document } from "mongoose";

export interface ITrainerConnection extends Document {
  athleteId: string;
  trainerId: string;
  status: "pending" | "active";
  createdAt: Date;
  updatedAt: Date;
}

const TrainerConnectionSchema = new Schema(
  {
    athleteId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "active"], required: true, default: "pending" },
  },
  { collection: "trainerConnections", timestamps: true }
);

// One connection per athlete-trainer pair
TrainerConnectionSchema.index({ athleteId: 1, trainerId: 1 }, { unique: true });
// Trainer's client list + pending requests
TrainerConnectionSchema.index({ trainerId: 1, status: 1 });
// Athlete's current trainer lookup
TrainerConnectionSchema.index({ athleteId: 1, status: 1 });

export default mongoose.models.TrainerConnection ||
  mongoose.model<ITrainerConnection>("TrainerConnection", TrainerConnectionSchema);
