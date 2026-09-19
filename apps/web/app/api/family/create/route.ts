import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

import { getUsersCollection } from "@/lib/models/User";
import { getFamiliesCollection } from "@/lib/server/Family";

export async function POST() {
  const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await getUsersCollection();
  const families = await getFamiliesCollection();

  const user = await users.findOne({ email: authUser.email });
  if (!authUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.familyId) {
    return NextResponse.json({ error: "Already in a family" }, { status: 400 });
  }

  const familyId = new ObjectId();

  await families.insertOne({
    _id: familyId,
    ownerId: user._id,
    members: [user._id],
    createdAt: new Date()
  });

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        familyId: familyId.toString(),
        familyRole: "owner"
      }
    }
  );

  return NextResponse.json({ success: true, familyId: familyId.toString() });
}
