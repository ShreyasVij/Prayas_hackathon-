import { saveProfileJsonToSupabase, getProfileJsonFromSupabase, ProfileJsonData } from '../lib/server/supabaseProfile';

async function main() {
  const email = `test_diag_${Date.now()}@medilocker.vault`;
  const draftProfile: ProfileJsonData = {
    userId: "diag-001",
    email,
    name: "Diag User",
    basicDetails: { name: "Diag User", bloodGroup: "B+" },
    healthAndLifestyle: {
      diet: { breakfast: [], lunch: [], dinner: [] },
    },
    customization: { theme: "light" },
    onboarding: { completed: false },
    updatedAt: new Date().toISOString(),
  };

  console.log("Saving initial profile...");
  const res1 = await saveProfileJsonToSupabase(email, draftProfile);
  console.log("save 1 res:", res1);

  const f1 = await getProfileJsonFromSupabase(email);
  console.log("fetched 1 diet:", JSON.stringify(f1?.healthAndLifestyle?.diet));

  const dietProfile: ProfileJsonData = {
    ...draftProfile,
    healthAndLifestyle: {
      diet: {
        breakfast: ["2 slices whole grain bread with avocado"],
        lunch: ["Lentil soup"],
        dinner: ["Grilled paneer"],
      },
    },
    updatedAt: new Date().toISOString(),
  };

  console.log("Saving updated diet profile...");
  const res2 = await saveProfileJsonToSupabase(email, dietProfile);
  console.log("save 2 res:", res2);

  const f2 = await getProfileJsonFromSupabase(email);
  console.log("fetched 2 diet:", JSON.stringify(f2?.healthAndLifestyle?.diet));
}

main().catch(console.error);
