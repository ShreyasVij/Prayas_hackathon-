"use client";

import { useEffect, useState } from "react";
import { AIBadge } from "@/components/ui/ai-badge";
import { Plus, Trash2, Check, FileCheck } from "lucide-react";

export type ExtractedDocument = {
  patient_name?: string;
  dob?: string;
  report_date?: string;
  doctor_name?: string;
  diagnosis?: string;
  medications?: { name?: string; dose?: string; frequency?: string }[];
  vitals?: { label?: string; value?: string | number; unit?: string | null }[];
  summary?: any;
  classification?: string;
  raw_text?: string;
};

interface Props {
  data: ExtractedDocument;
  onConfirm: (payload: ExtractedDocument) => void;
}

export function DocumentReviewForm({ data, onConfirm }: Props) {
  const [draft, setDraft] = useState<ExtractedDocument>(data);

  useEffect(() => {
    setDraft({ ...(data || {}) });
  }, [data]);

  const updateField = (key: keyof ExtractedDocument, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateVital = (idx: number, key: 'label' | 'value' | 'unit', value: string) => {
    setDraft(prev => {
      const rows = Array.isArray(prev.vitals) ? [...prev.vitals] : [];
      const current = rows[idx] || { label: '', value: '', unit: '' };
      rows[idx] = { ...current, [key]: value };
      return { ...prev, vitals: rows };
    });
  };

  const addVital = () => {
    setDraft(prev => ({ ...prev, vitals: [...(prev.vitals || []), { label: '', value: '', unit: '' }] }));
  };

  const removeVital = (idx: number) => {
    setDraft(prev => ({ ...prev, vitals: (prev.vitals || []).filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-base font-bold text-zinc-900">Extracted Clinical Data</h3>
          <p className="text-xs text-zinc-500">Review and verify AI-extracted fields before saving</p>
        </div>
        <AIBadge />
      </div>

      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[65vh]">
        <div id="extracted-form-body" role="region" aria-label="Extracted document fields" tabIndex={0} className="overflow-y-auto pr-2 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">Patient Name</label>
              <input
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                value={draft.patient_name || ""}
                onChange={(e) => updateField("patient_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">Date of Birth</label>
              <input
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                value={draft.dob || ""}
                onChange={(e) => updateField("dob", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">Attending Doctor</label>
              <input
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                value={draft.doctor_name || ""}
                onChange={(e) => updateField("doctor_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">Classification</label>
              <input
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                value={draft.classification || ""}
                onChange={(e) => updateField("classification", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">Diagnosis</label>
            <input
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              value={draft.diagnosis || ""}
              placeholder="e.g. Essential Hypertension, Routine Wellness"
              onChange={(e) => updateField("diagnosis", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">AI Clinical Summary</label>
            <textarea
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed"
              rows={3}
              value={typeof draft.summary === 'string' ? (draft.summary || "") : (draft.summary ? JSON.stringify(draft.summary) : "")}
              onChange={(e) => updateField("summary", e.target.value)}
            />
          </div>

          {/* Vitals Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">Extracted Vitals</span>
              <button
                type="button"
                onClick={addVital}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Vital</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-zinc-600">Label</th>
                    <th className="py-2 px-3 font-semibold text-zinc-600">Value</th>
                    <th className="py-2 px-3 font-semibold text-zinc-600">Unit</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(draft.vitals || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-zinc-400">No vitals extracted</td>
                    </tr>
                  ) : (
                    (draft.vitals || []).map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1.5">
                          <input
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                            value={v.label || ''}
                            onChange={e => updateVital(idx, 'label', e.target.value)}
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                            value={String(v.value ?? '')}
                            onChange={e => updateVital(idx, 'value', e.target.value)}
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-teal-500"
                            value={v.unit || '-'}
                            onChange={e => updateVital(idx, 'unit', e.target.value === '-' ? '' : e.target.value)}
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeVital(idx)}
                            className="text-zinc-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Confirmation */}
        <div className="pt-4 mt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-teal-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="h-4 w-4" />
            <span>Confirm &amp; Save to Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentReviewForm;
