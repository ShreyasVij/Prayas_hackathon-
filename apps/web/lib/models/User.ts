import { getCollection } from "@/lib/server/db";
import { UserDocument } from "@db/users"; 


export async function getUsersCollection() {
  return getCollection<UserDocument>("users");
}
