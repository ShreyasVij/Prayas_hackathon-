"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, FileText, CheckCircle, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";

interface MedicalReport {
  id: string;
  patient_id: string;
  document_url: string;
  document_type: string;
  predicted_specialty: string;
  ai_confidence: number;
  ai_output: any;
  doctor_verified: boolean;
  created_at: string;
}

export function PatientReportsList() {
  const supabase = createClient();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Not authenticated");
          return;
        }

        // Fetch doctor profile to get specialty
        const { data: docData, error: docError } = await supabase
          .from("doctors")
          .select("specialty, verified")
          .eq("id", user.id)
          .single();

        if (docError || !docData?.verified) {
          setError("You must be a verified doctor to view patient reports.");
          setLoading(false);
          return;
        }

        setDoctorSpecialty(docData.specialty);

        // Fetch reports matching the doctor's specialty
        const { data: reportsData, error: reportsError } = await supabase
          .from("medical_reports")
          .select("*")
          .eq("predicted_specialty", docData.specialty)
          .order("created_at", { ascending: false });

        if (reportsError) throw reportsError;

        setReports(reportsData || []);
      } catch (err: any) {
        setError(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Patient AI Reports</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Showing reports predicted for your specialty: <span className="font-bold text-teal-700">{doctorSpecialty}</span>
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold border border-teal-200">
          {reports.length} Reports
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
          <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No reports found for your specialty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-bold text-zinc-900 uppercase">{report.document_type}</span>
                </div>
                {report.doctor_verified ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                    Pending Review
                  </span>
                )}
              </div>
              
              <div className="space-y-2 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Patient Hash:</span>
                  <span className="font-mono text-zinc-800">{report.patient_id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">AI Confidence:</span>
                  <span className="font-semibold text-teal-700">{(report.ai_confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Date:</span>
                  <span className="text-zinc-800">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Link href={`/doctor/report/${report.id}`} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-teal-200 transition-colors">
                View Detailed Report <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
