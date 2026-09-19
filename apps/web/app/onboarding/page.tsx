"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  User,
  Phone,
  Calendar,
  Heart,
  AlertTriangle,
  MapPin,
  Utensils,
  Clock,
  Pill,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Sun,
  Moon,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

interface OnboardingFormState {
  // Step 2: Basic Details
  name: string;
  gender: string;
  age: string;
  dob: string;
  phone: string;
  bloodGroup: string;
  emergencyName: string;
  emergencyPhone: string;
  relationship: string;
  city: string;
  state: string;
  country: string;

  // Step 3: Health & Lifestyle
  diet: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  };
  dailyRoutine: string;
  allergies: string;
  medications: string;

  // Step 4: Customization
  theme: "light" | "dark";
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();

  const stepParam = parseInt(searchParams.get("step") || "2", 10);
  const currentStep = (stepParam >= 2 && stepParam <= 4 ? stepParam : 2) as 2 | 3 | 4;

  const [form, setForm] = useState<OnboardingFormState>({
    name: "",
    gender: "",
    age: "",
    dob: "",
    phone: "",
    bloodGroup: "",
    emergencyName: "",
    emergencyPhone: "",
    relationship: "",
    city: "",
    state: "",
    country: "India",
    diet: {
      breakfast: [],
      lunch: [],
      dinner: [],
    },
    dailyRoutine: "",
    allergies: "",
    medications: "",
    theme: "light",
  });

  // Inputs for adding diet sentences
  const [breakfastInput, setBreakfastInput] = useState("");
  const [lunchInput, setLunchInput] = useState("");
  const [dinnerInput, setDinnerInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync session details into initial state
  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || session.user?.name || "",
      }));
    }
  }, [session]);

  // Load existing profile if any (e.g. partial draft from Supabase)
  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.profile;
        const sb = data?.supabaseJson;

        if (p || sb) {
          const basic = sb?.basicDetails || {};
          const lifestyle = sb?.healthAndLifestyle || {};

          setForm((prev) => ({
            ...prev,
            name: basic.name || p?.name || prev.name,
            gender: basic.gender || p?.gender || prev.gender,
            dob: basic.dob || (p?.dob ? String(p.dob).slice(0, 10) : prev.dob),
            age: basic.age ? String(basic.age) : (p?.age ? String(p.age) : prev.age),
            phone: basic.phone || p?.phone || prev.phone,
            bloodGroup: basic.bloodGroup || p?.medical?.bloodGroup || prev.bloodGroup,
            emergencyName: basic.emergencyContact?.name || p?.emergency?.name || prev.emergencyName,
            emergencyPhone: basic.emergencyContact?.phone || p?.emergency?.phone || prev.emergencyPhone,
            relationship: basic.emergencyContact?.relationship || p?.emergency?.relationship || prev.relationship,
            city: basic.location?.city || p?.location?.city || prev.city,
            state: basic.location?.state || p?.location?.state || prev.state,
            country: basic.location?.country || p?.location?.country || prev.country,
            diet: lifestyle.diet || p?.diet || prev.diet,
            dailyRoutine: lifestyle.dailyRoutine || p?.dailyRoutine || prev.dailyRoutine,
            allergies: lifestyle.allergies || p?.medical?.allergies || prev.allergies,
            medications: lifestyle.medications || p?.medical?.medications || prev.medications,
            theme: sb?.customization?.theme || p?.customization?.theme || prev.theme,
          }));
        }
      } catch {
        // ignore
      }
    }
    loadExisting();
  }, []);

  // Update URL step helper
  const goToStep = (s: number) => {
    setError(null);
    router.push(`/onboarding?step=${s}`);
  };

  // Step 2 submission: saves draft to Supabase immediately so progress is never lost
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.gender) {
      setError("Please fill out required fields: Name and Gender.");
      return;
    }

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          onboardingCompleted: false,
          customization: { theme },
        }),
      });
    } catch {
      // background save failure doesn't block proceeding
    }

    goToStep(3);
  };

  // Step 3 transition: captures any pending typed sentence and saves draft
  const handleStep3Continue = async (isSkipping: boolean = false) => {
    let updatedDiet = { ...form.diet };

    if (!isSkipping) {
      if (breakfastInput.trim()) {
        updatedDiet.breakfast = [...(updatedDiet.breakfast || []), breakfastInput.trim()];
        setBreakfastInput("");
      }
      if (lunchInput.trim()) {
        updatedDiet.lunch = [...(updatedDiet.lunch || []), lunchInput.trim()];
        setLunchInput("");
      }
      if (dinnerInput.trim()) {
        updatedDiet.dinner = [...(updatedDiet.dinner || []), dinnerInput.trim()];
        setDinnerInput("");
      }
      setForm((prev) => ({ ...prev, diet: updatedDiet }));
    }

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          diet: isSkipping ? form.diet : updatedDiet,
          onboardingCompleted: false,
          customization: { theme },
        }),
      });
    } catch {
      // ignore
    }

    goToStep(4);
  };

  // Auto calculate age when DOB changes
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      let calculatedAge = prev.age;
      if (val) {
        const birthDate = new Date(val);
        const diff = Date.now() - birthDate.getTime();
        const ageDate = new Date(diff);
        calculatedAge = String(Math.abs(ageDate.getUTCFullYear() - 1970));
      }
      return {
        ...prev,
        dob: val,
        age: calculatedAge,
      };
    });
  };

  // Generic input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Diet sentence management
  const addDietSentence = (meal: "breakfast" | "lunch" | "dinner") => {
    const input = meal === "breakfast" ? breakfastInput : meal === "lunch" ? lunchInput : dinnerInput;
    const clean = input.trim();
    if (!clean) return;

    setForm((prev) => ({
      ...prev,
      diet: {
        ...prev.diet,
        [meal]: [...(prev.diet[meal] || []), clean],
      },
    }));

    if (meal === "breakfast") setBreakfastInput("");
    if (meal === "lunch") setLunchInput("");
    if (meal === "dinner") setDinnerInput("");
  };

  const removeDietSentence = (meal: "breakfast" | "lunch" | "dinner", index: number) => {
    setForm((prev) => ({
      ...prev,
      diet: {
        ...prev.diet,
        [meal]: prev.diet[meal].filter((_, i) => i !== index),
      },
    }));
  };

  // Save all details to Supabase & MongoDB and finish onboarding
  const handleCompleteOnboarding = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        customization: {
          theme: theme,
        },
        onboardingCompleted: true,
      };

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile to Supabase. Please retry.");
      }

      if (updateSession) {
        try {
          await updateSession({ onboardingCompleted: true, isNewUser: false });
        } catch {
          // ignore
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-6 px-4 max-w-4xl mx-auto flex flex-col justify-center">
      {/* Onboarding Step Header with Progress Line */}
      <OnboardingProgressBar
        currentStep={currentStep}
        title={
          currentStep === 2
            ? "Patient Basic Details"
            : currentStep === 3
            ? "Health & Lifestyle Details"
            : "Customize Your Experience"
        }
        subtitle={
          currentStep === 2
            ? "Step 2 out of 4: Necessary clinical details required for your patient file."
            : currentStep === 3
            ? "Step 3 out of 4: Add concise dietary notes, daily routine, and allergies (optional)."
            : "Step 4 out of 4: Set your visual theme. White mode is default; toggle to Dark mode smoothly."
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 max-w-2xl mx-auto w-full">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= STEP 2: BASIC DETAILS ================= */}
      {currentStep === 2 && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-border">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Basic Patient Details</h2>
            <span className="text-xs text-muted-foreground ml-auto">Required Information</span>
          </div>

          <form
            onSubmit={handleStep2Submit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Gender <span className="text-destructive">*</span>
                </label>
                <select
                  name="gender"
                  required
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleDobChange}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
              </div>

              {/* Age (auto-computed from DOB or editable) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Age (Years)</label>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="e.g. 28"
                  min="0"
                  max="125"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Blood Group</label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500" />
                  <select
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Emergency Contact Sub-section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Emergency Contact Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Contact Name</label>
                  <input
                    type="text"
                    name="emergencyName"
                    value={form.emergencyName}
                    onChange={handleChange}
                    placeholder="e.g. Jordan Johnson"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    name="emergencyPhone"
                    value={form.emergencyPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43211"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Relationship</label>
                  <input
                    type="text"
                    name="relationship"
                    value={form.relationship}
                    onChange={handleChange}
                    placeholder="e.g. Spouse / Parent"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Location Sub-section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => router.push("/auth")}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login / Step 1
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Continue to Step 3</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= STEP 3: HEALTH & LIFESTYLE (OPTIONAL) ================= */}
      {currentStep === 3 && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Diet &amp; Lifestyle Information</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
              Optional &bull; Can be skipped
            </span>
          </div>

          <div className="space-y-6">
            {/* Diet Columns: Breakfast, Lunch, Dinner */}
            <div>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-foreground">Dietary Routine</h3>
                <p className="text-xs text-muted-foreground">
                  Concise sections for your meals. Add sentences or meal notes under each column.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {/* 1. Breakfast Column */}
                <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5 text-amber-500" /> Breakfast
                      </span>
                      <span className="text-[10px] text-muted-foreground">{form.diet.breakfast.length} notes</span>
                    </div>

                    {/* Sentence List */}
                    <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                      {form.diet.breakfast.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                      ) : (
                        form.diet.breakfast.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-lg bg-card border border-border/70 flex items-start justify-between gap-1 group"
                          >
                            <span className="leading-snug text-foreground break-words flex-1">{item}</span>
                            <button
                              type="button"
                              onClick={() => removeDietSentence("breakfast", idx)}
                              className="text-muted-foreground hover:text-destructive opacity-80 transition-opacity p-0.5"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Input to add sentence */}
                  <div className="flex gap-1.5 pt-2 border-t border-border/50">
                    <input
                      type="text"
                      value={breakfastInput}
                      onChange={(e) => setBreakfastInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("breakfast"); } }}
                      placeholder="e.g. Oatmeal &amp; almonds"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addDietSentence("breakfast")}
                      className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* 2. Lunch Column */}
                <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-teal-600" /> Lunch
                      </span>
                      <span className="text-[10px] text-muted-foreground">{form.diet.lunch.length} notes</span>
                    </div>

                    {/* Sentence List */}
                    <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                      {form.diet.lunch.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                      ) : (
                        form.diet.lunch.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-lg bg-card border border-border/70 flex items-start justify-between gap-1 group"
                          >
                            <span className="leading-snug text-foreground break-words flex-1">{item}</span>
                            <button
                              type="button"
                              onClick={() => removeDietSentence("lunch", idx)}
                              className="text-muted-foreground hover:text-destructive opacity-80 transition-opacity p-0.5"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Input to add sentence */}
                  <div className="flex gap-1.5 pt-2 border-t border-border/50">
                    <input
                      type="text"
                      value={lunchInput}
                      onChange={(e) => setLunchInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("lunch"); } }}
                      placeholder="e.g. Brown rice &amp; dal"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addDietSentence("lunch")}
                      className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* 3. Dinner Column */}
                <div className="p-4 rounded-xl border border-border bg-background flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5 text-indigo-500" /> Dinner
                      </span>
                      <span className="text-[10px] text-muted-foreground">{form.diet.dinner.length} notes</span>
                    </div>

                    {/* Sentence List */}
                    <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                      {form.diet.dinner.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                      ) : (
                        form.diet.dinner.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-lg bg-card border border-border/70 flex items-start justify-between gap-1 group"
                          >
                            <span className="leading-snug text-foreground break-words flex-1">{item}</span>
                            <button
                              type="button"
                              onClick={() => removeDietSentence("dinner", idx)}
                              className="text-muted-foreground hover:text-destructive opacity-80 transition-opacity p-0.5"
                              title="Remove"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Input to add sentence */}
                  <div className="flex gap-1.5 pt-2 border-t border-border/50">
                    <input
                      type="text"
                      value={dinnerInput}
                      onChange={(e) => setDinnerInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("dinner"); } }}
                      placeholder="e.g. Light salad &amp; soup"
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addDietSentence("dinner")}
                      className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Routine */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Daily Routine
              </label>
              <textarea
                name="dailyRoutine"
                rows={2}
                value={form.dailyRoutine}
                onChange={handleChange}
                placeholder="e.g. Wake up 6:30 AM, 30 min morning walk, work 9-5, sleep 11 PM..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none resize-none"
              />
            </div>

            {/* Allergies & Medications (Shifted from Step 2 to Step 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Known Allergies
                </label>
                <textarea
                  name="allergies"
                  rows={2}
                  value={form.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Penicillin, Peanuts, Pollen (or leave blank if none)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-teal-600" /> Current Medications
                </label>
                <textarea
                  name="medications"
                  rows={2}
                  value={form.medications}
                  onChange={handleChange}
                  placeholder="e.g. Metformin 500mg daily, Vitamin D weekly (or leave blank)"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                />
              </div>
            </div>

            {/* Step Navigation & Skip Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 2
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStep3Continue(true)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-medium transition-all"
                >
                  Skip this Step
                </button>
                <button
                  type="button"
                  onClick={() => handleStep3Continue(false)}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <span>Continue to Step 4</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: CUSTOMIZATION (DARK MODE) ================= */}
      {currentStep === 4 && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-border">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Site Customization</h2>
            <span className="text-xs text-muted-foreground ml-auto">Visual Preferences</span>
          </div>

          <div className="space-y-8">
            {/* Dark Mode Toggle Section */}
            <div className="p-6 rounded-2xl border border-border bg-background transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    {theme === "dark" ? <Moon className="h-4 w-4 text-teal-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                    Theme Mode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    White mode is default for a clean clinical presentation. Toggle smoothly to Dark mode for low-light night conditions.
                  </p>
                </div>

                {/* The Smooth Transition Toggle Switch */}
                <div className="flex items-center gap-3 shrink-0">
                  <ThemeToggle showLabels />
                </div>
              </div>

              {/* Visual Theme Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {/* White Mode Card */}
                <div
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === "light"
                      ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 shadow-sm"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-amber-500" /> White Mode (Default)
                    </span>
                    {theme === "light" && <Check className="h-4 w-4 text-teal-600" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    High contrast, clinical-grade clarity optimal for daytime record reading.
                  </p>
                </div>

                {/* Dark Mode Card */}
                <div
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    theme === "dark"
                      ? "border-teal-600 bg-teal-950/40 shadow-sm"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Moon className="h-4 w-4 text-teal-400" /> Dark Mode
                    </span>
                    {theme === "dark" && <Check className="h-4 w-4 text-teal-400" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Deep charcoal slate, reduces eye fatigue in low-light environments.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Visual Preview of MediLocker in Selected Theme */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Live Interface Preview
                </span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                  Active Theme: {theme === "dark" ? "Dark Mode" : "White Mode (Default)"}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-background/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{form.name || "Alex Johnson"}</p>
                      <p className="text-[10px] text-muted-foreground">Patient Vault &bull; {form.bloodGroup || "O+"}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Clinical Trust Verified
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground">Resting Heart Rate</span>
                    <p className="text-sm font-bold text-foreground">72 bpm</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground">Blood Pressure</span>
                    <p className="text-sm font-bold text-foreground">118/76 mmHg</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted-foreground">Supabase Sync</span>
                    <p className="text-sm font-bold text-teal-600 dark:text-teal-400">Ready to Store</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Success state banner */}
            {saveSuccess && (
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Onboarding completed! Profile JSON saved in Supabase. Redirecting to your vault...</span>
              </div>
            )}

            {/* Completion Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => goToStep(3)}
                disabled={saving || saveSuccess}
                className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 3
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={saving || saveSuccess}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground text-xs font-medium transition-all"
                >
                  Skip &amp; Complete
                </button>
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={saving || saveSuccess}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-md hover:shadow-teal-600/20 transition-all"
                >
                  {saving ? (
                    <span>Saving to Supabase...</span>
                  ) : (
                    <>
                      <span>Complete Setup &amp; Launch Vault</span>
                      <ShieldCheck className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-sm text-muted-foreground">Loading onboarding vault...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
