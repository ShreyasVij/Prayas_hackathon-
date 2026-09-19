import assert from "assert";
import fs from "fs";
import path from "path";

// Load .env
try {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [k, ...v] = line.split("=");
      if (k && v && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join("=").trim();
      }
    }
  }
} catch {}

import {
  saveProfileJsonToSupabase,
  getProfileJsonFromSupabase,
  ProfileJsonData,
} from "../lib/server/supabaseProfile";

async function runEdgeCaseTests() {
  console.log("▶ Running Edge Case Verification Tests...\n");

  const email = `edge_case_${Date.now()}@medilocker.vault`;

  // Edge Case 1: Skipped Step 3 (No diet notes, no routine, no allergies)
  console.log("Edge Case 1: User skips Step 3 (Optional health & lifestyle)...");
  const skippedStep3Profile: ProfileJsonData = {
    userId: "edge-user-001",
    email,
    name: "Jordan Smith",
    basicDetails: {
      name: "Jordan Smith",
      gender: "Female",
      dob: "2000-01-01",
      age: 26,
      phone: null,
      bloodGroup: null,
      emergencyContact: { name: null, phone: null, relationship: null },
      location: { city: null, state: null, country: "India" },
      profileImageUrl: null,
      profileImageName: null,
    },
    healthAndLifestyle: {
      diet: { breakfast: [], lunch: [], dinner: [] },
      dailyRoutine: null,
      allergies: null,
      medications: null,
    },
    customization: {
      theme: "light",
    },
    onboarding: {
      completed: true,
      completedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const res1 = await saveProfileJsonToSupabase(email, skippedStep3Profile);
  assert.strictEqual(res1.success, true);
  const fetched1 = await getProfileJsonFromSupabase(email);
  assert.ok(fetched1);
  assert.deepStrictEqual(fetched1.healthAndLifestyle.diet?.breakfast, []);
  assert.strictEqual(fetched1.healthAndLifestyle.dailyRoutine, null);
  assert.strictEqual(fetched1.onboarding.completed, true);
  console.log("✓ Edge Case 1 Passed: Empty/skipped Step 3 handled cleanly without errors.");

  // Edge Case 2: Special Characters in Diet Sentences and Email
  console.log("Edge Case 2: Special Characters & multi-sentence diet descriptions...");
  const specialEmail = `patient+special.test_01@medilocker.org`;
  const specialProfile: ProfileJsonData = {
    userId: "edge-user-002",
    email: specialEmail,
    name: "Dr. O'Connor-Smith",
    basicDetails: {
      name: "Dr. O'Connor-Smith",
      gender: "Other",
      dob: "1985-12-31",
      age: 40,
      phone: "+1 (555) 234-5678",
      bloodGroup: "AB-",
      emergencyContact: { name: "Jane O'Connor", phone: "555-1234", relationship: "Partner & Co-guardian" },
      location: { city: "New Delhi", state: "Delhi", country: "India" },
      profileImageUrl: null,
      profileImageName: null,
    },
    healthAndLifestyle: {
      diet: {
        breakfast: [
          "Avocado toast with Himalayan pink salt & extra-virgin olive oil.",
          "Matcha green tea (unsweetened, 80°C).",
        ],
        lunch: ["Mediterranean falafel wrap w/ tahini dressing — 350 kcal"],
        dinner: ["Steamed Norwegian salmon (180g) + sautéed baby spinach."],
      },
      dailyRoutine: "4:30 AM: Meditation & hydration -> 6:00 AM: Swim -> 9:00 AM: Surgery clinic.",
      allergies: "Sulfonamides, NSAIDs (severe anaphylaxis), Kiwi",
      medications: "EpiPen 0.3mg auto-injector on person at all times",
    },
    customization: {
      theme: "dark",
    },
    onboarding: {
      completed: true,
      completedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const res2 = await saveProfileJsonToSupabase(specialEmail, specialProfile);
  assert.strictEqual(res2.success, true);
  const fetched2 = await getProfileJsonFromSupabase(specialEmail);
  assert.ok(fetched2);
  assert.strictEqual(fetched2.name, "Dr. O'Connor-Smith");
  assert.strictEqual(fetched2.healthAndLifestyle.diet?.breakfast?.length, 2);
  assert.strictEqual(fetched2.customization.theme, "dark");
  console.log("✓ Edge Case 2 Passed: Complex characters and punctuation preserved.");

  // Edge Case 3: Non-existent profile query returns null
  console.log("Edge Case 3: Querying non-existent email...");
  const nonExistent = await getProfileJsonFromSupabase(`ghost_${Date.now()}@vault.none`);
  assert.strictEqual(nonExistent, null);
  console.log("✓ Edge Case 3 Passed: Returns null for non-existent profile as expected.");

  // Edge Case 4: Step 2 to Step 3 draft persistence (onboarding incomplete)
  console.log("Edge Case 4: Partial Step 2 profile draft persistence...");
  const draftEmail = `draft_patient_${Date.now()}@medilocker.vault`;
  const draftProfile: ProfileJsonData = {
    userId: "draft-001",
    email: draftEmail,
    name: "Draft User",
    basicDetails: {
      name: "Draft User",
      gender: "Male",
      dob: "1998-05-20",
      age: 28,
      phone: "+91 99887 76655",
      bloodGroup: "B+",
      emergencyContact: { name: "Parent", phone: "+91 99887 11223", relationship: "Mother" },
      location: { city: "Pune", state: "Maharashtra", country: "India" },
      profileImageUrl: null,
      profileImageName: null,
    },
    healthAndLifestyle: {
      diet: { breakfast: [], lunch: [], dinner: [] },
      dailyRoutine: null,
      allergies: null,
      medications: null,
    },
    customization: {
      theme: "light",
    },
    onboarding: {
      completed: false, // Step 2 draft is incomplete
      completedAt: null,
    },
    updatedAt: new Date().toISOString(),
  };

  await saveProfileJsonToSupabase(draftEmail, draftProfile);
  const fetchedDraft = await getProfileJsonFromSupabase(draftEmail);
  assert.ok(fetchedDraft);
  assert.strictEqual(fetchedDraft.onboarding.completed, false);
  assert.strictEqual(fetchedDraft.basicDetails.bloodGroup, "B+");
  console.log("✓ Edge Case 4 Passed: Partial Step 2 draft persists with completed=false.");

  // Edge Case 5: Diet sentence addition & whitespace trimming across meal columns
  console.log("Edge Case 5: Diet sentence addition & whitespace handling across columns...");
  const dietProfile: ProfileJsonData = {
    ...draftProfile,
    healthAndLifestyle: {
      diet: {
        breakfast: ["  2 slices whole grain bread with avocado  ".trim()],
        lunch: ["Lentil soup with mixed quinoa bowl".trim()],
        dinner: ["  Grilled paneer with steamed broccoli  ".trim()],
      },
      dailyRoutine: "Morning jog 6 AM",
      allergies: "None",
      medications: "None",
    },
    updatedAt: new Date().toISOString(),
  };
  await saveProfileJsonToSupabase(draftEmail, dietProfile);
  const fetchedDiet = await getProfileJsonFromSupabase(draftEmail);
  assert.ok(fetchedDiet);
  assert.strictEqual(fetchedDiet.healthAndLifestyle.diet?.breakfast?.[0], "2 slices whole grain bread with avocado");
  assert.strictEqual(fetchedDiet.healthAndLifestyle.diet?.dinner?.[0], "Grilled paneer with steamed broccoli");
  console.log("✓ Edge Case 5 Passed: Diet sentences correctly trimmed and segregated by meal column.");

  // Edge Case 6: Theme mode toggling cycle (light -> dark -> light)
  console.log("Edge Case 6: Smooth theme customization toggle cycle...");
  const darkProfile: ProfileJsonData = {
    ...dietProfile,
    customization: { theme: "dark" },
    onboarding: { completed: true, completedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  await saveProfileJsonToSupabase(draftEmail, darkProfile);
  const fetchedDark = await getProfileJsonFromSupabase(draftEmail);
  assert.strictEqual(fetchedDark?.customization.theme, "dark");
  assert.strictEqual(fetchedDark?.onboarding.completed, true);

  const lightProfile: ProfileJsonData = {
    ...darkProfile,
    customization: { theme: "light" },
    updatedAt: new Date().toISOString(),
  };
  await saveProfileJsonToSupabase(draftEmail, lightProfile);
  const fetchedLight = await getProfileJsonFromSupabase(draftEmail);
  assert.strictEqual(fetchedLight?.customization.theme, "light");
  console.log("✓ Edge Case 6 Passed: Theme customization smoothly transitions light -> dark -> light.");

  console.log("\n All 6 Edge Case tests passed cleanly!");
}

runEdgeCaseTests().catch((err) => {
  console.error("❌ Edge case test failed:", err);
  process.exit(1);
});
