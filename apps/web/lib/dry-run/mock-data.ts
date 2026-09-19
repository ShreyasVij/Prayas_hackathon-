/**
 * lib/dry-run/mock-data.ts
 *
 * Centralised mock data for DRY_RUN mode (NEXT_PUBLIC_DRY_RUN=true).
 * All mock API route handlers import from here.
 *
 * Toggle with: NEXT_PUBLIC_DRY_RUN=true in .env
 */

export const DRY_RUN = process.env.NEXT_PUBLIC_DRY_RUN === 'true';

// ─── Mock Session User ────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'dry-run-user-001',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  image: null,
  roles: ['patient'],
  isNewUser: false,
};

// ─── Mock Vitals ─────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString();
const MONTH_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const TWO_MONTHS_AGO = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_VITALS = [
  // Vital Signs
  { id: 'v1', label: 'Heart Rate', value: 72, unit: 'bpm', status: 'normal', vitalType: 'heart_rate', documentDate: TODAY, source: 'Annual Checkup 2026', explanation: 'Your heart rate is within the healthy resting range of 60–100 bpm.', advice: 'Continue regular aerobic exercise to maintain cardiovascular health.' },
  { id: 'v2', label: 'Heart Rate', value: 78, unit: 'bpm', status: 'normal', vitalType: 'heart_rate', documentDate: MONTH_AGO, source: 'Visit Mar 2026', explanation: 'Normal resting heart rate.' },
  { id: 'v3', label: 'Heart Rate', value: 82, unit: 'bpm', status: 'normal', vitalType: 'heart_rate', documentDate: TWO_MONTHS_AGO, source: 'Visit Feb 2026', explanation: 'Normal resting heart rate.' },
  { id: 'v4', label: 'Blood Pressure', value: '118/76', unit: 'mmHg', status: 'normal', vitalType: 'blood_pressure', documentDate: TODAY, source: 'Annual Checkup 2026', explanation: 'Excellent blood pressure — well within the normal range (<120/80).', advice: 'Maintain a low-sodium diet and continue current lifestyle habits.' },
  { id: 'v5', label: 'Blood Pressure', value: '122/80', unit: 'mmHg', status: 'normal', vitalType: 'blood_pressure', documentDate: MONTH_AGO, source: 'Visit Mar 2026', explanation: 'Borderline normal — watch sodium intake.' },
  { id: 'v6', label: 'SpO₂', value: 98, unit: '%', status: 'normal', vitalType: 'spo2', documentDate: TODAY, source: 'Annual Checkup 2026', explanation: 'Oxygen saturation is excellent (normal: 95–100%).' },

  // Blood Sugar
  { id: 'v7', label: 'Fasting Glucose', value: 94, unit: 'mg/dL', status: 'normal', vitalType: 'fasting_glucose', documentDate: TODAY, source: 'Lab Report Apr 2026', explanation: 'Fasting glucose is within the normal range (70–99 mg/dL).', advice: 'Continue balanced diet with low refined carbohydrates.' },
  { id: 'v8', label: 'Fasting Glucose', value: 101, unit: 'mg/dL', status: 'warning', vitalType: 'fasting_glucose', documentDate: MONTH_AGO, source: 'Lab Report Mar 2026', explanation: 'Slightly elevated — prediabetes range (100–125 mg/dL).', advice: 'Reduce sugar intake and schedule a follow-up HbA1c test.' },
  { id: 'v9', label: 'HbA1c', value: 5.4, unit: '%', status: 'normal', vitalType: 'hba1c', documentDate: TODAY, source: 'Lab Report Apr 2026', explanation: 'HbA1c indicates excellent 3-month average blood sugar control.' },

  // Lipid Profile
  { id: 'v10', label: 'Total Cholesterol', value: 188, unit: 'mg/dL', status: 'normal', vitalType: 'cholesterol_total', documentDate: TODAY, source: 'Lab Report Apr 2026', explanation: 'Total cholesterol is within the desirable range (<200 mg/dL).' },
  { id: 'v11', label: 'Total Cholesterol', value: 204, unit: 'mg/dL', status: 'warning', vitalType: 'cholesterol_total', documentDate: TWO_MONTHS_AGO, source: 'Lab Report Feb 2026', explanation: 'Borderline high cholesterol (200–239 mg/dL).' },
  { id: 'v12', label: 'LDL', value: 112, unit: 'mg/dL', status: 'normal', vitalType: 'ldl', documentDate: TODAY, source: 'Lab Report Apr 2026', explanation: 'LDL (bad cholesterol) is near optimal (<130 mg/dL).' },
  { id: 'v13', label: 'HDL', value: 58, unit: 'mg/dL', status: 'normal', vitalType: 'hdl', documentDate: TODAY, source: 'Lab Report Apr 2026', explanation: 'Good HDL level (>40 mg/dL for men, >50 for women) — protective.' },

  // Anthropometrics
  { id: 'v14', label: 'BMI', value: 23.4, unit: 'kg/m²', status: 'normal', vitalType: 'bmi', documentDate: TODAY, source: 'Annual Checkup 2026', explanation: 'BMI is in the healthy range (18.5–24.9).' },
  { id: 'v15', label: 'Weight', value: 72, unit: 'kg', status: 'normal', vitalType: 'weight', documentDate: TODAY, source: 'Annual Checkup 2026', explanation: 'Stable healthy weight.' },
];

