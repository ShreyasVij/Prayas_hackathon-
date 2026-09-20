"use client";

import React, { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  FileImage,
  Shield,
  Activity,
  Check,
  Stethoscope,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type MedicalRecord = {
  id: string;
  patient_id: string;
  patient_masked_id: string;
  document_url: string;
  document_type: string;
  disease_id: string;
  ai_prediction: any;
  status: 'pending' | 'reviewed';
  created_at: string;
  patient: {
    id: string;
    age: string;
    gender: string;
    lifestyle: string;
    allergies: string[];
    conditions: string[];
    bloodGroup?: string | null;
  };
};

export default function VerifyDiagnosticsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>("Pulmonology");
  const [allowedDiseases, setAllowedDiseases] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, { isAccurate: boolean | null, review: string }>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const SPECIALTY_OPTIONS = [
    { label: "Pulmonology", value: "Pulmonology" },
    { label: "Dermatology", value: "Dermatology" },
    { label: "Ophthalmology", value: "Ophthalmology" },
    { label: "Neurology", value: "Neurology" },
    { label: "Oncology", value: "Oncology" },
    { label: "Cardiology", value: "Cardiology" },
    { label: "Radiology (All Scans)", value: "Radiology" },
  ];

  useEffect(() => {
    fetchRecords(doctorSpecialty);
  }, []);

  const fetchRecords = async (specialtyToFetch?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const specParam = specialtyToFetch ? `&specialty=${encodeURIComponent(specialtyToFetch)}` : "";
      const res = await fetch(`/api/doctor/verify/records?status=pending${specParam}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch records");
      setRecords(data.records || []);
      if (data.doctorSpecialty) {
        setDoctorSpecialty(data.doctorSpecialty);
      }
      setAllowedDiseases(data.allowedDiseases || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialtyChange = (newSpecialty: string) => {
    setDoctorSpecialty(newSpecialty);
    fetchRecords(newSpecialty);
  };

  const handleReviewChange = (recordId: string, field: 'isAccurate' | 'review', value: any) => {
    setReviews(prev => ({
      ...prev,
      [recordId]: {
        ...prev[recordId],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (recordId: string) => {
    const reviewData = reviews[recordId];
    if (!reviewData || reviewData.isAccurate === null || reviewData.isAccurate === undefined) {
      alert("Please select a verification verdict (Accurate or False/Refined).");
      return;
    }

    setSubmittingId(recordId);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/doctor/verify/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          doctorReview: reviewData.review || "Reviewed and verified by attending specialist.",
          isAccurate: reviewData.isAccurate,
          specialty: doctorSpecialty,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      
      setSuccessMessage("Review successfully recorded! The patient's status has been updated to Reviewed.");
      // Remove from pending list
      setRecords(prev => prev.filter(r => r.id !== recordId));
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm font-medium text-zinc-500">Loading pending diagnostics for your specialty...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header with Specialization selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Verify Patient Diagnostics
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm">
            Review anonymized patient scans and evaluate AI model findings. Personal identifiers (name, address) are strictly redacted.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs">
          <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div>
            <label htmlFor="doctor-specialty-select" className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
              Active Specialization
            </label>
            <select
              id="doctor-specialty-select"
              value={doctorSpecialty}
              onChange={(e) => handleSpecialtyChange(e.target.value)}
              className="text-xs font-bold text-zinc-900 bg-transparent border-none focus:outline-none cursor-pointer pr-4"
            >
              {SPECIALTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Specialty Scope and Privacy Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-500">Specialty Scope:</span>
          <div className="flex flex-wrap gap-1.5">
            {allowedDiseases.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-teal-700 font-semibold text-[11px] uppercase">
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
          <Shield className="h-3.5 w-3.5 text-teal-600" />
          <span>HIPAA Anonymized Feed (No Names or Addresses)</span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-medium shadow-xs">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!error && records.length === 0 && (
        <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Shield className="h-10 w-10 text-teal-600/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900">No pending scans for review</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            All patient submissions matching your clinical specialty ({doctorSpecialty}) have been evaluated.
          </p>
          <button
            onClick={() => fetchRecords()}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-zinc-700 transition-all"
          >
            Check for New Submissions
          </button>
        </div>
      )}

      {/* Records Queue */}
      <div className="space-y-8">
        {records.map((record) => {
          const reviewState = reviews[record.id] || { isAccurate: null, review: "" };
          const p = (record.patient || {}) as NonNullable<MedicalRecord['patient']>;
          const prediction = record.ai_prediction || {};
          const diseaseName = (record.disease_id || "").replace(/_/g, " ").toUpperCase();

          return (
            <div key={record.id} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              {/* Card Banner */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-100/80 text-teal-800 font-mono text-xs font-bold">
                    {record.patient_masked_id}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Submitted: {new Date(record.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                    Target: {diseaseName}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                    Pending Verification
                  </span>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Anonymized Patient Context & Uploaded Scan */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> Patient Context (Anonymized)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 rounded-xl p-4 border border-slate-200/80">
                      <div>
                        <span className="text-zinc-400 block mb-0.5 font-medium">Age</span>
                        <span className="font-bold text-zinc-800">{p.age || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block mb-0.5 font-medium">Gender</span>
                        <span className="font-bold text-zinc-800">{p.gender || 'Not specified'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-400 block mb-0.5 font-medium">Lifestyle / Habits</span>
                        <span className="font-medium text-zinc-700">{p.lifestyle || 'None reported'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-400 block mb-0.5 font-medium">Known Allergies</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Array.isArray(p.allergies) && p.allergies.length > 0 ? (
                            p.allergies.map((allergy, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
                                {allergy}
                              </span>
                            ))
                          ) : (
                            <span className="text-zinc-500 italic">No known allergies</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileImage className="h-3.5 w-3.5" /> Patient Uploaded Scan ({record.document_type})
                    </h4>
                    {/* Detect heatmap from dedicated column or ai_prediction */}
                    {(() => {
                      const hm =
                        (record as any).heatmap_url ||
                        prediction?.heatmap_url ||
                        prediction?.heatmap_image ||
                        null;
                      return hm ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Original · Grad-CAM Heatmap</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative">
                              {record.document_url ? (
                                <>
                                  <img
                                    src={record.document_url}
                                    alt="Patient uploaded medical scan"
                                    className="w-full h-full object-contain"
                                    crossOrigin="anonymous"
                                  />
                                  <span className="absolute bottom-2 left-2 rounded-md bg-zinc-900/80 px-2 py-1 text-[10px] font-semibold text-zinc-300">Original</span>
                                </>
                              ) : (
                                <span className="text-zinc-500 text-xs">No scan image available</span>
                              )}
                            </div>
                            <div className="bg-zinc-950 rounded-xl overflow-hidden border border-orange-900 aspect-square flex items-center justify-center relative">
                              <img
                                src={hm}
                                alt="AI heatmap (Grad-CAM)"
                                className="w-full h-full object-contain"
                              />
                              <span className="absolute bottom-2 left-2 rounded-md bg-orange-900/80 px-2 py-1 text-[10px] font-semibold text-orange-200">Heatmap</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative group">
                          {record.document_url ? (
                            <>
                              <img
                                src={record.document_url}
                                alt="Patient uploaded medical scan"
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                              />
                              <a
                                href={record.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 hover:bg-black/90 text-white text-[10px] font-semibold flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="h-3 w-3" /> Full Size
                              </a>
                            </>
                          ) : (
                            <span className="text-zinc-500 text-xs">No scan image available</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Column: What Response Did The Model Give THEM + Separate Review Thing */}
                <div className="space-y-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Model Response Given to Patient
                    </h4>
                    
                    <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200/90 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-400 block">Automated AI Prediction</span>
                          <span className="text-sm font-bold text-zinc-900 block mt-0.5">
                            {prediction.prediction || prediction.status || 'Diagnostic evaluation complete'}
                          </span>
                        </div>
                        {prediction.confidence !== undefined && (
                          <span className="px-2 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-700 font-mono text-xs font-bold shrink-0">
                            {typeof prediction.confidence === 'number' && prediction.confidence <= 1
                              ? `${Math.round(prediction.confidence * 100)}% Conf.`
                              : `${prediction.confidence}% Conf.`}
                          </span>
                        )}
                      </div>

                      {prediction.severity && (
                        <div className="text-xs">
                          <span className="text-zinc-500">Calculated Severity: </span>
                          <span className="font-bold text-zinc-800">{prediction.severity}</span>
                        </div>
                      )}

                      {Array.isArray(prediction.key_findings) && prediction.key_findings.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-500 block mb-1">Extracted Radiological Findings:</span>
                          <ul className="list-disc list-inside text-xs text-zinc-700 space-y-1">
                            {prediction.key_findings.map((item: string, idx: number) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {prediction.recommendation && (
                        <div className="text-xs text-zinc-500 border-t border-slate-200/60 pt-2 italic">
                          "{prediction.recommendation}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Below: Separate Physician Verification Section */}
                  <div className="bg-white rounded-xl p-5 border-2 border-teal-500/30 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-zinc-900">Physician Clinical Verification</h4>
                      <span className="text-[11px] text-zinc-500 font-medium">Updates patient status</span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-700">Is the AI diagnostic assessment accurate?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleReviewChange(record.id, 'isAccurate', true)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                            reviewState.isAccurate === true
                              ? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/20"
                              : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                          )}
                        >
                          <CheckCircle className="h-4 w-4" /> Accurate / Confirmed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewChange(record.id, 'isAccurate', false)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                            reviewState.isAccurate === false
                              ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20"
                              : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                          )}
                        >
                          <XCircle className="h-4 w-4" /> False / Needs Revision
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">Doctor Clinical Notes &amp; Recommendations</label>
                      <textarea
                        value={reviewState.review}
                        onChange={(e) => handleReviewChange(record.id, 'review', e.target.value)}
                        placeholder="Provide your verified clinical observations, suggested medications, or follow-up imaging instructions for the patient..."
                        className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSubmit(record.id)}
                      disabled={submittingId === record.id}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer",
                        submittingId === record.id
                          ? "bg-slate-200 text-zinc-400 cursor-not-allowed"
                          : "bg-teal-600 hover:bg-teal-700 text-white hover:shadow-md"
                      )}
                    >
                      {submittingId === record.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Verification &amp; Update Patient Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
