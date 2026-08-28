export interface SetDTO {
  weight: number;
  reps: number;
  rpe: number | null;
}

export interface LogEntryDTO {
  _id: string;
  exerciseId: string;
  userId: string;
  date: string;
  sets: SetDTO[];
  unit: "kg" | "lb";
  totalVolume: number;
  notes: string;
  createdAt: string;
}

export interface ExerciseDTO {
  _id: string;
  name: string;
  description: string;
  bodyParts: string[];
  bodyPartNames?: string[];
  videoUrl: string | null;
  videoPublicId: string | null;
  videoUploadedBy: string | null;
  videoUploadedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface BodyPartDTO {
  _id: string;
  name: string;
  isCustom: boolean;
}

export interface SuggestionDTO {
  message: string;
  suggestedSets: SetDTO[];
  unit: "kg" | "lb";
}

export interface TrendPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
}

export interface TrendResult {
  points: TrendPoint[];
  thenVsNow: {
    earliest: { date: string; maxWeight: number; totalVolume: number; topSet: SetDTO } | null;
    latest: { date: string; maxWeight: number; totalVolume: number; topSet: SetDTO } | null;
    weightChangePct: number | null;
    volumeChangePct: number | null;
  };
  prs: {
    heaviestSet: { weight: number; reps: number; date: string } | null;
    highestVolumeSession: { volume: number; date: string } | null;
    bestEstimated1RM: { value: number; date: string } | null;
  };
}
