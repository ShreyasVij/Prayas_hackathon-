export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface EmergencyNfcAccessLog {
  id?: string;
  tokenId: string;
  scannedAt: Date;
  ip?: string;
  userAgent?: string;
  location?: GeoLocation;
  grantedProfileId?: string;
}

export interface JobDocument {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload?: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OcrOutputDocument {
  id: string;
  documentId: string;
  userId?: string;
  ownerId?: string;
  storageKey?: string;
  extractedText: string;
  rawText?: string;
  vitals?: any[];
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export interface DocumentDocument {
  id: string;
  profileId: string;
  ownerUserId?: string;
  originalName?: string;
  fileName?: string;
  title?: string;
  docType: 'prescription' | 'lab' | 'scan' | 'discharge' | 'other' | string;
  storageKey: string;
  status?: string;
  extractedData?: any;
  uploadedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassificationDocument {
  id: string;
  documentId: string;
  category: string;
  confidence: number;
}

export interface TrendDocument {
  id: string;
  profileId: string;
  metric: string;
  values: Array<{ date: string | Date; value: number }>;
}

export interface SummaryDocument {
  id: string;
  profileId: string;
  content: string;
  generatedAt: Date;
  sourceDocIds?: string[];
}

export interface ShareDocument {
  id: string;
  profileId: string;
  grantedToUserId?: string;
  grantedToEmail?: string;
  permissions: Array<'view' | 'upload' | 'summary'>;
  status: 'active' | 'revoked';
  scope?: { docIds?: string[] };
}

export interface ProfileDocument {
  id: string;
  userId: string;
  displayName: string;
  type: 'self' | 'dependent';
  guardians?: Array<{ userId: string; role: string }>;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  emergencyContacts?: any[];
}

export interface VitalReading {
  id?: string;
  userId: string;
  documentId?: string;
  type: string;
  category: string;
  label: string;
  value: string | number;
  unit: string | null;
  recordedAt?: Date;
  explanation?: string;
}

export interface UserDocument {
  id: string;
  email: string;
  passwordHash?: string;
  roles: string[];
}

export interface SessionDocument {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface AlertDocument {
  id: string;
  profileId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
}

export interface ClaimDocument {
  id: string;
  profileId: string;
  claimNumber: string;
  status: string;
}

export interface UserHealthSummary {
  id?: string;
  userId: string;
  summaryText: string;
  lastUpdated: Date;
  metrics?: Record<string, any>;
}

export interface EmergencyToken {
  id: string;
  token: string;
  profileId: string;
  expiresAt?: Date;
  active: boolean;
}

export interface DocumentVersionDocument {
  id: string;
  documentId: string;
  version: number;
  storageKey: string;
  createdAt: Date;
}

export interface AuditDocument {
  id: string;
  actorId: string;
  action: string;
  targetId?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export async function initializeDatabase(): Promise<void> {
  return undefined;
}

export {
  createEmergencyToken,
  logEmergencyAction,
  getActiveTokensForProfile,
  regenerateToken,
  markTokenPrinted,
  findTokenByHash,
  markAccessNotificationSent,
  getTokensForProfile,
  revokeNfcToken,
  findNfcTokenByHash,
  detectSuspiciousActivity,
  revokeToken,
  revokeAllActiveTokensForProfile,
  updateTokenAccess,
  createAccessLog,
  createNfcToken,
  getTokensForUser,
  addPreAuthorizedDoctor,
  createOtpSession,
  incrementOtpRequest,
  getActiveOtpForToken,
  verifyOtpSession,
  authorizeDoctorForToken,
  findOtpSession,
  verifyOtp,
  recordOtpAttempt,
  flagOtpAsAnomalous,
  markOtpFailed,
  incrementOtpVerified,
  countRecentFailedAttempts,
} from "@/lib/server/emergencyStore";

export async function logTokenAccess(params: any): Promise<any> {
  return true;
}

export interface PreAuthorizedDoctor {
  doctorId?: string;
  doctorName?: string;
  hospitalName?: string;
  doctorEmail?: string;
  fullAccessGranted?: boolean;
  grantedAt?: Date;
  grantedByUserId?: any;
  expiresAt?: Date | null;
  notes?: string;
  authorizedAt?: Date;
  id?: string;
}

export * from './doctors';
export * from './utils';
export * from './supabase';