export const MOCK_GROUPED_VITALS: Record<string, typeof MOCK_VITALS> = {
  'Vital Signs':    MOCK_VITALS.filter(v => ['heart_rate','blood_pressure','spo2'].includes(v.vitalType)),
  'Blood Sugar':    MOCK_VITALS.filter(v => ['fasting_glucose','hba1c'].includes(v.vitalType)),
  'Lipid Profile':  MOCK_VITALS.filter(v => ['cholesterol_total','ldl','hdl'].includes(v.vitalType)),
  'Anthropometrics': MOCK_VITALS.filter(v => ['bmi','weight'].includes(v.vitalType)),
};

// ─── Mock Health Summary ──────────────────────────────────────────────────────
export const MOCK_HEALTH_SUMMARY = {
  _id: 'dry-run-summary-001',
  userId: MOCK_USER.id,
  documentCount: 5,
  generatedAt: TODAY,
  overall_feedback:
    'Your overall health profile looks very encouraging. Cardiovascular markers are strong — ' +
    'heart rate and blood pressure are both in the optimal range. Blood glucose has improved ' +
    'significantly compared to last month, and your cholesterol is trending downward. ' +
    'Continue your current routine and schedule a follow-up in 6 months.',
  cardiovascular: {
    summary: 'Heart rate 72 bpm and blood pressure 118/76 mmHg — both optimal.',
    status: 'Normal',
    feedback: 'Excellent cardiovascular health. No concerns at this time.',
  },
  metabolic: {
    summary: 'Fasting glucose 94 mg/dL and HbA1c 5.4% — well within normal limits.',
    status: 'Normal',
    feedback: 'Blood sugar control has improved from last month. Keep monitoring.',
  },
  lipid_profile: {
    summary: 'Total cholesterol 188 mg/dL, LDL 112, HDL 58.',
    status: 'Normal',
    feedback: 'Good lipid profile overall. HDL is protective. Maintain low saturated fat diet.',
  },
};

// ─── Mock Documents ───────────────────────────────────────────────────────────
export const MOCK_DOCUMENTS = [
  { _id: 'doc-001', fileName: 'annual_checkup_2026.pdf', originalName: 'Annual Checkup 2026.pdf', status: 'active', processingStatus: 'completed', uploadedAt: TODAY, fileSize: 204800 },
  { _id: 'doc-002', fileName: 'lab_report_apr_2026.pdf', originalName: 'Lab Report Apr 2026.pdf', status: 'active', processingStatus: 'completed', uploadedAt: MONTH_AGO, fileSize: 102400 },
  { _id: 'doc-003', fileName: 'cardio_report_mar_2026.pdf', originalName: 'Cardiology Report Mar 2026.pdf', status: 'active', processingStatus: 'flagged', uploadedAt: MONTH_AGO, fileSize: 358400 },
  { _id: 'doc-004', fileName: 'prescription_feb_2026.pdf', originalName: 'Prescription Feb 2026.pdf', status: 'active', processingStatus: 'completed', uploadedAt: TWO_MONTHS_AGO, fileSize: 51200 },
  { _id: 'doc-005', fileName: 'xray_chest_jan_2026.pdf', originalName: 'Chest X-Ray Jan 2026.pdf', status: 'active', processingStatus: 'pending', uploadedAt: TWO_MONTHS_AGO, fileSize: 716800 },
];

// ─── Mock Emergency QR ────────────────────────────────────────────────────────
// 1x1 teal placeholder QR — real apps would generate via qrcode library.
// This is a minimal valid base64 PNG (8x8 teal solid block, safe for img tag).
export const MOCK_QR_DATA_URL =
  'data:image/svg+xml;base64,' +
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="148" height="148" viewBox="0 0 148 148">
  <rect width="148" height="148" fill="#f0fdfa"/>
  <text x="74" y="60" font-family="monospace" font-size="11" fill="#0d9488" text-anchor="middle">EMERGENCY</text>
  <text x="74" y="78" font-family="monospace" font-size="11" fill="#0d9488" text-anchor="middle">ACCESS QR</text>
  <text x="74" y="96" font-family="monospace" font-size="9" fill="#5eead4" text-anchor="middle">[DRY RUN MODE]</text>
  <rect x="20" y="108" width="108" height="4" rx="2" fill="#ccfbf1"/>
</svg>`).toString('base64');

export const MOCK_EMERGENCY_TOKEN = {
  success: true,
  token: 'dry-run-token-abc123',
  tokenId: 'dry-run-token-id-001',
  qrCode: MOCK_QR_DATA_URL,
  url: '/emergency/dry-run',
  isPermanent: false,
  regenerated: false,
  warning: '[DRY RUN] This is a mock emergency token.',
};

export const MOCK_ACTIVE_TOKENS = [
  {
    id: 'dry-run-token-id-001',
    createdAt: TODAY,
    revoked: false,
    accessCount: 3,
    lastAccessedAt: MONTH_AGO,
  },
];

// ─── Mock Profile ─────────────────────────────────────────────────────────────
export const MOCK_PROFILE = {
  _id: 'dry-run-profile-001',
  userId: MOCK_USER.id,
  fullName: 'Alex Johnson',
  dateOfBirth: '1990-06-15',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Dust mites'],
  conditions: ['Mild seasonal rhinitis'],
  emergencyContact: { name: 'Jordan Johnson', phone: '+91 98765 43210', relation: 'Spouse' },
  profileImageUrl: null,
};
