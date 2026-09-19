import { getCollection } from "@/lib/server/db";
import { ObjectId } from "@/lib/server/ids";

export interface FamilyDocument {
  _id: ObjectId;
  ownerId: string;
  members: string[];
  createdAt: Date;
}

export async function getFamiliesCollection() {
  return getCollection<FamilyDocument>("families");
}

export async function ensureFamilyIndexes() {
  return undefined;
}
