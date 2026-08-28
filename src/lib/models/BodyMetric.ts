import mongoose, { Schema, Document } from "mongoose";

export interface IBodyMetric extends Document {
  userId: string;
  date: Date;
  bodyWeight: number;
  notes: string;
  createdAt: Date;
}

const BodyMetricSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    bodyWeight: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "bodyMetrics" }
);

// { userId: 1, date: -1 }
BodyMetricSchema.index({ userId: 1, date: -1 });

export default mongoose.models.BodyMetric || mongoose.model<IBodyMetric>("BodyMetric", BodyMetricSchema);
