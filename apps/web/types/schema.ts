export interface Doctor {
  id: string;
  specialty: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
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
  updated_at: string;
}
