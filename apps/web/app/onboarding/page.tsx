"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "motion/react";
import { OnboardingProgressBar } from "@/components/onboarding/OnboardingProgressBar";
import { InteractiveTiltCard } from "@/components/onboarding/InteractiveTiltCard";
import { FloatingField } from "@/components/onboarding/FloatingField";
import { CascadingSelect } from "@/components/onboarding/CascadingSelect";
import { InteractiveDatePicker } from "@/components/onboarding/InteractiveDatePicker";
import { MagneticButton } from "@/components/onboarding/MagneticButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  User,
  Phone,
  Calendar,
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

// Spring physics animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const headerDropVariants = {
  hidden: { opacity: 0, y: -26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 24,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
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

  // Step 2 submission: saves draft to Supabase immediately
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
  const handleDobChange = (e: { target: { name?: string; value: string } } | React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="min-h-[85vh] py-8 px-4 max-w-4xl mx-auto flex flex-col justify-center">
      {/* Dynamic Liquid Fill Onboarding Progress Bar */}
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
            ? "Step 2 out of 4: Necessary clinical details required for your patient vault."
            : currentStep === 3
            ? "Step 3 out of 4: Add concise dietary notes, daily routine, and allergies (optional)."
            : "Step 4 out of 4: Set your visual theme. White mode is default; toggle to Dark mode smoothly."
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2.5 max-w-2xl mx-auto w-full shadow-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}

      {/* ================= STEP 2: BASIC DETAILS (CRAZY HIGH-OCTANE UI) ================= */}
      {currentStep === 2 && (
        <InteractiveTiltCard glowColor="rgba(13, 148, 136, 0.45)">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* 1. Header Drops in with Spring Physics */}
            <motion.div
              variants={headerDropVariants}
              className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    Basic Patient Details
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Required clinical information for your secure vault
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200/70 dark:border-teal-800/70">
                Step 2 of 4
              </span>
            </motion.div>

            {/* 2. Staggered Form Fields */}
            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* Row 1: Full Name & Cascading Gender Select */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FloatingField
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  icon={<User className="h-4 w-4" />}
                  placeholder="e.g. Alex Johnson"
                />

                <CascadingSelect
                  label="Gender"
                  name="gender"
                  value={form.gender}
                  onChange={(val) => setForm((prev) => ({ ...prev, gender: val }))}
                  required
                  options={[
                    { label: "Male", value: "Male" },
                    { label: "Female", value: "Female" },
                    { label: "Other", value: "Other" },
                    { label: "Prefer not to say", value: "Prefer not to say" },
                  ]}
                  icon={<User className="h-4 w-4" />}
                  placeholder="Select Gender"
                />
              </motion.div>

              {/* Row 2: Custom Date Picker Popover & Auto-Computed Age */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <InteractiveDatePicker
                  label="Date of Birth"
                  name="dob"
                  value={form.dob}
                  onChange={handleDobChange}
                />

                <FloatingField
                  label="Age (Years)"
                  name="age"
                  type="number"
                  value={form.age}
                  onChange={handleChange}
                  min="0"
                  max="125"
                  placeholder="Auto-computed or enter age"
                />
              </motion.div>

              {/* Row 3: Phone Number & Blood Group with HeartPulse Easter Egg */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FloatingField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  icon={<Phone className="h-4 w-4" />}
                  placeholder="+91 98765 43210"
                />

                <CascadingSelect
                  label="Blood Group"
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={(val) => setForm((prev) => ({ ...prev, bloodGroup: val }))}
                  isBloodGroup={true}
                  options={[
                    { label: "A+ (A Positive)", value: "A+" },
                    { label: "A- (A Negative)", value: "A-" },
                    { label: "B+ (B Positive)", value: "B+" },
                    { label: "B- (B Negative)", value: "B-" },
                    { label: "O+ (Universal Donor)", value: "O+", hint: "Universal Donor" },
                    { label: "O- (Universal Red Cell)", value: "O-", hint: "Universal Red Cell" },
                    { label: "AB+ (Universal Recipient)", value: "AB+", hint: "Universal Recipient" },
                    { label: "AB- (AB Negative)", value: "AB-" },
                  ]}
                  placeholder="Select Blood Group"
                />
              </motion.div>

              {/* Row 4: Emergency Contact Sub-section */}
              <motion.div
                variants={itemVariants}
                className="pt-4 border-t border-slate-100 dark:border-slate-800"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Emergency Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FloatingField
                    label="Contact Name"
                    name="emergencyName"
                    value={form.emergencyName}
                    onChange={handleChange}
                    placeholder="e.g. Jordan Johnson"
                  />
                  <FloatingField
                    label="Contact Phone"
                    name="emergencyPhone"
                    type="tel"
                    value={form.emergencyPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43211"
                  />
                  <FloatingField
                    label="Relationship"
                    name="relationship"
                    value={form.relationship}
                    onChange={handleChange}
                    placeholder="e.g. Spouse / Parent"
                  />
                </div>
              </motion.div>

              {/* Row 5: Location Sub-section */}
              <motion.div
                variants={itemVariants}
                className="pt-4 border-t border-slate-100 dark:border-slate-800"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FloatingField
                    label="City"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    icon={<MapPin className="h-4 w-4" />}
                    placeholder="e.g. Bengaluru"
                  />
                  <FloatingField
                    label="State"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="e.g. Karnataka"
                  />
                  <FloatingField
                    label="Country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="e.g. India"
                  />
                </div>
              </motion.div>

              {/* Row 6: Navigation Buttons with Heavy Interaction Physics */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth" })}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Login / Step 1
                </button>

                {/* Magnetic Continue Button with Ripple and Squish Physics */}
                <MagneticButton type="submit">
                  <span>Continue to Step 3</span>
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </motion.div>
            </form>
          </motion.div>
        </InteractiveTiltCard>
      )}

      {/* ================= STEP 3: HEALTH & LIFESTYLE (OPTIONAL) ================= */}
      {currentStep === 3 && (
        <InteractiveTiltCard glowColor="rgba(13, 148, 136, 0.40)">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div
              variants={headerDropVariants}
              className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    Diet &amp; Lifestyle Information
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Nutritional preferences and health habits
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                Optional &bull; Can be skipped
              </span>
            </motion.div>

            <div className="space-y-6">
              {/* Diet Columns: Breakfast, Lunch, Dinner */}
              <motion.div variants={itemVariants}>
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-foreground">Dietary Routine</h3>
                  <p className="text-xs text-muted-foreground">
                    Concise sections for your meals. Add sentences or meal notes under each column.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  {/* 1. Breakfast Column */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-card/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sun className="h-3.5 w-3.5 text-amber-500" /> Breakfast
                        </span>
                        <span className="text-[10px] text-muted-foreground">{form.diet.breakfast.length} notes</span>
                      </div>

                      <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                        {form.diet.breakfast.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                        ) : (
                          form.diet.breakfast.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs p-2 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-1 group shadow-2xs"
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

                    <div className="flex gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <input
                        type="text"
                        value={breakfastInput}
                        onChange={(e) => setBreakfastInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("breakfast"); } }}
                        placeholder="e.g. Oatmeal & almonds"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card text-foreground outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => addDietSentence("breakfast")}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  {/* 2. Lunch Column */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-card/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-teal-600" /> Lunch
                        </span>
                        <span className="text-[10px] text-muted-foreground">{form.diet.lunch.length} notes</span>
                      </div>

                      <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                        {form.diet.lunch.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                        ) : (
                          form.diet.lunch.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs p-2 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-1 group shadow-2xs"
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

                    <div className="flex gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <input
                        type="text"
                        value={lunchInput}
                        onChange={(e) => setLunchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("lunch"); } }}
                        placeholder="e.g. Brown rice & dal"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card text-foreground outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => addDietSentence("lunch")}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  {/* 3. Dinner Column */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-card/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Moon className="h-3.5 w-3.5 text-indigo-500" /> Dinner
                        </span>
                        <span className="text-[10px] text-muted-foreground">{form.diet.dinner.length} notes</span>
                      </div>

                      <div className="space-y-1.5 min-h-[80px] max-h-[140px] overflow-y-auto mb-3">
                        {form.diet.dinner.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic py-2">No sentences added yet</p>
                        ) : (
                          form.diet.dinner.map((item, idx) => (
                            <div
                              key={idx}
                              className="text-xs p-2 rounded-xl bg-white dark:bg-card border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-1 group shadow-2xs"
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

                    <div className="flex gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <input
                        type="text"
                        value={dinnerInput}
                        onChange={(e) => setDinnerInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("dinner"); } }}
                        placeholder="e.g. Light salad & soup"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card text-foreground outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => addDietSentence("dinner")}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Daily Routine */}
              <motion.div variants={itemVariants}>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-teal-600" /> Daily Routine
                </label>
                <textarea
                  name="dailyRoutine"
                  rows={2}
                  value={form.dailyRoutine}
                  onChange={handleChange}
                  placeholder="e.g. Wake up 6:30 AM, 30 min morning walk, work 9-5, sleep 11 PM..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-none transition-all shadow-xs"
                />
              </motion.div>

              {/* Allergies & Medications */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Known Allergies
                  </label>
                  <textarea
                    name="allergies"
                    rows={2}
                    value={form.allergies}
                    onChange={handleChange}
                    placeholder="e.g. Penicillin, Peanuts, Pollen (or leave blank)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-none transition-all shadow-xs"
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-none transition-all shadow-xs"
                  />
                </div>
              </motion.div>

              {/* Step Navigation & Skip Buttons */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 2
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStep3Continue(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground text-xs font-medium transition-all"
                  >
                    Skip this Step
                  </button>

                  <MagneticButton type="button" onClick={() => handleStep3Continue(false)}>
                    <span>Continue to Step 4</span>
                    <ArrowRight className="h-4 w-4" />
                  </MagneticButton>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </InteractiveTiltCard>
      )}

      {/* ================= STEP 4: CUSTOMIZATION (DARK MODE) ================= */}
      {currentStep === 4 && (
        <InteractiveTiltCard glowColor="rgba(13, 148, 136, 0.40)">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.div
              variants={headerDropVariants}
              className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60 shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">
                    Site Customization
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Visual preferences for your clinical vault
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
                Final Step 4 of 4
              </span>
            </motion.div>

            <div className="space-y-6">
              {/* Dark Mode Toggle Section */}
              <motion.div variants={itemVariants} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-card/60 transition-colors duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      {theme === "dark" ? <Moon className="h-4 w-4 text-teal-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
                      Theme Mode
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
                      White mode is default for a clean clinical presentation. Toggle smoothly to Dark mode for low-light night conditions.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <ThemeToggle showLabels />
                  </div>
                </div>

                {/* Visual Theme Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div
                    onClick={() => setTheme("light")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      theme === "light"
                        ? "border-teal-600 bg-white dark:bg-card shadow-md shadow-teal-600/10"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:border-slate-300"
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

                  <div
                    onClick={() => setTheme("dark")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      theme === "dark"
                        ? "border-teal-600 bg-white dark:bg-card shadow-md shadow-teal-600/10"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-card hover:border-slate-300"
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
              </motion.div>

              {/* Live Visual Preview */}
              <motion.div variants={itemVariants} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-xs transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-600" />
                    Live Vault Preview
                  </span>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                    Active Theme: {theme === "dark" ? "Dark Mode" : "White Mode (Default)"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-card/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
                        {form.name ? form.name.charAt(0).toUpperCase() : "A"}
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xs">
                      <span className="text-[10px] text-muted-foreground">Resting Heart Rate</span>
                      <p className="text-sm font-bold text-foreground">72 bpm</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xs">
                      <span className="text-[10px] text-muted-foreground">Blood Pressure</span>
                      <p className="text-sm font-bold text-foreground">118/76 mmHg</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xs col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground">Supabase Sync</span>
                      <p className="text-sm font-bold text-teal-600 dark:text-teal-400">Ready to Store</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Success state banner */}
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0 animate-bounce" />
                  <span>Onboarding completed! Profile JSON stored in Supabase. Redirecting to your vault...</span>
                </motion.div>
              )}

              {/* Completion Buttons with Magnetic Physics */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  disabled={saving || saveSuccess}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Step 3
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={saving || saveSuccess}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground text-xs font-medium transition-all"
                  >
                    Skip &amp; Complete
                  </button>

                  <MagneticButton
                    type="button"
                    onClick={handleCompleteOnboarding}
                    disabled={saving || saveSuccess}
                  >
                    {saving ? (
                      <span>Saving to Supabase...</span>
                    ) : (
                      <>
                        <span>Complete Setup &amp; Launch Vault</span>
                        <ShieldCheck className="h-4 w-4" />
                      </>
                    )}
                  </MagneticButton>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </InteractiveTiltCard>
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
