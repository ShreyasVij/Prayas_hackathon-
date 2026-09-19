"use client";

import React, { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Send,
  FileImage
} from "lucide-react";
import { cn } from "@/lib/utils";

type MedicalRecord = {
  id: string;
  patient_id: string;
  document_url: string;
  document_type: string;
  disease_id: string;
  ai_prediction: any;
  status: 'pending' | 'reviewed';
  doctor_id: string | null;
  doctor_review: string | null;
  is_accurate: boolean | null;
  created_at: string;
  patient: {
    id: string;
    email: string;
    data: any;
  };
};

export default function VerifyDiagnosticsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, { isAccurate: boolean | null, review: string }>>({});

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/doctor/verify/records?status=pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch records");
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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
      alert("Please select a verdict (Accurate, False, or Other)");
      return;
    }

    setSubmittingId(recordId);
    try {
      const res = await fetch("/api/doctor/verify/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          doctorReview: reviewData.review || "",
          isAccurate: reviewData.isAccurate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");
      
      // Remove from list
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-sm font-medium text-zinc-500">Loading pending diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-teal-600" />
          Verify Diagnostics
        </h1>
        <p className="text-zinc-500 text-sm">
          Review patient-uploaded documents and verify the AI-generated predictions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm shadow-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {!error && records.length === 0 && (
        <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <ClipboardList className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900">No pending diagnostics</h3>
          <p className="text-sm text-zinc-500 mt-1">All patient submissions have been reviewed.</p>
        </div>
      )}

      <div className="space-y-8">
        {records.map((record) => {
          const reviewState = reviews[record.id] || { isAccurate: null, review: "" };
          const patientData = record.patient?.data || {};

          return (
            <div key={record.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-tight">Patient ID: {record.patient_id.slice(0,8)}...</h3>
                  <p className="text-xs text-zinc-500">Submitted: {new Date(record.created_at).toLocaleString()}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider border border-amber-200">
                  Pending Review
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Patient Data & Document */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3">Patient Context</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div>
                        <span className="text-zinc-500 text-xs block mb-0.5">Age</span>
                        <span className="font-medium">{patientData.age || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs block mb-0.5">Gender</span>
                        <span className="font-medium">{patientData.gender || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-500 text-xs block mb-0.5">Lifestyle / Notes</span>
                        <span className="font-medium">{patientData.lifestyle || 'None provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileImage className="h-4 w-4" /> Uploaded Document ({record.document_type})
                    </h4>
                    <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center relative group">
                      {record.document_url ? (
                        <img 
                          src={record.document_url} 
                          alt="Patient document" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-zinc-600 text-sm">No image available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Prediction & Verification Form */}
                <div className="space-y-6 flex flex-col">
                  <div>
                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3">AI Prediction ({record.disease_id})</h4>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
                      {record.ai_prediction ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs text-zinc-700 overflow-x-auto">
                          {JSON.stringify(record.ai_prediction, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-zinc-500 italic">No detailed AI prediction available.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1" />

                  <div className="bg-white rounded-xl p-5 border border-teal-100 shadow-xs space-y-4">
                    <h4 className="text-sm font-bold text-zinc-900">Physician Verification</h4>
                    
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-zinc-600">Is the AI prediction accurate?</p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleReviewChange(record.id, 'isAccurate', true)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                            reviewState.isAccurate === true
                              ? "bg-teal-50 border-teal-500 text-teal-700 ring-2 ring-teal-500/20"
                              : "bg-white border-slate-200 text-zinc-600 hover:bg-slate-50"
                          )}
                        >
                          <CheckCircle className="h-4 w-4" /> Accurate
                        </button>
                        <button
                          onClick={() => handleReviewChange(record.id, 'isAccurate', false)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                            reviewState.isAccurate === false
                              ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20"
                              : "bg-white border-slate-200 text-zinc-600 hover:bg-slate-50"
                          )}
                        >
                          <XCircle className="h-4 w-4" /> False
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-600">Clinical Notes (Optional)</label>
                      <textarea
                        value={reviewState.review}
                        onChange={(e) => handleReviewChange(record.id, 'review', e.target.value)}
                        placeholder="Add your findings or reasons for the verdict..."
                        className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-all"
                      />
                    </div>

                    <button
                      onClick={() => handleSubmit(record.id)}
                      disabled={submittingId === record.id}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all",
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
                      Submit Verification
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
