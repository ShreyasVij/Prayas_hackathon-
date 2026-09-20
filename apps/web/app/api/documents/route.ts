import { NextRequest, NextResponse } from "next/server";
import { DRY_RUN, MOCK_DOCUMENTS } from "@/lib/dry-run/mock-data";
import { randomUUID } from "crypto";
import { getCollection } from "@/lib/server/db";
import { regenerateHealthSummary } from "@/lib/server/vitalsProcessor";
import type { DocumentDocument } from "@/packages/db/documents";
import type { DocumentVersionDocument } from "@/packages/db/documentVersions";
import { uploadFile } from "@/services/storageClient";
import { logAudit } from "@/lib/server/audit";
import {
  canAccessProfile,
  canUploadDocument,
  canDeleteDocument,
} from "@/lib/server/permissions";
import type { JobDocument } from "@/packages/db/jobs";
import type { ProfileDocument } from "@/packages/db/profiles";
import { getIdentity } from "@/lib/server/auth";
import { ensureUserSpace } from "@/services/storageClient";

/**
 * Checks whether the requested profile belongs directly to the
 * currently authenticated actor.
 *
 * This is intentionally narrow:
 * - It only grants access to an exact actor/profile ownership match.
 * - It does not replace family/doctor/shared-profile permissions.
 * - Existing permission helpers remain the first authorization path.
 */
async function isOwnProfile({
  profileId,
  actorId,
}: {
  profileId: string;
  actorId: string;
}): Promise<boolean> {
  if (!profileId || !actorId) return false;

  const profilesCol = await getCollection<ProfileDocument>("profiles");

  const profile = await profilesCol.findOne({
    id: profileId,
    userId: actorId,
  } as any);

  if (profile) return true;

  // Compatibility fallback for profiles whose primary id is also
  // the authenticated user's id.
  if (profileId === actorId) {
    const matchingProfile = await profilesCol.findOne({
      id: actorId,
    } as any);

    return Boolean(matchingProfile);
  }

  return false;
}

/**
 * Checks whether a document belongs directly to the authenticated actor.
 *
 * Used only as a fallback when the existing centralized permission helper
 * denies access. This preserves the existing permission model while
 * allowing the owner of their own document to manage it.
 */
async function isOwnDocument({
  docId,
  actorId,
}: {
  docId: string;
  actorId: string;
}): Promise<boolean> {
  if (!docId || !actorId) return false;

  const documentsCol = await getCollection<DocumentDocument>("documents");

  const document = await documentsCol.findOne({
    id: docId,
    ownerUserId: actorId,
  } as any);

  return Boolean(document);
}

