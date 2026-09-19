/**
 * Server-only persistence boundary.
 * Route code keeps Mongo-shaped collection calls; all reads/writes go to Supabase.
 */
import { supabaseAdmin } from "@/lib/server/supabase";
import { ObjectId, normalizeId } from "@/lib/server/ids";

type Row = Record<string, any>;

const TABLES: Record<string, string> = {
  users: "profiles",
  profiles: "patient_profiles",
  doctors: "doctors",
  medical_records: "medical_records",
  documents: "medical_documents",
  documentVersions: "document_versions",
  ocrOutputs: "ocr_outputs",
  classification: "document_classifications",
  classifications: "document_classifications",
  labStructured: "document_classifications",
  summaries: "document_summaries",
  jobs: "ai_jobs",
  userVitals: "user_vitals",
  userHealthSummary: "user_health_summaries",
  trends: "health_trends",
  timeline: "health_timeline",
  healthScores: "health_scores",
  insights: "health_insights",
  appointments: "appointments",
  families: "families",
  familyMembers: "family_members",
  familyInvites: "family_invites",
  shares: "shares",
  claims: "claims",
  alerts: "alerts",
  audits: "audit_events",
  doctorFiles: "doctor_files",
  doctorPatientNotes: "doctor_patient_notes",
  emergencyTokens: "emergency_tokens",
  emergency_tokens: "emergency_tokens",
  emergencyNfcTokens: "emergency_tokens",
  emergencyAudit: "audit_events",
  emergency_action_logs: "audit_events",
  emergency_access_logs: "emergency_access_logs",
  emergencyNfcAccessLogs: "emergency_access_logs",
  emergencyOtpSessions: "emergency_otp_sessions",
  sessions: "sessions",
};

const JSON_BAG = new Set([
  "users", "doctors", "profiles", "documents", "documentVersions", "ocrOutputs",
  "classification", "classifications", "labStructured", "summaries", "jobs",
  "userVitals", "userHealthSummary", "trends", "timeline", "healthScores", "insights",
  "appointments", "families", "familyInvites", "shares", "claims", "alerts", "audits",
  "doctorFiles", "doctorPatientNotes", "emergencyTokens", "emergency_tokens",
  "emergencyNfcTokens", "emergencyNfcAccessLogs", "emergency_access_logs",
  "emergencyOtpSessions", "sessions", "medical_records",
]);

