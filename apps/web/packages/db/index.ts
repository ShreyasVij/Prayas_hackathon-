export interface GeoLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: number;
  city?: string;
  country?: string;
  timezone?: string;
  isp?: string;
  isVpn?: boolean;
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
  extractedText?: string;
  rawText?: string;
  text?: string;
  versionId?: string;
  engine?: string;
  confidence?: number;
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
  processingStatus?: string;
  versionId?: string;
  ocrAvailable?: boolean;
  tags?: string[];
  extractedData?: any;
  metadata?: Record<string, any>;
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
  series?: any;
  analysis?: any;
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
  ownerUserId?: string;
  grantedToUserId?: string;
  grantedToEmail?: string;
  grantedToName?: string;
  granteeType?: string;
  expiresAt?: Date;
  createdAt?: Date;
  permissions: Array<'view' | 'upload' | 'summary'>;
  status: 'active' | 'revoked';
  scope?: { docIds?: string[] };
}

export interface ProfileDocument {
  id: string;
  userId: string;
  displayName: string;
  type: 'self' | 'dependent';
  bloodGroup?: string;
  dateOfBirth?: string | Date;
  emergencyContactEnc?: string;
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
  documentDate?: string | Date;
  vitalType?: string;
  vitalCategory?: string;
  type?: string;
  category?: string;
  label?: string;
  value?: string | number;
  unit?: string | null;
  recordedAt?: Date;
  createdAt?: Date;
  explanation?: string;
  advice?: string;
  source?: string;
  status?: string;
  updatedAt?: Date;
}

export interface UserDocument {
  id: string;
  email: string;
  name?: string;
  familyId?: string;
  familyRole?: string;
  profile?: any;
  createdAt?: Date;
  passwordHash?: string;
  roles: string[];
}

export interface SessionDocument {
  id: string;
  userId: string;
  token?: string;
  refreshTokenHash?: string;
  accessTokenFamily?: string;
  issuedAt?: Date;
  lastActivityAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface AlertDocument {
  id: string;
  profileId: string;
  type?: string;
  status?: string;
  triggeredAt?: Date;
  dismissedAt?: Date;
  eventTime?: Date | string;
  relatedDocumentId?: string;
  payload?: any;
  expiresAt?: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  createdAt: Date;
}

export interface ClaimDocument {
  id: string;
  profileId: string;
  claimNumber?: string;
  status: string;
  bundleKey?: string;
  insurerId?: string;
  policyNumber?: string;
  claimDate?: Date | string;
  documentIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserHealthSummary {
  id?: string;
  userId: string;
  summaryText: string;
  summary?: string;
  sections?: any[];
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
  version?: number;
  storageKey: string;
  mimeType?: string;
  size?: number;
  createdAt: Date;
}

export interface AuditDocument {
  id?: string;
  actorId: string;
  action: string;
  targetId?: string;
  target?: string;
  targetType?: string;
  resourceId?: string;
  result?: string;
  ipAddress?: string;
  userAgent?: string;
  archived?: boolean;
  metadata?: Record<string, any>;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface PreAuthorizedDoctor {
  id?: string;
  doctorId?: string;
  doctorName?: string;
  doctorEmail?: string;
  hospitalName?: string;
  authorizedAt?: Date;
  grantedAt?: Date;
  grantedByUserId?: any;
  expiresAt?: Date | null;
  notes?: string;
  fullAccessGranted?: boolean;
}

export async function findPreAuthDoctorForToken(...args: any[]): Promise<any> {
  return null;
}

export async function initializeDatabase(...args: any[]): Promise<void> {
  // no-op mock
}

export async function createEmergencyToken(...args: any[]): Promise<any> {
  return { id: 'mock-em-token', token: 'mock-token-string' };
}

export async function logEmergencyAction(...args: any[]): Promise<any> {
  return true;
}

export async function getActiveTokensForProfile(...args: any[]): Promise<any[]> {
  return [];
}

export async function regenerateToken(...args: any[]): Promise<any> {
  return { token: 'mock-regenerated-token' };
}

export async function markTokenPrinted(...args: any[]): Promise<any> {
  return true;
}

export async function findTokenByHash(...args: any[]): Promise<any> {
  return null;
}

export async function markAccessNotificationSent(...args: any[]): Promise<any> {
  return true;
}

export async function getTokensForProfile(...args: any[]): Promise<any[]> {
  return [];
}

export async function revokeNfcToken(...args: any[]): Promise<any> {
  return true;
}

export async function findNfcTokenByHash(...args: any[]): Promise<any> {
  return null;
}

export async function logTokenAccess(...args: any[]): Promise<any> {
  return true;
}

export async function detectSuspiciousActivity(...args: any[]): Promise<any> {
  return { suspicious: false };
}

export async function revokeToken(...args: any[]): Promise<any> {
  return true;
}

export async function revokeAllActiveTokensForProfile(...args: any[]): Promise<any> {
  return true;
}

export async function updateTokenAccess(...args: any[]): Promise<any> {
  return true;
}

export async function createAccessLog(...args: any[]): Promise<any> {
  return true;
}

export async function createNfcToken(...args: any[]): Promise<any> {
  return { id: 'mock-nfc-token' };
}

export async function getTokensForUser(...args: any[]): Promise<any[]> {
  return [];
}

export async function addPreAuthorizedDoctor(...args: any[]): Promise<any> {
  return true;
}

export async function createOtpSession(...args: any[]): Promise<any> {
  return { id: 'mock-otp-session' };
}

export async function incrementOtpRequest(...args: any[]): Promise<any> {
  return 1;
}

export async function getActiveOtpForToken(...args: any[]): Promise<any> {
  return null;
}

export async function verifyOtpSession(...args: any[]): Promise<boolean> {
  return true;
}

export async function authorizeDoctorForToken(...args: any[]): Promise<any> {
  return true;
}

export async function findOtpSession(...args: any[]): Promise<any> {
  return null;
}

export async function verifyOtp(...args: any[]): Promise<boolean> {
  return true;
}

export async function recordOtpAttempt(...args: any[]): Promise<any> {
  return true;
}

export async function flagOtpAsAnomalous(...args: any[]): Promise<any> {
  return true;
}

export async function markOtpFailed(...args: any[]): Promise<any> {
  return true;
}

export async function incrementOtpVerified(...args: any[]): Promise<any> {
  return 1;
}

export async function countRecentFailedAttempts(...args: any[]): Promise<number> {
  return 0;
}

export * from './doctors';
export * from './utils';
export * from './supabase';
