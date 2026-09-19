"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, ArrowLeft, CheckCircle, XCircle, FileText, Activity, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PatientProfile {
  name?: string;
  age?: number | string;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  medications?: string[];
  diet?: any;
}

interface MedicalReport {
  id: string;
  patient_id: string;
  document_url: string;
  document_type: string;
  predicted_specialty: string;
  ai_confidence: number;
  ai_output: any;
  doctor_verified: boolean;
  verified_by?: string;
  created_at: string;
  patient_profile?: PatientProfile;
}

export default function DoctorReportDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [report, setReport] = useState<MedicalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // 1. Fetch Report
        const { data: reportData, error: reportError } = await supabase
          .from("medical_reports")
          .select("*")
          .eq("id", id)
          .single();

        if (reportError) throw reportError;
        if (!reportData) throw new Error("Report not found");

        // 2. Fetch Patient Basic Profile (Mocking it via profiles table or Auth users if needed)
        // Since patient details are supposed to be fetched from `profiles`
        let patientProfile = {};
        const { data: profileData } = await supabase
          .from("profiles")
          .select("profile_data")
          .eq("id", reportData.patient_id)
          .maybeSingle();

        if (profileData && profileData.profile_data) {
          const pd = profileData.profile_data;
          patientProfile = {
            name: pd.basicDetails?.name,
            age: pd.basicDetails?.age,
            gender: pd.basicDetails?.gender,
            bloodGroup: pd.basicDetails?.bloodGroup,
            allergies: pd.healthAndLifestyle?.allergies,
            medications: pd.healthAndLifestyle?.medications,
            diet: pd.healthAndLifestyle?.diet,
          };
        }

        setReport({ ...reportData, patient_profile: patientProfile });
      } catch (err: any) {
        setError(err.message || "Failed to load report details");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchReport();
    }
  }, [id]);

  const handleVerify = async (isAccurate: boolean) => {
    try {
      setIsVerifying(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("medical_reports")
        .update({
          doctor_verified: isAccurate,
          verified_by: user.id
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setReport((prev) => prev ? { ...prev, doctor_verified: isAccurate, verified_by: user.id } : null);
      
    } catch (err: any) {
      console.error(err);
      alert("Failed to verify report");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
        <p className="mt-4 text-sm text-zinc-500">Loading Report Details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-sm">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-800 mb-2">Error Loading Report</h2>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-colors">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const aiOutputDisplay = typeof report.ai_output === 'string' 
    ? report.ai_output 
    : JSON.stringify(report.ai_output, null, 2);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-zinc-500 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                Medical Report Review
                {report.doctor_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                )}
              </h1>
              <p className="text-xs text-zinc-500">ID: {report.id}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image & AI Output */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <h2 className="font-bold text-zinc-900">Uploaded Document</h2>
            </div>
            <div className="p-6 flex justify-center bg-zinc-100">
              {/* Fallback to img tag if we don't have Next Image configured domains */}
              <img 
                src={report.document_url} 
                alt="Patient Uploaded Document" 
                className="max-h-[600px] object-contain rounded shadow-sm border border-slate-300"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-teal-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <h2 className="font-bold text-teal-900">AI Diagnostic Prediction</h2>
              </div>
              <span className="px-3 py-1 bg-white border border-teal-200 rounded-lg text-xs font-bold text-teal-800 shadow-sm">
                Confidence: {(report.ai_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">Predicted Specialty</span>
                <p className="font-medium text-zinc-900">{report.predicted_specialty}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Raw AI Output</span>
                <pre className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm font-mono text-zinc-800 whitespace-pre-wrap overflow-x-auto">
                  {aiOutputDisplay}
                </pre>
              </div>
              
              {/* Doctor Feedback Action */}
              <div className="pt-6 mt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">Doctor Verification</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleVerify(true)}
                    disabled={isVerifying || report.doctor_verified === true}
                    className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50
                    bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {report.doctor_verified === true ? "Verified Accurate" : "Mark as Accurate"}
                  </button>
                  <button
                    onClick={() => handleVerify(false)}
                    disabled={isVerifying || report.doctor_verified === false}
                    className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50
                    bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {report.doctor_verified === false ? "Marked Inaccurate" : "Mark as Inaccurate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Patient Profile Context */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-zinc-900">Patient Context</h2>
              <p className="text-xs text-zinc-500 mt-1">Anonymized registration details</p>
            </div>
            <div className="p-5 space-y-5">
              
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Unique Patient ID</span>
                <p className="text-sm font-mono font-medium text-zinc-800 bg-slate-50 p-2 rounded border border-slate-200 truncate">
                  {report.patient_id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Age</span>
                  <p className="text-sm font-semibold text-zinc-900">{report.patient_profile?.age || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Gender</span>
                  <p className="text-sm font-semibold text-zinc-900">{report.patient_profile?.gender || "N/A"}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Blood Group</span>
                  <p className="text-sm font-semibold text-rose-700">{report.patient_profile?.bloodGroup || "N/A"}</p>
                </div>
              </div>

              {report.patient_profile?.allergies && report.patient_profile.allergies.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">Known Allergies</span>
                  <div className="flex flex-wrap gap-1.5">
                    {report.patient_profile.allergies.map((allergy: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {report.patient_profile?.medications && report.patient_profile.medications.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">Current Medications</span>
                  <ul className="list-disc list-inside text-sm text-zinc-700 space-y-1">
                    {report.patient_profile.medications.map((med: string, i: number) => (
                      <li key={i}>{med}</li>
                    ))}
                  </ul>
                </div>
              )}
              
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
