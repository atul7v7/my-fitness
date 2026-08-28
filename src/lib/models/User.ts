import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "athlete" | "instructor";
  unitPreference: "kg" | "lb";
  createdAt: Date;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["athlete", "instructor"], required: true },
    unitPreference: { type: String, enum: ["kg", "lb"], default: "kg" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

// { email: 1 } unique — login lookup + prevents duplicate accounts
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
