import mongoose, { Schema, Document } from "mongoose";

export interface IBodyPart extends Document {
  name: string;
  isCustom: boolean;
  createdBy?: string;
  createdAt: Date;
}

const BodyPartSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isCustom: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "bodyParts" }
);

BodyPartSchema.index({ name: 1 });

export default mongoose.models.BodyPart || mongoose.model<IBodyPart>("BodyPart", BodyPartSchema);
