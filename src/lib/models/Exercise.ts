import mongoose, { Schema, Document } from "mongoose";

export interface IExercise extends Document {
  name: string;
  description: string;
  bodyParts: string[];
  videoUrl: string | null;
  videoPublicId: string | null;
  videoUploadedBy: string | null;
  videoUploadedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

const ExerciseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    bodyParts: [{ type: Schema.Types.ObjectId, ref: "BodyPart" }],
    videoUrl: { type: String, default: null },
    videoPublicId: { type: String, default: null },
    videoUploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    videoUploadedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "exercises" }
);

// { bodyParts: 1 } — multikey index for "all exercises for this body part"
ExerciseSchema.index({ bodyParts: 1 });
// { name: 1 } — supports exercise search/autocomplete when logging
ExerciseSchema.index({ name: 1 });

export default mongoose.models.Exercise || mongoose.model<IExercise>("Exercise", ExerciseSchema);