const COLUMN_MAP: Record<string, Record<string, string>> = {
  users: { id: "id", _id: "id", email: "email", role: "role", createdAt: "created_at", updatedAt: "updated_at" },
  doctors: { id: "id", _id: "id", specialty: "specialty", verified: "verified", doctorCode: "doctor_code", createdAt: "created_at", updatedAt: "updated_at" },
  profiles: {
    id: "id", _id: "id", userId: "profile_id", type: "type", displayName: "display_name",
    allergies: "allergies", conditions: "conditions", medications: "medications",
    guardians: "guardians", vitalIdentifiers: "vital_identifiers", emergencyContacts: "emergency_contacts",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  documents: {
    id: "id", _id: "id", profileId: "patient_profile_id", ownerUserId: "owner_profile_id",
    docType: "document_type", title: "title", storageKey: "storage_key", mimeType: "mime_type",
    size: "size_bytes", sizeBytes: "size_bytes", status: "status", processingStatus: "processing_status",
    metadata: "metadata", createdAt: "created_at", updatedAt: "updated_at",
  },
  documentVersions: {
    id: "id", _id: "id", documentId: "medical_document_id", version: "version_number",
    storageKey: "storage_key", mimeType: "mime_type", size: "size_bytes", sizeBytes: "size_bytes",
    metadata: "metadata", createdAt: "created_at",
  },
  ocrOutputs: {
    id: "id", _id: "id", documentId: "medical_document_id", versionId: "document_version_id",
    extractedText: "text_content", text: "text_content", rawText: "raw_text",
    confidence: "confidence", engine: "engine", metadata: "metadata",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  classification: {
    id: "id", _id: "id", documentId: "medical_document_id", category: "category",
    detectedType: "detected_type", confidence: "confidence", createdAt: "created_at", updatedAt: "updated_at",
  },
  summaries: {
    id: "id", _id: "id", documentId: "medical_document_id", type: "summary_type",
    content: "content", text_content: "text_content", generatedAt: "generated_at", updatedAt: "updated_at",
  },
  jobs: {
    id: "id", _id: "id", type: "job_type", status: "status", priority: "priority", attempts: "attempts",
    payload: "payload", result: "result", error: "error", createdAt: "created_at", updatedAt: "updated_at",
  },
  userVitals: {
    id: "id", _id: "id", userId: "owner_profile_id", profileId: "patient_profile_id",
    documentId: "medical_document_id", type: "vital_type", vitalType: "vital_type",
    category: "vital_category", label: "label", value: "value_text", unit: "unit",
    source: "source", recordedAt: "recorded_at", documentDate: "recorded_at",
    explanation: "explanation", advice: "advice", status: "status", rawValue: "raw_value",
    createdAt: "created_at", updatedAt: "updated_at",
  },
  userHealthSummary: {
    id: "id", _id: "id", userId: "owner_profile_id", profileId: "patient_profile_id",
    summaryText: "summary_text", sections: "sections", metrics: "metrics",
    lastUpdated: "updated_at", generatedAt: "generated_at", updatedAt: "updated_at",
  },
  trends: { id: "id", _id: "id", profileId: "patient_profile_id", userId: "owner_profile_id", metric: "metric", values: "values", createdAt: "created_at", updatedAt: "updated_at" },
  timeline: { id: "id", _id: "id", profileId: "patient_profile_id", userId: "owner_profile_id", eventTime: "event_time", payload: "payload", createdAt: "created_at" },
  healthScores: { id: "id", _id: "id", profileId: "patient_profile_id", userId: "owner_profile_id", score: "score", payload: "payload", createdAt: "created_at", updatedAt: "updated_at" },
  insights: { id: "id", _id: "id", profileId: "patient_profile_id", userId: "owner_profile_id", insight: "insight", payload: "payload", createdAt: "created_at" },
  appointments: {
    id: "id", _id: "id", doctorId: "doctor_id", patientId: "patient_user_id",
    patientProfileId: "patient_profile_id", patientName: "patient_name", patientEmail: "patient_email",
    patientAge: "patient_age", patientGender: "patient_gender", date: "appointment_date",
    appointmentTime: "appointment_time", duration: "duration_minutes", status: "status",
    reason: "reason", notes: "notes", diagnosis: "diagnosis", prescription: "prescription",
    googleEventId: "google_event_id", createdAt: "created_at", updatedAt: "updated_at",
  },
  families: { id: "id", _id: "id", ownerId: "owner_profile_id", name: "name", createdAt: "created_at" },
  familyInvites: { id: "id", _id: "id", familyId: "family_id", email: "email", token: "token_hash", expiresAt: "expires_at", createdAt: "created_at" },
  shares: {
    id: "id", _id: "id", profileId: "patient_profile_id", ownerUserId: "owner_profile_id",
    grantedToUserId: "granted_to_profile_id", grantedToEmail: "granted_to_email",
    permissions: "permissions", scope: "scope", status: "status", expiresAt: "expires_at", createdAt: "created_at",
  },
  claims: { id: "id", _id: "id", profileId: "patient_profile_id", claimNumber: "claim_number", status: "status", createdAt: "created_at", updatedAt: "updated_at" },
  alerts: { id: "id", _id: "id", profileId: "patient_profile_id", severity: "severity", message: "message", eventTime: "event_time", status: "status", payload: "payload" },
  audits: {
    id: "id", _id: "id", actorId: "actor_profile_id", action: "action", targetType: "target_type",
    resourceId: "resource_id", result: "result", timestamp: "event_at", ipAddress: "ip_address",
    userAgent: "user_agent", details: "metadata", metadata: "metadata",
  },
  doctorFiles: {
    id: "id", _id: "id", appointmentId: "appointment_id", documentId: "medical_document_id",
    doctorId: "doctor_id", patientId: "patient_profile_id", originalFileId: "original_file_id",
    fileName: "file_name", fileType: "file_type", mimeType: "mime_type", storageKey: "storage_key",
    storageUrl: "storage_url", fileSize: "file_size", uploadedAt: "uploaded_at", transferredAt: "transferred_at", createdAt: "created_at",
  },
  doctorPatientNotes: {
    id: "id", _id: "id", doctorId: "doctor_id", patientId: "patient_user_id",
    patientProfileId: "patient_profile_id", note: "note", createdAt: "created_at", updatedAt: "updated_at",
  },
  emergencyTokens: {
    id: "id", _id: "id", userId: "owner_profile_id", profileId: "patient_profile_id",
    token: "token_hash", tokenHash: "token_hash", active: "active", expiresAt: "expires_at",
    preAuthorizedAccessList: "pre_authorized_access_list", createdAt: "created_at", revokedAt: "revoked_at",
  },
  emergencyNfcAccessLogs: {
    id: "id", _id: "id", tokenId: "token_id", profileId: "patient_profile_id",
    grantedProfileId: "granted_profile_id", action: "action", scannedAt: "scanned_at",
    timestamp: "scanned_at", ip: "ip_address", ipAddress: "ip_address", userAgent: "user_agent",
    location: "location", geoLocation: "location", metadata: "metadata",
  },
  emergencyOtpSessions: {
    id: "id", _id: "id", tokenId: "token_id", otpHash: "otp_hash", codeHash: "otp_hash",
    attempts: "attempts", verifiedAt: "verified_at", expiresAt: "expires_at", createdAt: "created_at",
  },
  sessions: { id: "id", _id: "id", userId: "user_id", token: "token", expiresAt: "expires_at", createdAt: "created_at" },
  medical_records: {
    id: "id", patientId: "patient_id", doctorId: "doctor_id", documentUrl: "document_url",
    documentType: "document_type", diseaseId: "disease_id", aiPrediction: "ai_prediction",
    status: "status", doctorReview: "doctor_review", isAccurate: "is_accurate",
    medicalDocumentId: "medical_document_id", modelName: "model_name", modelVersion: "model_version",
    modelConfidence: "model_confidence", explanation: "explanation",
    diagnosticMetadata: "diagnostic_metadata", sourceStorageKey: "source_storage_key",
    createdAt: "created_at", updatedAt: "updated_at",
  },
};

COLUMN_MAP.classifications = COLUMN_MAP.classification;
COLUMN_MAP.labStructured = COLUMN_MAP.classification;
COLUMN_MAP.emergency_tokens = COLUMN_MAP.emergencyTokens;
COLUMN_MAP.emergencyNfcTokens = COLUMN_MAP.emergencyTokens;
COLUMN_MAP.emergency_access_logs = COLUMN_MAP.emergencyNfcAccessLogs;

function camelToSnake(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(value: string) {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function normalize(value: any): any {
  if (value instanceof ObjectId) return value.toHexString();
  if (value && typeof value === "object" && typeof value.toHexString === "function") return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

function getPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setPath(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function flattenPatch(patch: Row): Row {
  const result: Row = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key.includes(".")) setPath(result, key, value);
    else result[key] = value;
  }
  return result;
}

function versionStorageId(value: Row) {
  const id = normalizeId(value.id || value._id);
  const documentId = normalizeId(value.documentId || value.medical_document_id || value.medicalDocumentId);
  if (documentId && id && !id.includes(":") && id.length < 40) return `${documentId}:${id}`;
  return id;
}

function fromRow(collection: string, row: Row): Row {
  const result: Row = {};
  const data = row.data && typeof row.data === "object" ? { ...row.data } : {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "data") continue;
    result[snakeToCamel(key)] = value;
  }
  Object.assign(result, data);
  result.id = row.id;
  result._id = row.id;
  result._supabaseId = row.id;

  if (collection === "users") {
    result.roles = result.roles || data.roles || (row.role ? [row.role] : ["patient"]);
    result.name = result.name || data.name;
    result.profile = result.profile || data.profile;
    result.familyId = result.familyId || data.familyId;
    result.familyRole = result.familyRole || data.familyRole;
    result.onboardingCompleted = result.onboardingCompleted ?? data.onboardingCompleted;
  }
  if (collection === "doctors") {
    result.doctorCode = row.doctor_code || data.doctorCode;
    result.email = result.email || data.email;
    result.name = result.name || data.name;
    result.userId = result.userId || row.id;
    result.profile = result.profile || data.profile;
    result.specialty = row.specialty || result.profile?.specialization;
  }
  if (collection === "profiles") {
    result.userId = row.profile_id;
    result.displayName = row.display_name;
    result.vitalIdentifiers = row.vital_identifiers;
    result.emergencyContacts = row.emergency_contacts;
  }
  if (collection === "documents") {
    result.profileId = row.patient_profile_id;
    result.ownerUserId = row.owner_profile_id;
    result.docType = row.document_type;
    result.storageKey = row.storage_key;
    result.processingStatus = row.processing_status;
    const metadata = { ...(row.metadata || {}), ...(data.metadata || {}) };
    result.metadata = metadata;
    result.fileName = result.fileName || metadata.fileName;
    result.originalName = result.originalName || metadata.originalName;
    result.versionId = result.versionId || metadata.versionId || "v1";
  }
  if (collection === "documentVersions") {
    const label = data.versionLabel || row.metadata?.versionLabel;
    if (label) result.id = label;
    result.documentId = row.medical_document_id;
    result.version = row.version_number;
    result.storageKey = row.storage_key;
    result.mimeType = row.mime_type;
    result.size = row.size_bytes;
  }
  if (collection === "ocrOutputs") {
    result.documentId = row.medical_document_id;
    result.versionId = data.versionLabel || row.document_version_id;
    result.extractedText = row.text_content;
    result.text = row.text_content;
    result.rawText = row.raw_text;
  }
  if (collection === "classification" || collection === "classifications" || collection === "labStructured") {
    result.documentId = row.medical_document_id;
    result.detectedType = row.detected_type;
    Object.assign(result, row.payload || {});
  }
  if (collection === "summaries") {
    result.documentId = row.medical_document_id;
    result.type = row.summary_type;
    result.content = row.content?.text ? row.content : (typeof row.text_content === "string" ? row.text_content : row.content);
    result.generatedAt = row.generated_at;
  }
  if (collection === "jobs") {
    result.type = row.job_type;
  }
  if (collection === "userVitals") {
    result.userId = row.owner_profile_id;
    result.documentId = row.medical_document_id;
    result.type = row.vital_type;
    result.category = row.vital_category;
    result.value = row.value_text;
    result.recordedAt = row.recorded_at;
  }
  if (collection === "userHealthSummary") {
    result.userId = row.owner_profile_id;
    result.summaryText = row.summary_text;
    result.lastUpdated = row.updated_at;
  }
  if (collection === "appointments") {
    result.doctorId = row.doctor_id;
    result.patientId = row.patient_user_id;
    result.date = row.appointment_date;
    result.appointmentTime = row.appointment_time;
    result.duration = row.duration_minutes;
    result.googleEventId = row.google_event_id;
  }
  if (collection === "families") {
    result.ownerId = row.owner_profile_id;
    result.members = data.members || [];
  }
  if (collection === "familyInvites") {
    result.familyId = row.family_id;
    result.token = row.token_hash || data.token;
    result.used = Boolean(row.used_at) || Boolean(data.used);
    result.expiresAt = row.expires_at;
  }
  if (["emergencyTokens", "emergency_tokens", "emergencyNfcTokens"].includes(collection)) {
    result.userId = row.owner_profile_id || data.userId;
    result.profileId = data.profileId || row.patient_profile_id;
    result.tokenHash = row.token_hash;
    result.token = row.token_hash;
    result.isActive = row.active && !row.revoked_at;
    result.active = row.active;
    result.revokedAt = row.revoked_at;
    result.preAuthorizedDoctors = row.pre_authorized_access_list || [];
    result.preAuthorizedAccessList = row.pre_authorized_access_list || [];
  }
  if (collection === "audits") {
    result.actorId = row.actor_profile_id;
    result.timestamp = row.event_at;
    result.targetType = row.target_type;
    result.resourceId = row.resource_id;
    result.ipAddress = row.ip_address;
    result.userAgent = row.user_agent;
  }
  if (collection === "emergencyNfcAccessLogs" || collection === "emergency_access_logs") {
    result.tokenId = row.token_id;
    result.timestamp = row.scanned_at;
    result.ip = row.ip_address;
    result.geoLocation = row.location;
  }
  if (collection === "emergencyOtpSessions") {
    result.tokenId = row.token_id;
    result.codeHash = row.otp_hash;
    result.expiresAt = row.expires_at;
  }
  return result;
}

function toRow(collection: string, value: Row): Row {
  const mapped = COLUMN_MAP[collection] || {};
  const known = new Set(Object.values(mapped));
  if (JSON_BAG.has(collection)) known.add("data");
  if (collection === "documents") known.add("metadata");
  const row: Row = {};
  const bag: Row = { ...(value.data || {}) };

  for (const [key, raw] of Object.entries(value)) {
    if (key === "_id" || key === "_supabaseId" || key === "data") continue;
    if (key.includes(".")) continue;
    const field = mapped[key];
    if (field) row[field] = normalize(raw);
    else bag[key] = normalize(raw);
  }

  if (collection === "users") {
    row.data = {
      ...bag,
      name: value.name || bag.name,
      roles: value.roles || bag.roles || ["patient"],
      profile: value.profile || bag.profile,
      familyId: value.familyId || bag.familyId,
      familyRole: value.familyRole || bag.familyRole,
      onboardingCompleted: value.onboardingCompleted ?? bag.onboardingCompleted,
    };
    if (Array.isArray(row.data.roles) && row.data.roles.includes("doctor")) row.role = "doctor";
    else if (!row.role) row.role = "patient";
  } else if (collection === "doctors") {
    delete bag.googleTokens;
    row.data = bag;
    if (value.profile?.specialization && !row.specialty) row.specialty = value.profile.specialization;
    if (value.userId && !row.id) row.id = normalizeId(value.userId);
  } else if (collection === "documents") {
    const metadata = { ...(value.metadata || {}), fileName: value.fileName, originalName: value.originalName, versionId: value.versionId || value.metadata?.versionId || "v1" };
    row.metadata = metadata;
    delete bag.metadata;
    delete bag.fileName;
    delete bag.originalName;
    delete bag.versionId;
    row.data = bag;
  } else if (collection === "documentVersions") {
    const label = String(value.id || value.versionLabel || "v1");
    const documentId = normalizeId(value.documentId);
    row.id = versionStorageId(value) || row.id;
    row.data = { ...bag, versionLabel: label };
    if (!row.version_number) {
      const parsed = Number(String(label).replace(/^v/i, ""));
      row.version_number = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }
    if (documentId) row.medical_document_id = documentId;
  } else if (collection === "ocrOutputs") {
    if (value.text && !row.text_content) row.text_content = value.text;
    if (value.extractedText && !row.text_content) row.text_content = value.extractedText;
    row.data = bag;
  } else if (collection === "classification" || collection === "classifications" || collection === "labStructured") {
    row.payload = {
      ...(value.payload || {}),
      observations: value.observations,
      panel: value.panel,
      inferredTags: value.inferredTags,
      type: value.type,
    };
    row.data = bag;
    if (!row.id && value.documentId) row.id = String(value.documentId);
  } else if (collection === "summaries") {
    if (typeof value.content === "string") {
      row.text_content = value.content;
      row.content = { text: value.content };
    } else if (value.content && typeof value.content === "object") {
      row.content = value.content;
      row.text_content = value.content.in_depth_summary || value.content.summary || JSON.stringify(value.content);
    }
    row.data = bag;
  } else if (collection === "families") {
    row.data = { ...bag, members: (value.members || bag.members || []).map(normalizeId) };
  } else if (collection === "familyInvites") {
    row.data = { ...bag, token: value.token || bag.token, used: value.used };
    if (value.used === true && !row.used_at) row.used_at = new Date().toISOString();
  } else if (["emergencyTokens", "emergency_tokens", "emergencyNfcTokens"].includes(collection)) {
    row.data = {
      ...bag,
      userId: normalizeId(value.userId || bag.userId),
      profileId: normalizeId(value.profileId || bag.profileId),
      deviceName: value.deviceName || bag.deviceName,
      nfcUrl: value.nfcUrl || bag.nfcUrl,
      otpRequiredForFullAccess: value.otpRequiredForFullAccess ?? bag.otpRequiredForFullAccess,
      otpExpiryMinutes: value.otpExpiryMinutes ?? bag.otpExpiryMinutes,
      isPermanent: value.isPermanent ?? bag.isPermanent,
      lastAccessedAt: value.lastAccessedAt || bag.lastAccessedAt,
      accessCount: value.accessCount ?? bag.accessCount,
      isActive: value.isActive ?? bag.isActive ?? value.active,
    };
    if (value.isActive === false || value.revoked) row.active = false;
  } else if (JSON_BAG.has(collection)) {
    row.data = bag;
  }

  if (!row.id && value._supabaseId) row.id = value._supabaseId;
  if (!row.id && value.id) row.id = normalizeId(value.id);
  if (!row.id && value._id) row.id = normalizeId(value._id);
  return row;
}

function valuesEqual(actual: any, expected: any) {
  return normalizeId(normalize(actual)) === normalizeId(normalize(expected)) || normalize(actual) === normalize(expected);
}

function matches(collection: string, raw: Row, query: Row): boolean {
  if (!query || Object.keys(query).length === 0) return true;
  const mapped = fromRow(collection, raw);
  if (Array.isArray(query.$or) && !query.$or.some((item: Row) => matches(collection, raw, item))) return false;
  for (const [key, expected] of Object.entries(query)) {
    if (key === "$or") continue;
    const actual = key.includes(".") ? getPath(mapped, key) : mapped[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof Date) && !(expected instanceof ObjectId) && typeof expected.toHexString !== "function") {
      if ("$in" in expected && !(expected.$in as any[]).some((item) => valuesEqual(actual, item))) return false;
      if ("$ne" in expected && valuesEqual(actual, expected.$ne)) return false;
      if ("$exists" in expected && Boolean(actual !== undefined && actual !== null) !== expected.$exists) return false;
      if ("$regex" in expected) {
        const regex = expected.$regex instanceof RegExp ? expected.$regex : new RegExp(String(expected.$regex), expected.$options || "");
        if (!regex.test(String(actual ?? ""))) return false;
      }
    } else if (!valuesEqual(actual, expected)) return false;
  }
  return true;
}

class SupabaseCursor<T extends Row> {
  constructor(private readonly collection: string, private readonly rowsPromise: Promise<Row[]>) {}
  private operations: ((rows: Row[]) => Row[])[] = [];
  sort(spec: Row) {
    this.operations.push((rows) => [...rows].sort((a, b) => {
      const left = fromRow(this.collection, a);
      const right = fromRow(this.collection, b);
      for (const [key, direction] of Object.entries(spec)) {
        const av = left[key];
        const bv = right[key];
        if (av === bv) continue;
        return ((av > bv ? 1 : -1) * (direction as number));
      }
      return 0;
    }));
    return this;
  }
  limit(count: number) {
    this.operations.push((rows) => rows.slice(0, count));
    return this;
  }
  skip(count: number) {
    this.operations.push((rows) => rows.slice(count));
    return this;
  }
  project(projection: Row) {
    this.operations.push((rows) => rows.map((row) => {
      const mapped = fromRow(this.collection, row);
      const selected: Row = {};
      for (const key of Object.keys(projection)) if (projection[key]) selected[key] = mapped[key];
      return selected;
    }));
    return this;
  }
  async toArray(): Promise<T[]> {
    let rows = await this.rowsPromise;
    for (const operation of this.operations) rows = operation(rows);
    return rows.map((row) => fromRow(this.collection, row) as T);
  }
}

async function attachDoctorCredentials(rows: Row[]) {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id).filter(Boolean);
  const { data } = await supabaseAdmin()
    .from("doctor_provider_credentials")
    .select("*")
    .eq("provider", "google")
    .in("doctor_id", ids);
  const byDoctor = new Map((data || []).map((item: any) => [item.doctor_id, item]));
  return rows.map((row) => {
    const cred = byDoctor.get(row.id);
    if (!cred) return row;
    return {
      ...row,
      data: {
        ...(row.data || {}),
        googleTokens: {
          access_token: cred.encrypted_access_token,
          refresh_token: cred.encrypted_refresh_token,
          expiry_date: cred.expires_at ? new Date(cred.expires_at).getTime() : 0,
        },
      },
    };
  });
}

async function saveDoctorCredentials(doctorId: string, tokens: any) {
  if (!tokens || !tokens.access_token) return;
  const { error } = await supabaseAdmin().from("doctor_provider_credentials").upsert({
    doctor_id: doctorId,
    provider: "google",
    encrypted_access_token: tokens.access_token,
    encrypted_refresh_token: tokens.refresh_token || null,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "doctor_id,provider" });
  if (error) throw new Error(`doctor credential save failed: ${error.message}`);
}

class SupabaseCollection<T extends Row> {
  constructor(private readonly collection: string) {}
  private table() {
    const table = TABLES[this.collection];
    if (!table) throw new Error(`Unsupported Supabase collection: ${this.collection}`);
    return table;
  }

  private async queryRows(query: Row = {}): Promise<Row[]> {
    let request = supabaseAdmin().from(this.table()).select("*");
    const idValue = query.id || query._id;
    if (idValue && typeof idValue !== "object") request = request.eq("id", normalizeId(idValue));
    else if (idValue && typeof idValue === "object" && "$in" in idValue) request = request.in("id", (idValue.$in as any[]).map(normalizeId));
    if (typeof query.email === "string") request = request.eq("email", query.email);
    if (this.collection === "documents" && query.profileId && typeof query.profileId !== "object") {
      request = request.eq("patient_profile_id", normalizeId(query.profileId));
    }
    if (this.collection === "documents" && query.ownerUserId && typeof query.ownerUserId !== "object") {
      request = request.eq("owner_profile_id", normalizeId(query.ownerUserId));
    }
    if (this.collection === "ocrOutputs" && query.documentId && typeof query.documentId !== "object") {
      request = request.eq("medical_document_id", normalizeId(query.documentId));
    }
    if ((this.collection === "classification" || this.collection === "classifications") && query.documentId && typeof query.documentId !== "object") {
      request = request.eq("medical_document_id", normalizeId(query.documentId));
    }
    if (this.collection === "jobs" && query.status && typeof query.status !== "object") request = request.eq("status", query.status);
    if (["emergencyTokens", "emergencyNfcTokens", "emergency_tokens"].includes(this.collection) && (query.tokenHash || query.token) && typeof (query.tokenHash || query.token) !== "object") {
      request = request.eq("token_hash", String(query.tokenHash || query.token));
    }
    const { data, error } = await request;
    if (error) throw new Error(`${this.collection} read failed: ${error.message}`);
    let rows = data || [];
    if (this.collection === "doctors") rows = await attachDoctorCredentials(rows);
    if (this.collection === "documentVersions" && query.id && query.documentId) {
      const composite = `${normalizeId(query.documentId)}:${normalizeId(query.id)}`;
      const exact = rows.filter((row) => row.id === composite || row.id === normalizeId(query.id));
      if (exact.length) rows = exact;
    }
    return rows.filter((row) => matches(this.collection, row, query));
  }

  find(query: Row = {}) {
    return new SupabaseCursor<T>(this.collection, this.queryRows(query));
  }

  async findOne(query: Row = {}) {
    return (await this.find(query).limit(1).toArray())[0] as T | null || null;
  }

  private async persistDoctorTokens(row: Row, source: Row) {
    const tokens = source.googleTokens || source["googleTokens.access_token"] ? {
      access_token: source.googleTokens?.access_token || source["googleTokens.access_token"],
      refresh_token: source.googleTokens?.refresh_token || source["googleTokens.refresh_token"],
      expiry_date: source.googleTokens?.expiry_date || source["googleTokens.expiry_date"],
    } : null;
    if (tokens?.access_token && row.id) await saveDoctorCredentials(String(row.id), tokens);
  }

  async insertOne(value: T) {
    const row = toRow(this.collection, value);
    if (!row.id) row.id = normalizeId((value as any).id || (value as any)._id) || cryptoRandom();
    const { data, error } = await supabaseAdmin().from(this.table()).insert(row).select("*").single();
    if (error) throw new Error(`${this.collection} insert failed: ${error.message}`);
    if (this.collection === "doctors") await this.persistDoctorTokens(data, value);
    return { insertedId: data?.id };
  }

  async insertMany(values: T[]) {
    for (const value of values) await this.insertOne(value);
    return { insertedCount: values.length };
  }

  private applyUpdateOps(existing: Row, update: Row) {
    const patch: Row = { ...(update.$set || {}) };
    for (const [key, value] of Object.entries(update.$setOnInsert || {})) {
      if (existing[key] === undefined) patch[key] = value;
    }
    for (const [key, value] of Object.entries(update.$inc || {})) {
      patch[key] = (Number(existing[key]) || 0) + Number(value);
    }
    for (const [key, value] of Object.entries(update.$unset || {})) {
      if (value) patch[key] = null;
    }
    for (const [key, value] of Object.entries(update.$push || {})) {
      patch[key] = [...(Array.isArray(existing[key]) ? existing[key] : []), value];
    }
    for (const [key, value] of Object.entries(update.$addToSet || {})) {
      const values = Array.isArray(existing[key]) ? existing[key] : [];
      patch[key] = values.some((item) => valuesEqual(item, value)) ? values : [...values, value];
    }
    for (const [key, value] of Object.entries(update.$pull || {})) {
      const values = Array.isArray(existing[key]) ? existing[key] : [];
      patch[key] = values.filter((item) => !valuesEqual(item, value));
    }
    if (!update.$set && !update.$inc && !update.$unset && !update.$push && !update.$addToSet && !update.$pull && !update.$setOnInsert) {
      Object.assign(patch, update);
    }
    return flattenPatch(patch);
  }

  async updateOne(query: Row, update: Row, options: { upsert?: boolean } = {}) {
    const existing = await this.findOne(query);
    if (!existing) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      const inserted = { ...query, ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      delete (inserted as any).$or;
      await this.insertOne(inserted as T);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    const patch = this.applyUpdateOps(existing, update);
    const row = toRow(this.collection, { ...existing, ...patch });
    const supabaseId = existing._supabaseId || existing.id;
    delete row.id;
    const { error } = await supabaseAdmin().from(this.table()).update(row).eq("id", supabaseId);
    if (error) throw new Error(`${this.collection} update failed: ${error.message}`);
    if (this.collection === "doctors") await this.persistDoctorTokens({ id: supabaseId }, { ...existing, ...patch });
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(query: Row) {
    const existing = await this.findOne(query);
    if (!existing) return { deletedCount: 0 };
    const { error } = await supabaseAdmin().from(this.table()).delete().eq("id", existing._supabaseId || existing.id);
    if (error) throw new Error(`${this.collection} delete failed: ${error.message}`);
    return { deletedCount: 1 };
  }

  async deleteMany(query: Row) {
    const rows = await this.find(query).toArray();
    for (const row of rows) await this.deleteOne({ id: row._supabaseId || row.id });
    return { deletedCount: rows.length };
  }

  async createIndex() {
    return undefined;
  }
}

function cryptoRandom() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export async function getCollection<T extends Row = Row>(name: string): Promise<SupabaseCollection<T>> {
  return new SupabaseCollection<T>(name);
}

export async function getDbClient() {
  return {
    collection<T extends Row = Row>(name: string) {
      return new SupabaseCollection<T>(name);
    },
  };
}

export { ObjectId, normalizeId };
