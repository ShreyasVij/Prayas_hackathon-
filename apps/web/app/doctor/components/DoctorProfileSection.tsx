"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { 
  Stethoscope, 
  ShieldCheck, 
  Award, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CalendarCheck, 
  Edit3, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface DoctorProfileData {
  name: string;
  specialization?: string | null;
  licenseNumber?: string | null;
  hospitalAffiliation?: string | null;
  experienceYears?: number | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  department?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  consultationsCompleted: number;
  status: "On Duty" | "Available" | "In Consultation";
}

export function DoctorProfileSection() {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [doctorData, setDoctorData] = useState<DoctorProfileData>({
    name: "",
    specialization: null,
    licenseNumber: null,
    hospitalAffiliation: null,
    experienceYears: null,
    email: null,
    phone: null,
    location: null,
    department: null,
    bio: null,
    profileImageUrl: null,
    consultationsCompleted: 0,
    status: "On Duty"
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionUser(user);
    });
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function loadDoctorProfile() {
      try {
        setLoading(true);
        const [profileRes, aptsRes] = await Promise.all([
          fetch("/api/doctor/profile").catch(() => null),
          fetch("/api/doctor/appointments").catch(() => null)
        ]);
        
        let completedApts = 0;
        if (aptsRes && aptsRes.ok) {
          const aptsData = await aptsRes.json().catch(() => ({}));
          const list = aptsData.appointments || [];
          completedApts = list.filter((a: any) => a.status === "completed").length;
        }

        if (profileRes && profileRes.ok) {
          const data = await profileRes.json().catch(() => ({}));
          const p = data.profile || {};
          const d = data.doctor || {};

          if (isSubscribed) {
            setDoctorData({
              name: d.name || sessionUser?.user_metadata?.name || (sessionUser?.email ? sessionUser.email.split("@")[0] : "Healthcare Provider"),
              email: d.email || sessionUser?.email || null,
              specialization: p.specialization || null,
              licenseNumber: p.licenseNumber || null,
              hospitalAffiliation: p.hospitalAffiliation || null,
              experienceYears: p.experienceYears ?? null,
              phone: p.phone || null,
              location: p.location?.city ? `${p.location.city}${p.location.state ? `, ${p.location.state}` : ""}` : null,
              department: p.department || null,
              bio: p.bio || null,
              profileImageUrl: p.profileImageUrl || p.profileImagePreviewUrl || null,
              consultationsCompleted: completedApts,
              status: "On Duty"
            });
          }
        } else {
          // If session user exists
          if (isSubscribed) {
            setDoctorData({
              name: sessionUser?.user_metadata?.name || (sessionUser?.email ? sessionUser.email.split("@")[0] : "Healthcare Provider"),
              email: sessionUser?.email || null,
              specialization: null,
              licenseNumber: null,
              hospitalAffiliation: null,
              experienceYears: null,
              phone: null,
              location: null,
              department: null,
              bio: null,
              profileImageUrl: null,
              consultationsCompleted: completedApts,
              status: "On Duty"
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch doctor profile.");
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadDoctorProfile();

    return () => {
      isSubscribed = false;
    };
  }, [sessionUser]);

  const initials = doctorData.name
    ? doctorData.name
        .replace(/^Dr\.\s*/i, "")
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MD";

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-xs">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Doctor Professional Profile
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100/70 text-teal-800 border border-teal-200">
                Clinical Credentials
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Verified clinical identity, board certifications, and institutional hospital affiliation.
            </p>
          </div>
        </div>

        {/* Edit Profile Action */}
        <Link
          href="/doctor/profile"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/50 text-zinc-700 hover:text-teal-700 text-xs font-semibold transition-all duration-150 shadow-xs hover:shadow active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20 self-start sm:self-auto"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </Link>
      </div>

      {loading ? (
        /* Refined Skeleton Loader */
        <div className="space-y-6 animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-56 bg-slate-200 rounded-md" />
              <div className="h-4 w-40 bg-slate-100 rounded-md" />
              <div className="h-3.5 w-64 bg-slate-100 rounded-md" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 bg-slate-100 rounded-xl" />
              <div className="h-16 w-24 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
            <div className="h-16 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Profile Info Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            
            {/* Profile Picture with Verification Badge */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-sm overflow-hidden border-2 border-white ring-2 ring-teal-200/80">
                {doctorData.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doctorData.profileImageUrl}
                    alt={doctorData.name || "Doctor profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Verified Shield Badge */}
              <div 
                className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs border border-teal-100" 
                title="Verified Medical Practitioner"
              >
                <ShieldCheck className="h-5 w-5 text-teal-600 fill-teal-50" />
              </div>
            </div>

            {/* Core Identification Details */}
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  {doctorData.name || "Medical Practitioner"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {doctorData.status}
                </span>
              </div>

              <p className="text-sm font-semibold text-teal-700">
                {doctorData.specialization || "Specialization not specified"}
              </p>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-5 text-xs text-zinc-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                  {doctorData.hospitalAffiliation || "Affiliation not specified"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {doctorData.location || "Location not set"}
                </span>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <div className="px-4 py-2.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200/90 text-center flex-1 md:flex-initial shadow-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Experience</span>
                <p className="text-base sm:text-lg font-black text-zinc-900 tabular-nums tracking-tight">
                  {doctorData.experienceYears != null ? `${doctorData.experienceYears}+ Yrs` : "—"}
                </p>
              </div>
              <div className="px-4 py-2.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200/90 text-center flex-1 md:flex-initial shadow-xs">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Consults</span>
                <p className="text-base sm:text-lg font-black text-teal-700 tabular-nums tracking-tight">
                  {doctorData.consultationsCompleted}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
            
            {/* License Number */}
            <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 transition-colors border border-slate-200/90 rounded-xl space-y-1 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-teal-600" />
                Medical License Number
              </span>
              <p className="font-mono text-xs sm:text-sm font-black text-zinc-900 tracking-wider tabular-nums">
                {doctorData.licenseNumber || "Pending Verification"}
              </p>
            </div>

            {/* Department */}
            <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 transition-colors border border-slate-200/90 rounded-xl space-y-1 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-teal-600" />
                Department
              </span>
              <p className="text-xs font-semibold text-zinc-800 truncate">
                {doctorData.department || "General Practice"}
              </p>
            </div>

            {/* Direct Clinical Contact */}
            <div className="p-3.5 bg-slate-50/80 hover:bg-slate-50 transition-colors border border-slate-200/90 rounded-xl space-y-1 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-teal-600" />
                Direct Extension / Phone
              </span>
              <p className="text-xs font-semibold text-zinc-800">
                {doctorData.phone || "Not specified"}
              </p>
            </div>
          </div>

          {/* Clinical Bio / Practice Note */}
          <div className="p-4 bg-teal-50/40 border border-teal-100/80 rounded-xl text-xs text-zinc-600 space-y-1.5 leading-relaxed shadow-xs">
            <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
              Clinical Focus & Background
            </span>
            <p className="leading-relaxed">
              {doctorData.bio || "No clinical background summary has been added yet. Click 'Edit Profile' to update your qualifications and hospital affiliations."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
