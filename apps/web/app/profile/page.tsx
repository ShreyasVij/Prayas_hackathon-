"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
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
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus,
  Save,
  Sun,
  Moon,
  Cloud,
  Check,
} from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  /* ================= FORM STATE ================= */

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    age: "",
    gender: "",
    bloodGroup: "",
    allergies: "",
    conditions: "",
    medications: "",
    emergencyName: "",
    emergencyPhone: "",
    relationship: "",
    city: "",
    state: "",
    country: "India",
    diet: {
      breakfast: [] as string[],
      lunch: [] as string[],
      dinner: [] as string[],
    },
    dailyRoutine: "",
    profileImage: null as File | null,
    profileImageName: "",
    profileImagePreviewUrl: "",
    role: "Patient",
  });

  // Diet inputs
  const [breakfastInput, setBreakfastInput] = useState("");
  const [lunchInput, setLunchInput] = useState("");
  const [dinnerInput, setDinnerInput] = useState("");

  const [userMetadata, setUserMetadata] = useState({
    joinedDate: "",
    status: "Active",
    verified: false,
    supabaseSynced: false,
  });

  const [bannerColor, setBannerColor] = useState("linear-gradient(to right, rgb(13, 148, 136), rgb(15, 118, 110))");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPreviewUrl, setConfirmPreviewUrl] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionUser(user);
        setForm((prev) => ({
          ...prev,
          name: prev.name || user.user_metadata?.name || "",
          email: prev.email || user.email || "",
        }));
      }
      setAuthLoading(false);
    });
  }, []);

  // Extract dominant color from image
  const extractDominantColor = (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      const pixelCount = data.length / 4;
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);

      const lighterR = Math.min(255, r + 40);
      const lighterG = Math.min(255, g + 40);
      const lighterB = Math.min(255, b + 40);

      const darkerR = Math.max(0, r - 40);
      const darkerG = Math.max(0, g - 40);
      const darkerB = Math.max(0, b - 40);

      setBannerColor(
        `linear-gradient(to right, rgb(${lighterR}, ${lighterG}, ${lighterB}), rgb(${darkerR}, ${darkerG}, ${darkerB}))`
      );
    };
  };

  // Map gender
  function genderEnumToLabel(g?: string | null): string {
    switch ((g || "").toLowerCase()) {
      case "male":
        return "Male";
      case "female":
        return "Female";
      case "other":
        return "Other";
      case "prefer_not_to_say":
        return "Prefer not to say";
      default:
        return g || "";
    }
  }

  // Hydrate form from saved profile (Supabase + DB)
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.profile;
        const user = data?.user;
        const sb = data?.supabaseJson;

        if (p || sb) {
          const basic = sb?.basicDetails || {};
          const lifestyle = sb?.healthAndLifestyle || {};

          setForm((prev) => ({
            ...prev,
            name: basic.name || p?.name || prev.name,
            email: user?.email || prev.email,
            phone: basic.phone ?? p?.phone ?? "",
            dob: basic.dob ? String(basic.dob).slice(0, 10) : p?.dob ? new Date(p.dob).toISOString().slice(0, 10) : "",
            age: basic.age ? String(basic.age) : p?.age ? String(p.age) : "",
            gender: genderEnumToLabel(basic.gender || p?.gender),
            profileImageName: basic.profileImageName ?? p?.profileImageName ?? "",
            profileImagePreviewUrl: basic.profileImageUrl ?? p?.profileImageUrl ?? "",
            bloodGroup: basic.bloodGroup ?? p?.medical?.bloodGroup ?? "",
            allergies: lifestyle.allergies ?? p?.medical?.allergies ?? "",
            conditions: p?.medical?.conditions ?? "",
            medications: lifestyle.medications ?? p?.medical?.medications ?? "",
            emergencyName: basic.emergencyContact?.name ?? p?.emergency?.name ?? "",
            emergencyPhone: basic.emergencyContact?.phone ?? p?.emergency?.phone ?? "",
            relationship: basic.emergencyContact?.relationship ?? p?.emergency?.relationship ?? "",
            city: basic.location?.city ?? p?.location?.city ?? "",
            state: basic.location?.state ?? p?.location?.state ?? "",
            country: basic.location?.country ?? p?.location?.country ?? prev.country,
            diet: {
              breakfast: lifestyle.diet?.breakfast || p?.diet?.breakfast || [],
              lunch: lifestyle.diet?.lunch || p?.diet?.lunch || [],
              dinner: lifestyle.diet?.dinner || p?.diet?.dinner || [],
            },
            dailyRoutine: lifestyle.dailyRoutine || p?.dailyRoutine || "",
          }));

          if (basic.profileImageUrl || p?.profileImageUrl) {
            extractDominantColor(basic.profileImageUrl || p?.profileImageUrl);
          }

          if (sb?.customization?.theme || p?.customization?.theme) {
            const serverTheme = sb?.customization?.theme || p?.customization?.theme;
            if (serverTheme === "dark" || serverTheme === "light") {
              setTheme(serverTheme);
            }
          }
        }

        if (user) {
          setUserMetadata({
            joinedDate: user.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Recently",
            status: user.status === "active" ? "Active" : user.status || "Active",
            verified: !!user.googleSub,
            supabaseSynced: true,
          });
        }
      } catch {
        // ignore
      }
    }

    if (sessionUser) {
      loadProfile();
    }
  }, [sessionUser, setTheme]);

  // Handle Diet sentence addition
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

  const removeDietSentence = (meal: "breakfast" | "lunch" | "dinner", idx: number) => {
    setForm((prev) => ({
      ...prev,
      diet: {
        ...prev.diet,
        [meal]: prev.diet[meal].filter((_, i) => i !== idx),
      },
    }));
  };

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

  const handleChange = (e: any) => {
    const { name, value, files } = e.target;

    if (name === "profileImage") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        profileImage: file,
        profileImageName: file?.name || "",
      }));
      if (file) {
        try {
          const objUrl = URL.createObjectURL(file);
          setConfirmPreviewUrl(objUrl);
          setConfirmOpen(true);
          extractDominantColor(objUrl);
        } catch {}
      } else {
        if (confirmPreviewUrl) {
          try { URL.revokeObjectURL(confirmPreviewUrl); } catch {}
          setConfirmPreviewUrl("");
        }
        setConfirmOpen(false);
      }
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (form.profileImage) {
      const objUrl = URL.createObjectURL(form.profileImage);
      setConfirmPreviewUrl(objUrl);
      setConfirmOpen(true);
      return;
    }

    return saveProfileConfirmed();
  };

  const saveProfileConfirmed = async () => {
    setSaving(true);
    let avatarUrl: string | undefined = undefined;
    let avatarFileName: string | undefined = form.profileImage?.name || form.profileImageName || undefined;

    try {
      if (form.profileImage) {
        const fd = new FormData();
        fd.append("file", form.profileImage);
        const up = await fetch("/api/profile/avatar", { method: "POST", body: fd });
        if (up.ok) {
          const data = await up.json();
          avatarUrl = data?.url || undefined;
          avatarFileName = form.profileImage?.name || avatarFileName;
          setForm((prev) => ({ ...prev, profileImagePreviewUrl: avatarUrl || prev.profileImagePreviewUrl }));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("profile:updated"));
          }
        }
      }

      // Absorb any pending diet inputs
      const currentDiet = { ...form.diet };
      if (breakfastInput.trim()) {
        currentDiet.breakfast = [...(currentDiet.breakfast || []), breakfastInput.trim()];
        setBreakfastInput("");
      }
      if (lunchInput.trim()) {
        currentDiet.lunch = [...(currentDiet.lunch || []), lunchInput.trim()];
        setLunchInput("");
      }
      if (dinnerInput.trim()) {
        currentDiet.dinner = [...(currentDiet.dinner || []), dinnerInput.trim()];
        setDinnerInput("");
      }

      // Save profile JSON to Supabase and MongoDB
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          diet: currentDiet,
          profileImage: undefined,
          avatarUrl: avatarUrl || form.profileImagePreviewUrl,
          avatarFileName,
          customization: {
            theme: theme,
          },
          onboardingCompleted: true,
        }),
      });

      if (res.ok) {
        setSaveToast("Profile details and Supabase JSON updated successfully!");
        setUserMetadata((prev) => ({ ...prev, supabaseSynced: true }));
        setForm((prev) => ({ ...prev, diet: currentDiet, profileImage: null }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile:updated"));
        }
        setTimeout(() => setSaveToast(null), 4000);
      } else {
        alert("Failed to save profile. Please try again.");
      }
    } catch (e) {
      alert("Unexpected error saving profile");
    } finally {
      setSaving(false);
      if (confirmPreviewUrl) {
        try { URL.revokeObjectURL(confirmPreviewUrl); } catch {}
        setConfirmPreviewUrl("");
      }
      setConfirmOpen(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      const res = await fetch("/api/profile/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete profile");
        return;
      }
      alert("Your profile and all associated data have been permanently deleted.");
      await supabase.auth.signOut();
      window.location.href = "/home";
    } catch (error) {
      console.error("Failed to delete profile:", error);
      alert("An error occurred while deleting your profile.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading patient profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header with Title and Supabase Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Patient Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage clinical identity, health lifestyle details, and Supabase JSON sync.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold shadow-xs">
              <Cloud className="h-3.5 w-3.5 text-teal-600" />
              <span>Supabase JSON Synced</span>
            </span>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {saveToast && (
          <div className="mb-6 p-4 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all">
            <CheckCircle2 className="h-4.5 w-4.5 text-teal-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        {!sessionUser ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-6 text-sm text-amber-800 dark:text-amber-300">
            You are currently not signed in.{" "}
            <Link href="/auth" className="font-bold underline ml-1">
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ================= LEFT COLUMN: USER SUMMARY CARD ================= */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-2xl shadow-xs border border-border overflow-hidden transition-colors duration-300">
                {/* Banner */}
                <div
                  className="h-28 transition-all duration-500"
                  style={{ background: bannerColor }}
                />

                {/* Avatar & Basic Info */}
                <div className="px-6 pb-6">
                  <div className="flex justify-center -mt-14 mb-4">
                    <div className="relative">
                      {form.profileImagePreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.profileImagePreviewUrl}
                          alt="Profile"
                          className="h-24 w-24 rounded-full object-cover border-4 border-card shadow-md"
                        />
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-card border-4 border-card shadow-md flex items-center justify-center">
                          <span className="text-3xl font-extrabold text-primary">
                            {form.name ? form.name.charAt(0).toUpperCase() : "P"}
                          </span>
                        </div>
                      )}
                      <label
                        htmlFor="profileImageUpload"
                        className="absolute bottom-0 right-0 bg-card border border-border rounded-full p-2 shadow-sm cursor-pointer hover:bg-muted text-foreground transition-colors"
                        title="Upload Picture"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <input
                          id="profileImageUpload"
                          type="file"
                          name="profileImage"
                          accept="image/*"
                          onChange={handleChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <h2 className="text-xl font-bold text-foreground">{form.name || "Patient"}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{form.email}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 justify-center mb-5 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Patient
                    </span>
                    {form.bloodGroup && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Blood: {form.bloodGroup}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-border pt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Joined
                      </span>
                      <span className="font-semibold text-foreground">{userMetadata.joinedDate}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Status
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-400">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                        {userMetadata.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Cloud className="h-3.5 w-3.5 text-teal-600" /> Supabase JSON
                      </span>
                      <span className="font-semibold text-teal-700 dark:text-teal-400">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone Card */}
              <div className="bg-card rounded-2xl border border-destructive/20 p-5 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-destructive mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  Danger Zone
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Permanently delete your profile, documents, and Supabase data.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full py-2 px-3 bg-destructive text-destructive-foreground font-semibold text-xs rounded-xl hover:opacity-90 transition-opacity"
                >
                  Delete Profile Permanently
                </button>
              </div>
            </div>

            {/* ================= RIGHT COLUMN: EDITABLE CARDS ================= */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Personal & Basic Information */}
              <div className="bg-card rounded-2xl shadow-xs border border-border p-6 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      disabled
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-muted text-muted-foreground outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={handleDobChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={form.age}
                      onChange={handleChange}
                      placeholder="e.g. 29"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Gender</label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/30"
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

              {/* Card 2: Emergency Contact & Location */}
              <div className="bg-card rounded-2xl shadow-xs border border-border p-6 transition-colors duration-300">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-bold text-foreground">Emergency Contact &amp; Location</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Emergency Name</label>
                    <input
                      type="text"
                      name="emergencyName"
                      value={form.emergencyName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Emergency Phone</label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={form.emergencyPhone}
                      onChange={handleChange}
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
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
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

              {/* Card 3: Health & Lifestyle (Shifted from basic profile) */}
              <div className="bg-card rounded-2xl shadow-xs border border-border p-6 transition-colors duration-300">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Health &amp; Lifestyle Details</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Synced to Supabase JSON
                  </span>
                </div>

                {/* Diet Section: Breakfast, Lunch, Dinner */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Dietary Breakdown
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add concise meal sentences under each column.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Breakfast */}
                    <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                          <Sun className="h-3.5 w-3.5 text-amber-500" /> Breakfast
                        </span>
                        <div className="space-y-1.5 min-h-[60px] max-h-[120px] overflow-y-auto mb-2">
                          {form.diet.breakfast.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic">No notes</span>
                          ) : (
                            form.diet.breakfast.map((it, i) => (
                              <div key={i} className="text-xs p-1.5 rounded-md bg-card border border-border/80 flex items-center justify-between gap-1">
                                <span className="leading-tight text-foreground truncate">{it}</span>
                                <button type="button" onClick={() => removeDietSentence("breakfast", i)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 pt-1.5 border-t border-border/60">
                        <input
                          type="text"
                          value={breakfastInput}
                          onChange={(e) => setBreakfastInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("breakfast"); } }}
                          placeholder="Add sentence..."
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                        />
                        <button type="button" onClick={() => addDietSentence("breakfast")} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                          +
                        </button>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                          <Clock className="h-3.5 w-3.5 text-teal-600" /> Lunch
                        </span>
                        <div className="space-y-1.5 min-h-[60px] max-h-[120px] overflow-y-auto mb-2">
                          {form.diet.lunch.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic">No notes</span>
                          ) : (
                            form.diet.lunch.map((it, i) => (
                              <div key={i} className="text-xs p-1.5 rounded-md bg-card border border-border/80 flex items-center justify-between gap-1">
                                <span className="leading-tight text-foreground truncate">{it}</span>
                                <button type="button" onClick={() => removeDietSentence("lunch", i)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 pt-1.5 border-t border-border/60">
                        <input
                          type="text"
                          value={lunchInput}
                          onChange={(e) => setLunchInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("lunch"); } }}
                          placeholder="Add sentence..."
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                        />
                        <button type="button" onClick={() => addDietSentence("lunch")} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                          +
                        </button>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                          <Moon className="h-3.5 w-3.5 text-indigo-500" /> Dinner
                        </span>
                        <div className="space-y-1.5 min-h-[60px] max-h-[120px] overflow-y-auto mb-2">
                          {form.diet.dinner.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic">No notes</span>
                          ) : (
                            form.diet.dinner.map((it, i) => (
                              <div key={i} className="text-xs p-1.5 rounded-md bg-card border border-border/80 flex items-center justify-between gap-1">
                                <span className="leading-tight text-foreground truncate">{it}</span>
                                <button type="button" onClick={() => removeDietSentence("dinner", i)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 pt-1.5 border-t border-border/60">
                        <input
                          type="text"
                          value={dinnerInput}
                          onChange={(e) => setDinnerInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDietSentence("dinner"); } }}
                          placeholder="Add sentence..."
                          className="flex-1 px-2 py-1 text-xs rounded-lg border border-input bg-card text-foreground outline-none"
                        />
                        <button type="button" onClick={() => addDietSentence("dinner")} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Routine, Allergies, Medications */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Daily Routine</label>
                    <textarea
                      name="dailyRoutine"
                      rows={2}
                      value={form.dailyRoutine}
                      onChange={handleChange}
                      placeholder="Describe daily sleep, wake, or workout routine..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Allergies</label>
                      <textarea
                        name="allergies"
                        rows={2}
                        value={form.allergies}
                        onChange={handleChange}
                        placeholder="e.g. Penicillin, Peanuts..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Current Medications</label>
                      <textarea
                        name="medications"
                        rows={2}
                        value={form.medications}
                        onChange={handleChange}
                        placeholder="e.g. Metformin 500mg daily..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Site Customization (Smooth Dark Mode Toggle) */}
              <div className="bg-card rounded-2xl shadow-xs border border-border p-6 transition-colors duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="text-base font-bold text-foreground">Site Customization</h3>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md">
                      White mode is default. Toggle smoothly between White and Dark mode across MediLocker.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <ThemeToggle showLabels />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md hover:shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? "Saving to Supabase & MongoDB..." : "Save Profile & Update Supabase JSON"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal for image upload */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Profile Picture"
        description="Upload this image as your profile picture and sync to Supabase?"
        imageUrl={confirmPreviewUrl || undefined}
        fileName={form.profileImage?.name || form.profileImageName || ""}
        confirmText="Upload & Save"
        cancelText="Cancel"
        onConfirm={() => saveProfileConfirmed()}
        onCancel={() => {
          if (confirmPreviewUrl) {
            try { URL.revokeObjectURL(confirmPreviewUrl); } catch {}
            setConfirmPreviewUrl("");
          }
          setConfirmOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 border border-border">
            <h3 className="text-lg font-bold text-destructive mb-2">Delete Profile Permanently?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              This will permanently delete your user account, health records, vitals, and Supabase JSON file. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-semibold hover:opacity-90"
              >
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
