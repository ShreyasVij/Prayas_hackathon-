import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


import { getCollection } from "@/lib/server/db"; 
import type { UserDocument } from "@db/users"; 

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await getCollection<UserDocument>("users");
    const user = await users.findOne({ email: authUser.email });

    if (!authUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return profile in the expected format for emergency settings
    const profiles = [{
      id: user._id.toString(),
      type: 'self',
      userId: user._id.toString(),
      displayName: user.name || 'User',
      email: user.email,
      bloodGroup: user.profile?.medical?.bloodGroup || null,
      allergies: user.profile?.medical?.allergies ? [user.profile.medical.allergies] : [],
      conditions: user.profile?.medical?.conditions ? [user.profile.medical.conditions] : [],
      emergencyData: {
        notes: '',
        contacts: user.profile?.emergency ? [{
          name: user.profile.emergency.name || '',
          relationship: user.profile.emergency.relationship || '',
          phone: user.profile.emergency.phone || '',
        }] : []
      },
      dateOfBirth: user.profile?.dob || null,
    }];

    return NextResponse.json({ 
      success: true,
      profiles 
    });
    
  } catch (err) {
    console.error("PROFILE_GET_ERROR", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }


    const body = await req.json();

    const {
      phone,
      dob,
      gender,
      bloodGroup,
      allergies,
      conditions,
      medications,
      emergencyName,
      emergencyPhone,
      relationship,
      city,
      state,
      country,
    } = body;


    const users = await getCollection<UserDocument>("users");


    await users.updateOne(
      { email: authUser.email },
      {
        $set: {
          profile: {
            phone: phone || null,
            dob: dob ? new Date(dob) : null,
            gender: gender || null,

            medical: {
              bloodGroup: bloodGroup || null,
              allergies: allergies || null,
              conditions: conditions || null,
              medications: medications || null,
            },

            emergency: {
              name: emergencyName || null,
              phone: emergencyPhone || null,
              relationship: relationship || null,
            },

            location: {
              city: city || null,
              state: state || null,
              country: country || "India",
            },
          },
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true });
    
  } catch (err) {
    console.error("PROFILE_ROUTE_ERROR", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
