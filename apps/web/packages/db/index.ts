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
  // no-op mock
}

export async function createEmergencyToken(params: any): Promise<any> {
  return { id: 'mock-em-token', token: 'mock-token-string', ...params };
}

export async function logEmergencyAction(params: any): Promise<any> {
  return true;
}

export async function getActiveTokensForProfile(profileId: string): Promise<any[]> {
  return [];
}

export async function regenerateToken(params: any): Promise<any> {
  return { token: 'mock-regenerated-token' };
}

export async function markTokenPrinted(tokenId: string): Promise<any> {
  return true;
}

export async function findTokenByHash(tokenHash: string): Promise<any> {
  return null;
}

export async function markAccessNotificationSent(tokenId: string): Promise<any> {
  return true;
}

export async function getTokensForProfile(profileId: string): Promise<any[]> {
  return [];
}

export async function revokeNfcToken(tokenId: string): Promise<any> {
  return true;
}

export async function findNfcTokenByHash(tokenHash: string): Promise<any> {
  return null;
}

export async function logTokenAccess(params: any): Promise<any> {
  return true;
}

export async function detectSuspiciousActivity(params: any): Promise<any> {
  return { suspicious: false };
}

export async function revokeToken(params: any): Promise<any> {
  return true;
}

export async function revokeAllActiveTokensForProfile(profileId: string): Promise<any> {
  return true;
}

export async function updateTokenAccess(tokenId: string, data: any): Promise<any> {
  return true;
}

export async function createAccessLog(params: any): Promise<any> {
  return true;
}

export async function createNfcToken(params: any): Promise<any> {
  return { id: 'mock-nfc-token', ...params };
}

export async function getTokensForUser(userId: string): Promise<any[]> {
  return [];
}

export interface PreAuthorizedDoctor {
  doctorId: string;
  doctorName?: string;
  hospitalName?: string;
  authorizedAt: Date;
}

export async function addPreAuthorizedDoctor(tokenId: string, doc: PreAuthorizedDoctor): Promise<any> {
  return true;
}

export async function createOtpSession(params: any): Promise<any> {
  return { id: 'mock-otp-session', ...params };
}

export async function incrementOtpRequest(params: any): Promise<any> {
  return 1;
}

export async function getActiveOtpForToken(tokenHash: string): Promise<any> {
  return null;
}

export async function verifyOtpSession(sessionId: string, otp: string): Promise<boolean> {
  return true;
}

export async function authorizeDoctorForToken(tokenId: string, doctorId: string): Promise<any> {
  return true;
}

export async function findOtpSession(sessionId: string): Promise<any> {
  return null;
}

export async function verifyOtp(sessionId: string, otp: string): Promise<boolean> {
  return true;
}

export async function recordOtpAttempt(params: any): Promise<any> {
  return true;
}

export async function flagOtpAsAnomalous(params: any): Promise<any> {
  return true;
}

export async function markOtpFailed(params: any): Promise<any> {
  return true;
}

export async function incrementOtpVerified(params: any): Promise<any> {
  return 1;
}

export async function countRecentFailedAttempts(params: any): Promise<number> {
  return 0;
}

export * from './doctors';
export * from './utils';
export * from './supabase';
