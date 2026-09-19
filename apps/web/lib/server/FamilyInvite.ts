import { getCollection } from "@/lib/server/db";
import { ObjectId } from "@/lib/server/ids";

export interface FamilyInviteDocument {
  _id: ObjectId;
  familyId: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export async function getFamilyInvitesCollection() {
  return getCollection<FamilyInviteDocument>("familyInvites");
}

export async function ensureFamilyInviteIndexes() {
  return undefined;
}
