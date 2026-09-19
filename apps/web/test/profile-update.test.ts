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

async function runTests() {
  console.log("▶ Running Profile Update & Supabase JSON Verification Tests...\n");

  const testEmail = `test_patient_${Date.now()}@medilocker.vault`;
  const sampleProfile: ProfileJsonData = {
    userId: "test-user-123",
    email: testEmail,
    name: "Alex Parker",
    basicDetails: {
      name: "Alex Parker",
      gender: "Male",
      dob: "1994-08-15",
      age: 32,
      phone: "+91 98765 11223",
      bloodGroup: "O+",
      emergencyContact: {
        name: "Morgan Parker",
        phone: "+91 98765 99887",
        relationship: "Spouse",
      },
      location: {
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
      },
      profileImageUrl: null,
      profileImageName: null,
    },
    healthAndLifestyle: {
      diet: {
        breakfast: ["2 boiled eggs and black coffee", "Whole wheat toast with peanut butter"],
        lunch: ["Brown rice with yellow dal", "Fresh mixed green salad with olive oil"],
        dinner: ["Clear chicken/vegetable soup", "Sautéed vegetables"],
      },
      dailyRoutine: "Wake up at 6:00 AM, 45 min cardio, work from 9 to 5, sleep by 10:30 PM.",
      allergies: "Penicillin, Peanuts",
      medications: "Vitamin D3 60k IU weekly, Multivitamin daily",
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

  // 1. Test Saving Profile JSON
  console.log("Test 1: Saving Profile JSON to Supabase / Local storage...");
  const saveResult = await saveProfileJsonToSupabase(testEmail, sampleProfile);
  assert.strictEqual(saveResult.success, true, "Profile save should be successful");
  console.log("✓ Test 1 Passed: Profile JSON saved successfully.");

  // 2. Test Fetching Profile JSON
  console.log("Test 2: Fetching Profile JSON from Supabase / Local storage...");
  const fetched = await getProfileJsonFromSupabase(testEmail);
  assert.ok(fetched, "Fetched profile should not be null");
  assert.strictEqual(fetched.name, "Alex Parker", "Name should match");
  assert.strictEqual(fetched.basicDetails.bloodGroup, "O+", "Blood group should match");
  assert.strictEqual(fetched.healthAndLifestyle.diet?.breakfast?.length, 2, "Breakfast items should match");
  assert.strictEqual(fetched.healthAndLifestyle.diet?.lunch?.length, 2, "Lunch items should match");
  assert.strictEqual(fetched.healthAndLifestyle.diet?.dinner?.length, 2, "Dinner items should match");
  assert.strictEqual(fetched.customization.theme, "light", "Default theme should be light (white mode)");
  assert.strictEqual(fetched.onboarding.completed, true, "Onboarding status should be true");
  console.log("✓ Test 2 Passed: Profile JSON fetched and all structured fields verified.");

  // 3. Test Theme Toggle to Dark Mode
  console.log("Test 3: Testing Theme Customization Update to Dark Mode...");
  const updatedProfile: ProfileJsonData = {
    ...sampleProfile,
    customization: { theme: "dark" },
    updatedAt: new Date().toISOString(),
  };
  await saveProfileJsonToSupabase(testEmail, updatedProfile);
  const fetchedUpdated = await getProfileJsonFromSupabase(testEmail);
  assert.strictEqual(fetchedUpdated?.customization.theme, "dark", "Theme should now be dark");
  console.log("✓ Test 3 Passed: Theme update to dark mode persisted and retrieved.");

  // 4. Test Diet Sentence Addition & Removal
  console.log("Test 4: Testing Diet Sentence modifications...");
  const modifiedDietProfile: ProfileJsonData = {
    ...sampleProfile,
    healthAndLifestyle: {
      ...sampleProfile.healthAndLifestyle,
      diet: {
        breakfast: ["Avocado toast with poached egg"],
        lunch: ["Quinoa bowl with chickpeas"],
        dinner: ["Lentil soup"],
      },
    },
    updatedAt: new Date().toISOString(),
  };
  await saveProfileJsonToSupabase(testEmail, modifiedDietProfile);
  const fetchedDiet = await getProfileJsonFromSupabase(testEmail);
  assert.strictEqual(fetchedDiet?.healthAndLifestyle.diet?.breakfast?.[0], "Avocado toast with poached egg");
  assert.strictEqual(fetchedDiet?.healthAndLifestyle.diet?.dinner?.[0], "Lentil soup");
  console.log("✓ Test 4 Passed: Diet sentences correctly modified and persisted.");

  console.log("\n All 4 verification test suites passed successfully!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
