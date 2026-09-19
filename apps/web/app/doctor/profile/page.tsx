"use client";

import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { 
  Stethoscope, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Building, 
  Save, 
  AlertTriangle, 
  Trash2, 
  Camera,
  CheckCircle2,
  Loader2
} from "lucide-react";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import LocationPinMap from "@/components/LocationPinMap";

export default function ProfilePage() {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    allergies: "",
    conditions: "",
    medications: "",
    emergencyName: "",
    emergencyPhone: "",
    relationship: "",
    address: "",
    latitude: 0,
    longitude: 0,
    city: "",
    state: "",
    country: "India",
    profileImage: null as File | null,
    profileImageName: "",
    profileImagePreviewUrl: "",
    role: "Doctor"
  });

  const [showLocationMap, setShowLocationMap] = useState(false);
  const [userMetadata, setUserMetadata] = useState({
    verified: true,
    joinedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: "Active"
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPreviewUrl, setConfirmPreviewUrl] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Hydrate form from saved profile on load
  useEffect(() => {
    async function loadProfile() {
      try {
        const registerRes = await fetch("/api/doctor/register", { method: "POST" });
        if (!registerRes.ok) {
          console.warn("Failed to register as doctor");
        }

        const res = await fetch("/api/doctor/profile", { method: "GET" });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.profile;
        if (!p) return;

        setForm((prev) => ({
          ...prev,
          phone: p.phone ?? "",
          dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : "",
          gender: genderEnumToLabel(p.gender),
          profileImageName: p.profileImageName ?? "",
          profileImagePreviewUrl: p.profileImageUrl ?? p.profileImagePreviewUrl ?? "",
          address: p.location?.hos ?? "",
          latitude: p.location?.latitude ?? 0,
          longitude: p.location?.longitude ?? 0,
          city: p.location?.city ?? "",
          state: p.location?.state ?? "",
          country: p.location?.country ?? prev.country,
        }));
      } catch {
        // noop: fallback
      }
    }
    if (sessionUser) {
      loadProfile();
    }
  }, [sessionUser]);

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
        return "";
    }
  }

  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      const res = await fetch("/api/doctor/profile/delete", { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete profile");
        return;
      }

      alert("Your doctor profile and all associated data have been permanently deleted.");
      window.location.href = "/auth";
    } catch (error) {
      console.error("Failed to delete profile:", error);
      alert("An error occurred while deleting your profile. Please try again.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
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

  const handleLocationSelect = (location: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setForm((prev) => ({
      ...prev,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
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
    setSaveSuccess(false);
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
          setForm((prev) => ({ ...prev, profileImage: null }));
          if (confirmPreviewUrl) {
            try { URL.revokeObjectURL(confirmPreviewUrl); } catch {}
            setConfirmPreviewUrl("");
          }
          setConfirmOpen(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3500);
          setSaving(false);
          return;
        } else {
          let errMsg = "Failed to upload profile picture";
          try { const e = await up.json(); errMsg = e?.error || errMsg; } catch {}
          alert(errMsg);
          setSaving(false);
          return;
        }
      }

      const res = await fetch("/api/doctor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          profileImage: undefined,
          avatarUrl,
          avatarFileName,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        setForm((prev) => ({ ...prev, profileImage: null }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("profile:updated"));
        }
      } else {
        alert("Failed to save profile");
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

  if (!mounted || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-zinc-500">Loading Clinical Profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                Healthcare Provider
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Doctor Profile & Practice
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Manage your credentials, clinic pin location, and clinical account settings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 transition-all"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? "Saving..." : saveSuccess ? "Saved Successfully" : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {!sessionUser ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <span>You are viewing the profile in guest mode. Please sign in to save credentials.</span>
            </div>
            <Link 
              href="/auth?callbackUrl=/doctor/profile" 
              className="px-4 py-1.5 bg-amber-600 text-white rounded-lg font-medium text-xs hover:bg-amber-700 transition"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: PROVIDER HERO CARD */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
                {/* Banner Gradient */}
                <div className="h-28 bg-gradient-to-r from-teal-700 via-teal-800 to-zinc-900 relative">
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-[10px] text-teal-100 font-medium tracking-wide flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-teal-300" />
                    Verified Provider
                  </div>
                </div>

                {/* Profile Card Body */}
                <div className="px-6 pb-6 pt-0">
                  {/* Avatar Upload */}
                  <div className="flex justify-center -mt-14 mb-4">
                    <div className="relative group">
                      {form.profileImagePreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={form.profileImagePreviewUrl} 
                          alt="Doctor Profile" 
                          className="h-28 w-28 rounded-2xl object-cover border-4 border-white shadow-md" 
                        />
                      ) : (
                        <div className="h-28 w-28 rounded-2xl bg-teal-50 border-4 border-white shadow-md flex items-center justify-center text-teal-700 font-extrabold text-3xl">
                          {form.name ? form.name.charAt(0).toUpperCase() : "D"}
                        </div>
                      )}
                      
                      <label 
                        htmlFor="doctorAvatarUpload" 
                        className="absolute bottom-1 right-1 p-2 rounded-xl bg-white text-zinc-700 hover:text-teal-600 hover:bg-teal-50 shadow-md border border-slate-200 cursor-pointer transition-all"
                        title="Change Avatar"
                      >
                        <Camera className="w-4 h-4" />
                        <input
                          id="doctorAvatarUpload"
                          type="file"
                          name="profileImage"
                          accept="image/*"
                          onChange={handleChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="text-center mb-5">
                    <h2 className="text-lg font-bold text-zinc-900">
                      {form.name.startsWith("Dr.") ? form.name : `Dr. ${form.name || "Practitioner"}`}
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{form.email}</p>
                    
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        Doctor / Physician
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Practice
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 my-4" />

                  {/* Meta Information */}
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-zinc-600">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        Joined MediLocker
                      </span>
                      <span className="font-semibold text-zinc-700">{userMetadata.joinedDate}</span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-600">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Building className="h-3.5 w-3.5" />
                        Practice City
                      </span>
                      <span className="font-semibold text-zinc-700">{form.city || form.state || "Not Set"}</span>
                    </div>

                    {form.address && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] text-zinc-400 block mb-1">Clinic Address</span>
                        <p className="font-medium text-zinc-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                          {form.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Security Tag */}
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-teal-900">Provider Verification</p>
                  <p className="text-teal-700 mt-0.5">
                    Your account is registered as a verified physician. Patient consultations and prescriptions issued from this portal are cryptographically signed.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILED PRACTICE & PERSONAL DETAILS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Personal Information Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-7">
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Provider Details</h3>
                    <p className="text-xs text-zinc-500">Your personal identification and direct contact coordinates.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Full Name (with credentials)"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Jane Smith, MD"
                  />
                  <FormInput
                    label="Email Address"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="doctor@clinic.com"
                    type="email"
                  />
                  <FormInput
                    label="Contact Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    type="tel"
                  />
                  <FormInput
                    label="Date of Birth"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    type="date"
                  />
                  <FormSelect
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    options={["Male", "Female", "Other", "Prefer not to say"]}
                  />
                  <FormInput
                    label="Assigned Role"
                    value="Healthcare Provider (Doctor)"
                    readOnly
                    className="bg-slate-100 text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Work Location Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-7">
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">Clinic & Hospital Location</h3>
                    <p className="text-xs text-zinc-500">Used by patients to calculate travel distance and navigate appointments.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Clinic / Hospital Physical Address
                    </label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="e.g. Apollo Hospital, Sector 17, Chandigarh, 160017"
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLocationMap(!showLocationMap)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 text-xs font-semibold transition"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{showLocationMap ? "Hide Interactive Pin Map" : "Pinpoint Precise Location on Map"}</span>
                    </button>

                    {form.latitude !== 0 && form.longitude !== 0 && (
                      <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                        Coordinates: ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
                      </span>
                    )}
                  </div>

                  {showLocationMap && (
                    <div className="mt-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <LocationPinMap
                          onLocationSelect={handleLocationSelect}
                          initialLat={form.latitude || undefined}
                          initialLng={form.longitude || undefined}
                          initialAddress={form.address || undefined}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Drag the pin or click on the map to accurately record your clinic location.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Section */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 transition-all"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saveSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{saving ? "Saving..." : saveSuccess ? "Saved Successfully" : "Save Doctor Profile"}</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-900">Danger Zone</h3>
                </div>
                <p className="text-xs text-rose-700 mb-4 leading-relaxed">
                  Permanently delete your doctor profile, active clinic hours, and associated appointments. This operation cannot be reversed.
                </p>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Delete Doctor Profile Permanently
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Profile Image Confirmation Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Profile Picture"
        description="Upload this picture as your official provider badge?"
        imageUrl={confirmPreviewUrl || undefined}
        fileName={form.profileImage?.name || form.profileImageName || ""}
        confirmText="Upload & Save"
        cancelText="Cancel"
        onConfirm={() => {
          saveProfileConfirmed();
        }}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Delete Doctor Account?</h3>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              This will permanently revoke your provider credentials, cancel pending patient appointments, and delete your clinical practice records.
            </p>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 mb-6">
              ⚠️ This action cannot be undone.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-zinc-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProfile}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
              >
                {deleting ? "Deleting Account..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= CLINICAL TRUST FORM HELPERS ================= */

function FormInput({ label, className = "", ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-700">
        {label}
      </label>
      <input
        {...props}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-zinc-400 ${className}`}
      />
    </div>
  );
}

function FormSelect({ label, options, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-zinc-700">
        {label}
      </label>
      <select
        {...props}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-zinc-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
      >
        <option value="">Select option</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

