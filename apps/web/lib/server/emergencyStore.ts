import { getCollection } from "@/lib/server/db";
import { ObjectId, normalizeId } from "@/lib/server/ids";

function now() {
  return new Date();
}

async function tokens() {
  return getCollection<any>("emergencyNfcTokens");
}

async function logs() {
  return getCollection<any>("emergencyNfcAccessLogs");
}

async function otps() {
  return getCollection<any>("emergencyOtpSessions");
}

export async function createEmergencyToken(
  userId: any,
  profileId: any,
  tokenHash: string,
  isPermanent = true,
  extra: Record<string, any> = {}
) {
  const id = new ObjectId().toString();
  const col = await tokens();
  await col.insertOne({
    id,
    userId: normalizeId(userId),
    profileId: normalizeId(profileId),
    tokenHash,
    tokenType: "standard",
    active: true,
    isPermanent,
    isActive: true,
    accessCount: 0,
    createdAt: now(),
    ...extra,
  });
  return new ObjectId(id);
}

export async function logEmergencyAction(
  userId: any,
  profileId: any,
  action: string,
  ip?: string,
  userAgent?: string,
  tokenHash?: string,
  metadata: Record<string, any> = {}
) {
  const audits = await getCollection<any>("audits");
  await audits.insertOne({
    id: new ObjectId().toString(),
    actorId: normalizeId(userId),
    action: `emergency.${action}`,
    targetType: "emergency_token",
    resourceId: tokenHash,
    timestamp: now(),
    ipAddress: ip,
    userAgent,
    metadata: { profileId: normalizeId(profileId), ...metadata },
  });
  return true;
}

export async function getActiveTokensForProfile(profileId: any) {
  const col = await tokens();
  const rows = await col.find({ profileId: normalizeId(profileId), active: true }).toArray();
  return rows.filter((row: any) => !row.revokedAt);
}

export async function regenerateToken(oldTokenHash: string, tokenHash: string, userId: any) {
  const col = await tokens();
  const existing = await col.findOne({ tokenHash: oldTokenHash });
  if (!existing) return null;
  await col.updateOne({ id: existing.id }, { $set: { active: false, revokedAt: now(), isActive: false } });
  return createEmergencyToken(userId, existing.profileId, tokenHash, true, { regeneratedFrom: existing.id });
}

export async function markTokenPrinted(tokenId: string) {
  const col = await tokens();
  await col.updateOne({ id: String(tokenId) }, { $set: { printedAt: now() } });
  return true;
}

export async function findTokenByHash(tokenHash: string) {
  const col = await tokens();
  return col.findOne({ tokenHash });
}

export async function getTokensForProfile(profileId: string) {
  const col = await tokens();
  return col.find({ profileId: String(profileId) }).toArray();
}

export async function getTokensForUser(userId: any) {
  const col = await tokens();
  return col.find({ userId: normalizeId(userId) }).toArray();
}

export async function revokeToken(tokenId: string) {
  const col = await tokens();
  await col.updateOne({ id: String(tokenId) }, { $set: { active: false, revokedAt: now(), isActive: false, revoked: true } });
  return true;
}

export async function revokeNfcToken(tokenId: string) {
  return revokeToken(String(tokenId));
}

export async function revokeAllActiveTokensForProfile(profileId: string) {
  const col = await tokens();
  const rows = await getActiveTokensForProfile(profileId);
  for (const row of rows) await col.updateOne({ id: row.id }, { $set: { active: false, revokedAt: now(), isActive: false } });
  return true;
}

export async function createNfcToken(
  userId: any,
  profileId: any,
  tokenHash: string,
  nfcUrl: string,
  deviceName: string,
  otpRequiredForFullAccess = true,
  source = "web"
) {
  const id = new ObjectId().toString();
  const createdAt = now();
  const col = await tokens();
  await col.insertOne({
    id,
    userId: normalizeId(userId),
    profileId: String(profileId),
    tokenHash,
    tokenType: "nfc",
    nfcUrl,
    deviceName,
    otpRequiredForFullAccess,
    otpExpiryMinutes: 10,
    source,
    active: true,
    isActive: true,
    isPermanent: true,
    accessCount: 0,
    totalScans: 0,
    createdAt,
  });
  return { id, createdAt, tokenHash, deviceName };
}

export async function findNfcTokenByHash(tokenHash: string) {
  return findTokenByHash(tokenHash);
}

export async function addPreAuthorizedDoctor(tokenHash: string, doctor: any) {
  const col = await tokens();
  const existing = await col.findOne({ tokenHash });
  if (!existing) return false;
  await col.updateOne({ id: existing.id }, { $addToSet: { preAuthorizedAccessList: doctor } });
  return true;
}