export async function GET(request: NextRequest) {
  // ── DRY RUN ──────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    return NextResponse.json({ data: MOCK_DOCUMENTS }, { status: 200 });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { role, actorId } = await getIdentity();

  let profileId =
    request.nextUrl.searchParams.get("profileId") || "default-profile";

  const statusFilter = (request.nextUrl.searchParams.get("status") ||
    "active") as DocumentDocument["status"];

  // Resolve/auto-create a profile for the actor if a placeholder was provided.
  if (profileId === "default-profile" || !profileId) {
    const profilesCol = await getCollection<ProfileDocument>("profiles");

    const existing = await profilesCol.findOne({
      userId: actorId,
    } as any);

    if (existing) {
      profileId = existing.id;
    } else {
      const now = new Date();

      const newProfile: ProfileDocument = {
        id: randomUUID(),
        userId: actorId,
        type: "self",
        displayName: "Self",
        allergies: [],
        conditions: [],
        guardians: [],
        vitalIdentifiers: {},
        createdAt: now,
        updatedAt: now,
      } as any;

      await profilesCol.insertOne(newProfile as any);

      profileId = newProfile.id;
    }
  }

  // Existing permission model remains authoritative first.
  const profileAllowed = await canAccessProfile({
    role,
    profileId,
    actorId,
  });

  // Safe owner fallback for the authenticated user's own profile.
  const ownProfile = profileAllowed
    ? true
    : await isOwnProfile({
        profileId,
        actorId,
      });

  if (!ownProfile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const documentsCol =
    await getCollection<DocumentDocument>("documents");

  const summariesCol = await getCollection<any>("summaries");

  const versionsCol =
    await getCollection<DocumentVersionDocument>("documentVersions");

  const ocrCol = await getCollection<any>("ocrOutputs");

  console.log(
    `[DOCUMENTS] GET: profileId=${profileId}, actorId=${actorId}`,
  );

  const docs = await documentsCol
    .find({
      profileId,
      status: statusFilter,
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  console.log(`[DOCUMENTS] Found ${docs.length} documents`);

  function parseDoctor(text: string | undefined): string | undefined {
    if (!text) return undefined;

    // 1) Common pattern: Dr. First Last
    let m = text.match(
      /Dr\.?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/,
    );

    if (m) return m[0];

    // 2) Name with medical suffix:
    // First Last, M.D. | MD | MBBS | D.O. | DO
    m = text.match(
      /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\s*,\s*(M\.?D\.?|MBBS|M\.B\.B\.S\.|D\.?O\.?|DO|DM|MCh|FRCS|MRCP)\b/,
    );

    if (m) return `${m[1]}, ${m[2]}`;

    // 3) Lines preceding a specialty keyword
    m = text.match(
      /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})\b\s*\n\s*(Internal Medicine|Cardiology|Neurology|Oncology|Pediatrics)/,
    );

    if (m) return m[1];

    return undefined;
  }

  function parseField(
    text: string | undefined,
    label: string,
  ): string | undefined {
    if (!text) return undefined;

    const re = new RegExp(
      `${label}\\s*:\\s*([^\\n\\r]+)`,
      "i",
    );

    const m = text.match(re);

    return m ? m[1].trim() : undefined;
  }

  function parseDob(text: string | undefined): string | undefined {
    return parseField(text, "Date of Birth");
  }

  function parseReportDate(
    text: string | undefined,
  ): string | undefined {
    return parseField(text, "Report Date");
  }

  function parsePatientName(
    text: string | undefined,
  ): string | undefined {
    return parseField(text, "Patient Name");
  }

  // Attach summary, mimeType, and inferred doctor name.
  const enriched = await Promise.all(
    docs.map(async (d: any) => {
      const [sumDocByDocumentId, ver, ocr] = await Promise.all([
        summariesCol.findOne({
          documentId: d.id,
          type: "doc",
        } as any),

        versionsCol.findOne({
          id: d.versionId,
          documentId: d.id,
        } as any),

        ocrCol.findOne({
          id: `${d.id}:${d.versionId}`,
        } as any),
      ]);

      const sumDoc =
        sumDocByDocumentId ||
        (await summariesCol.findOne({
          id: d.id,
          type: "doc",
        } as any));

      const meta = d.metadata || {};

      const originalName =
        d.originalName ||
        d.fileName ||
        meta.originalName ||
        meta.fileName;

      // Preserve full AI summary payload.
      const summaryFull: any =
        sumDoc?.content ??
        (meta.summary !== undefined ? meta.summary : undefined);

      let summaryContent: any =
        typeof meta.summary === "string" && meta.summary.trim()
          ? meta.summary
          : undefined;

      // Preserve the existing variable for compatibility with the
      // current response-building flow.
      void summaryContent;

      // Create a short preview string for list display.
      let summary: string | undefined = undefined;

      if (summaryFull && typeof summaryFull === "object") {
        const firstFinding =
          Array.isArray(summaryFull.key_findings) &&
          summaryFull.key_findings[0]
            ? String(summaryFull.key_findings[0])
            : "";

        const inDepth =
          typeof summaryFull.in_depth_summary === "string"
            ? summaryFull.in_depth_summary
            : "";

        const base = firstFinding || inDepth;

        summary = base
          ? base.length > 160
            ? `${base.slice(0, 160)}…`
            : base
          : undefined;
      } else if (typeof summaryFull === "string") {
        summary = summaryFull;
      }

      const doctorFromSummary = parseDoctor(summary);
      const doctorFromOcr = parseDoctor(ocr?.text);

      const doctorFromMeta =
        typeof meta.doctor_name === "string"
          ? meta.doctor_name
          : typeof (
                meta.doctor ||
                meta.doctorName ||
                meta.physician ||
                meta.provider
              ) === "string"
            ? meta.doctor ||
              meta.doctorName ||
              meta.physician ||
              meta.provider
            : undefined;

      const doctorName =
        doctorFromMeta ||
        doctorFromSummary ||
        doctorFromOcr;

      // Fallback parsing from OCR text where metadata isn't present yet.
      const patientName =
        (meta.patient_name as string | undefined) ||
        parsePatientName(ocr?.text);

      const dob =
        (meta.dob as string | undefined) ||
        parseDob(ocr?.text);

      const diagnosis =
        (meta.diagnosis as string | undefined) || undefined;

      const reportDate =
        (meta.report_date as string | undefined) ||
        parseReportDate(ocr?.text);

      return {
        ...d,
        originalName,
        summary,
        summary_full: summaryFull,
        mimeType: ver?.mimeType,
        doctorName,

        // Bubble up common metadata fields for convenience in UI.
        patient_name: patientName ?? undefined,
        dob: dob ?? undefined,
        diagnosis: diagnosis ?? undefined,
        report_date: reportDate ?? undefined,
        medications: Array.isArray(meta.medications)
          ? meta.medications
          : [],
        vitals: Array.isArray(meta.vitals)
          ? meta.vitals
          : [],
      };
    }),
  );

  return NextResponse.json(
    { data: enriched },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;

    const filesMulti = formData
      .getAll("files")
      .filter((f) => f instanceof File) as File[];

    let profileId =
      (formData.get("profileId") as string) ||
      "default-profile";

    const docType = ((formData.get("docType") as string) ||
      "other") as DocumentDocument["docType"];

    const metaRaw = (formData.get("meta") as string) || "";

    let initialMeta: any = undefined;

    try {
      if (metaRaw) {
        initialMeta = JSON.parse(metaRaw);
      }
    } catch {
      // Keep existing behavior: malformed optional metadata should
      // not prevent the upload itself from proceeding.
    }

    // Debug logging retained from the existing implementation.
    const fs = await import("fs");
    const path = await import("path");

    const logPath = path.join(
      process.cwd(),
      "apps",
      "ai",
      "logs",
      "ocr_upsert_debug.log",
    );

    function logToFile(msg: string) {
      const dir = path.dirname(logPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] ${msg}\n`,
      );
    }

    console.log(
      "[DOCUMENTS][POST] initialMeta:",
      initialMeta,
    );

    logToFile(
      `[POST] initialMeta: ${JSON.stringify(initialMeta)}`,
    );

    if (
      initialMeta &&
      typeof initialMeta.raw_text === "string"
    ) {
      const preview = initialMeta.raw_text.slice(0, 200);

      console.log(
        "[DOCUMENTS][POST] initialMeta.raw_text:",
        preview,
      );

      logToFile(
        `[POST] initialMeta.raw_text: ${preview}`,
      );
    }

    const { role, actorId } = await getIdentity();

    if (!file && filesMulti.length === 0) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    // Resolve/auto-create a profile for the actor if a placeholder
    // was provided.
    if (profileId === "default-profile" || !profileId) {
      const profilesCol =
        await getCollection<ProfileDocument>("profiles");

      const existing = await profilesCol.findOne({
        userId: actorId,
      } as any);

      if (existing) {
        profileId = existing.id;
      } else {
        const now = new Date();

        const newProfile: ProfileDocument = {
          id: randomUUID(),
          userId: actorId,
          type: "self",
          displayName: "Self",
          allergies: [],
          conditions: [],
          guardians: [],
          vitalIdentifiers: {},
          createdAt: now,
          updatedAt: now,
        } as any;

        await profilesCol.insertOne(newProfile as any);

        await ensureUserSpace({
          actorId,
        });

        profileId = newProfile.id;
      }
    }

    // Existing centralized permission check first.
    const uploadAllowed = await canUploadDocument({
      role,
      profileId,
      actorId,
    });

    // Narrow owner fallback:
    // authenticated actor may upload to their own profile.
    const ownProfile = uploadAllowed
      ? true
      : await isOwnProfile({
          profileId,
          actorId,
        });

    if (!ownProfile) {
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403 },
      );
    }

    // Generate IDs and storage key(s).
    const docId = randomUUID();
    const versionId = "v1";

    const baseKey =
      `raw/${actorId}/${docId}/${versionId}/original`;

    let storageKey = baseKey;
    let storageKeys: string[] | undefined = undefined;

    if (filesMulti.length > 0) {
      storageKeys = [];

      for (let i = 0; i < filesMulti.length; i++) {
        const pageKey =
          `${baseKey}/page-${i + 1}`;

        await uploadFile({
          storageKey: pageKey,
          file: filesMulti[i],
        });

        storageKeys.push(pageKey);
      }
    } else if (file) {
      await uploadFile({
        storageKey,
        file,
      });
    }

    // Persist metadata in MongoDB.
    const documentsCol =
      await getCollection<DocumentDocument>("documents");

    const versionsCol =
      await getCollection<DocumentVersionDocument>(
        "documentVersions",
      );

    const ocrCol =
      await getCollection<any>("ocrOutputs");

    const vitalsCol =
      await getCollection<any>("userVitals");

    const now = new Date();

    const docMeta: DocumentDocument = {
      id: docId,
      profileId,
      ownerUserId: actorId,

      originalName:
        filesMulti.length > 0
          ? filesMulti
              .map((uploadedFile) => uploadedFile.name)
              .join(", ")
          : file?.name,

      docType,
      storageKey,
      versionId,
      processingStatus: "pending",
      status: "active",
      createdAt: now,
      updatedAt: now,
      metadata: initialMeta || undefined,
    };

    const totalSize =
      filesMulti.length > 0
        ? filesMulti.reduce(
            (acc, f) => acc + (f.size || 0),
            0,
          )
        : file?.size || 0;

    const versionMeta: DocumentVersionDocument = {
      id: versionId,
      documentId: docId,
      storageKey,
      size: totalSize,
      mimeType:
        filesMulti.length > 0
          ? "application/octet-stream"
          : file?.type || undefined,
      createdAt: now,
    };

    try {
      await documentsCol.insertOne(docMeta as any);
    } catch (insertError: any) {
      console.error(
        "[DOCUMENTS] Insert failed:",
        insertError,
      );

      console.error(
        "[DOCUMENTS] Document data:",
        JSON.stringify(docMeta, null, 2),
      );

      throw new Error(
        `Document insert failed: ${
          insertError.message || "validation error"
        }`,
      );
    }

    await versionsCol.insertOne(versionMeta as any);

    // --- OCR/vitals persistence ---
    let ocrSaved = false;
    let vitalsSaved = false;

    if (initialMeta) {
      // Persist OCR text from extraction.
      if (
        typeof initialMeta.raw_text === "string" &&
        initialMeta.raw_text.trim().length > 0
      ) {
        const preview =
          initialMeta.raw_text.slice(0, 200);

        console.log(
          "[DOCUMENTS][POST] Upserting OCR output:",
          {
            id: `${docId}:${versionId}`,
            text: preview,
          },
        );

        logToFile(
          `[POST] Upserting OCR output: id=${docId}:${versionId}, text=${preview}`,
        );

        await ocrCol.updateOne(
          {
            id: `${docId}:${versionId}`,
          },
          {
            $set: {
              id: `${docId}:${versionId}`,
              documentId: docId,
              versionId,
              storageKey,
              text: initialMeta.raw_text,
              engine: "ai-extract",
              confidence: 0.9,
              userId: actorId,
              createdAt: now,
              updatedAt: now,
            },
          },
          {
            upsert: true,
          },
        );

        ocrSaved = true;
      } else {
        console.warn(
          "[DOCUMENTS][POST] No valid raw_text found in initialMeta:",
          initialMeta,
        );

        logToFile(
          `[POST] No valid raw_text found in initialMeta: ${JSON.stringify(
            initialMeta,
          )}`,
        );
      }

      // Save vitals if present.
      if (
        Array.isArray(initialMeta.vitals) &&
        initialMeta.vitals.length > 0
      ) {
        for (const vital of initialMeta.vitals) {
          if (
            !vital.label ||
            vital.value === undefined ||
            vital.value === null ||
            vital.value === ""
          ) {
            continue;
          }

          await vitalsCol.updateOne(
            {
              userId: actorId,
              documentId: docId,
              vitalType: vital.label,
            },
            {
              $set: {
                userId: actorId,
                documentId: docId,
                vitalType: vital.label,
                label: vital.label,
                value: vital.value,
                unit: vital.unit || null,
                documentDate: now,
                source: docType,
                createdAt: now,
                updatedAt: now,
              },
            },
            {
              upsert: true,
            },
          );
        }

        vitalsSaved = true;
      }
    }

    // Only enqueue ingestion job if OCR or vitals are missing.
    if (!ocrSaved || !vitalsSaved) {
      const jobsCol =
        await getCollection<JobDocument>("jobs");

      const job: JobDocument = {
        id: randomUUID(),
        type: "ingest",
        status: "pending",
        priority: 5,
        attempts: 0,
        payload:
          storageKeys && storageKeys.length > 0
            ? {
                documentId: docId,
                versionId,
                storageKeys,
                profileId,
                ownerUserId: actorId,
              }
            : {
                documentId: docId,
                versionId,
                storageKey,
                profileId,
                ownerUserId: actorId,
              },
        createdAt: now,
      } as any;

      await jobsCol.insertOne(job as any);
    }

    await logAudit(request, {
      actorId,
      action: "document.upload",
      target: profileId,
      targetType: "profile",
      resourceId: docId,
      result: "success",
      metadata: {
        storageKey,
      },
    });

    // Fire-and-forget regeneration.
    try {
      void regenerateHealthSummary(actorId).catch(() => {});
    } catch {}

    return NextResponse.json(
      {
        id: docId,
        versionId,
        storageKey,
        status: "active",
        processingStatus: "pending",
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      "[DOCUMENTS] POST error:",
      err,
    );

    console.error(
      "[DOCUMENTS] Error stack:",
      err?.stack,
    );

    const message =
      typeof err?.message === "string"
        ? err.message
        : "Upload failed";

    return NextResponse.json(
      {
        error: message,
        details:
          process.env.NODE_ENV === "development"
            ? err?.stack
            : undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("id");

  if (!docId) {
    return NextResponse.json(
      { error: "Missing id" },
      { status: 400 },
    );
  }

  const { role, actorId } = await getIdentity();

  const permissionAllowed = await canDeleteDocument({
    role,
    docId,
    actorId,
  });

  // Preserve centralized permissions first, then allow the actual
  // owner of their own document to delete it.
  const deleteAllowed = permissionAllowed
    ? true
    : await isOwnDocument({
        docId,
        actorId,
      });

  if (!deleteAllowed) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403 },
    );
  }

  const documentsCol =
    await getCollection<DocumentDocument>("documents");

  // Soft delete document.
  await documentsCol.updateOne(
    { id: docId },
    {
      $set: {
        status: "deleted",
        deletedAt: new Date(),
      },
    },
  );

  // Hard delete related userVitals and ocrOutputs.
  const userVitalsCol =
    await getCollection("userVitals");

  const ocrOutputsCol =
    await getCollection("ocrOutputs");

  await userVitalsCol.deleteMany({
    documentId: docId,
  });

  await ocrOutputsCol.deleteMany({
    documentId: docId,
  });

  try {
    const doc = await documentsCol.findOne({
      id: docId,
    } as any);

    const owner =
      doc?.ownerUserId || undefined;

    if (owner) {
      void (
        await import("@/lib/server/vitalsProcessor")
      ).regenerateHealthSummary(owner).catch(() => {});
    }
  } catch {}

  await logAudit(request, {
    actorId,
    action: "document.upload",
    target: docId,
    targetType: "document",
    resourceId: docId,
    result: "success",
  });

  return NextResponse.json(
    { ok: true },
    { status: 200 },
  );
}