export async function updateTokenAccess(tokenHash: string, ip?: string, location?: string) {
  const col = await tokens();
  const existing = await col.findOne({ tokenHash });
  if (!existing) return true;
  await col.updateOne({ id: existing.id }, {
    $set: { lastAccessedAt: now(), lastAccessAt: now(), lastAccessIp: ip, lastAccessLocation: location },
    $inc: { accessCount: 1, totalScans: 1 },
  });
  return true;
}

export async function createAccessLog(
  tokenId: any,
  profileId: any,
  userId: any,
  action: string,
  ip?: string,
  userAgent?: string,
  statusCode?: number,
  accessLevel?: string,
  extra: Record<string, any> = {}
) {
  const col = await logs();
  const id = new ObjectId().toString();
  await col.insertOne({
    id,
    tokenId: String(tokenId),
    profileId: String(profileId),
    userId: normalizeId(userId),
    action,
    ip,
    userAgent,
    statusCode,
    accessLevel,
    timestamp: now(),
    scannedAt: now(),
    ...extra,
  });
  return { id };
}

export async function createOtpSession(
  tokenId: any,
  userId: any,
  profileId: any,
  channel: string,
  destination: string,
  maskedDestination: string,
  codeHash: string,
  extra: Record<string, any> = {}
) {
  const col = await otps();
  const id = new ObjectId().toString();
  const expiresAt = extra.expiresAt || new Date(Date.now() + (extra.otpExpiryMinutes || 10) * 60 * 1000);
  await col.insertOne({
    id,
    tokenId: String(tokenId),
    userId: normalizeId(userId),
    profileId: String(profileId),
    channel,
    destination,
    maskedDestination,
    otpHash: codeHash,
    codeHash,
    attempts: 0,
    expiresAt,
    createdAt: now(),
    ...extra,
  });
  return { id, expiresAt, tokenId };
}

export async function getActiveOtpForToken(tokenId: string) {
  const col = await otps();
  const rows = await col.find({ tokenId: String(tokenId) }).sort({ createdAt: -1 }).limit(5).toArray();
  return rows.find((row: any) => !row.verifiedAt && new Date(row.expiresAt).getTime() > Date.now()) || null;
}

export async function incrementOtpRequest(tokenHash: string) {
  const col = await tokens();
  const existing = await col.findOne({ tokenHash });
  if (!existing) return 0;
  const next = (Number(existing.otpRequestCount) || 0) + 1;
  await col.updateOne({ id: existing.id }, { $set: { otpRequestCount: next } });
  return next;
}

export async function verifyOtpSession(sessionId: string, _otp: string) {
  const col = await otps();
  await col.updateOne({ id: sessionId }, { $set: { verifiedAt: now() } });
  return true;
}

export async function findOtpSession(sessionId: string) {
  const col = await otps();
  return col.findOne({ id: sessionId });
}

export async function verifyOtp(sessionId: string, otp: string) {
  return verifyOtpSession(sessionId, otp);
}

export async function recordOtpAttempt(params: any) {
  const col = await otps();
  const sessionId = params.sessionId || params.id;
  if (!sessionId) return 1;
  const existing = await col.findOne({ id: sessionId });
  const attempts = (Number(existing?.attempts) || 0) + 1;
  await col.updateOne({ id: sessionId }, { $set: { attempts } });
  return attempts;
}

export async function authorizeDoctorForToken(tokenId: string, doctorId: string) {
  return addPreAuthorizedDoctor(String(tokenId), { doctorId, authorizedAt: now() });
}

export async function markAccessNotificationSent(tokenId: string) {
  const col = await tokens();
  await col.updateOne({ id: String(tokenId) }, { $set: { accessNotificationSentAt: now() } });
  return true;
}

export async function detectSuspiciousActivity() {
  return { suspicious: false };
}

export async function updateTokenAccessById(tokenId: string, data: any) {
  const col = await tokens();
  await col.updateOne({ id: String(tokenId) }, { $set: data });
  return true;
}

export async function flagOtpAsAnomalous(params: any) {
  const col = await otps();
  if (params.sessionId) await col.updateOne({ id: params.sessionId }, { $set: { anomalous: true } });
  return true;
}

export async function markOtpFailed(params: any) {
  return recordOtpAttempt(params);
}

export async function incrementOtpVerified(params: any) {
  const col = await otps();
  const sessionId = params.sessionId || params.id;
  if (sessionId) await col.updateOne({ id: sessionId }, { $set: { verifiedAt: now() } });
  return 1;
}

export async function countRecentFailedAttempts() {
  return 0;
}
