type ExtractIdentity = {
  documentId?: string;
  versionId?: string;
  storageKey?: string;
  userId?: string;
  ownerId?: string;
};
type ExtractFile = { fileName: string; contentBase64: string };
type ExtractedDocument = {
  patient_name?: string | null;
  dob?: string | null;
  doctor_name?: string | null;
  diagnosis?: string | null;
  report_date?: string | null;
  medications?: unknown[];
  vitals?: unknown[];
  summary?: string | null;
  classification?: string;
  raw_text?: string;
};
type ExtractResponse = {
  task_id: string;
  status: string;
  data?: ExtractedDocument;
};
type SummarizeResponse = {
  summary: unknown;
  explanations?: unknown[];
  confidence?: number;
};

const AI_BASE = (process.env.AI_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const AI_TOKEN = process.env.INTERNAL_AUTH_TOKEN || process.env.AI_SERVICE_TOKEN || "dev-token";

export class AIRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AIRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${AI_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AI_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    let message = `AI ${path} failed`;
    let code: string | undefined;
    if (detail) {
      try {
        const payload = JSON.parse(detail) as { error?: unknown; code?: unknown };
        if (typeof payload.error === "string" && payload.error.trim()) {
          message = payload.error;
        }
        if (typeof payload.code === "string" && payload.code.trim()) {
          code = payload.code;
        }
      } catch {
        // Keep the provider response opaque when it is not our JSON error shape.
      }
    }
    throw new AIRequestError(message, response.status, code);
  }

  return response.json() as Promise<T>;
}

export function callExtract(params: ExtractFile & ExtractIdentity) {
  return request<ExtractResponse>("/extract", {
    file_name: params.fileName,
    content_base64: params.contentBase64,
    document_id: params.documentId,
    version_id: params.versionId,
    storage_key: params.storageKey,
    user_id: params.userId,
    owner_id: params.ownerId,
  });
}

export function callExtractMulti(params: { files: ExtractFile[] } & ExtractIdentity) {
  return request<ExtractResponse>("/extract/multi", {
    files: params.files.map((file) => ({
      file_name: file.fileName,
      content_base64: file.contentBase64,
    })),
    document_id: params.documentId,
    version_id: params.versionId,
    storage_key: params.storageKey,
    user_id: params.userId,
    owner_id: params.ownerId,
  });
}

export function callOcr(params: { storageKey: string }) {
  return request<{ text?: string; engine?: string; confidence?: number }>("/ocr", {
    storage_key: params.storageKey,
  });
}

export function callClassify(params: { text: string }) {
  return request("/classify", { text: params.text });
}

export function callSummarize(params: { structuredData: unknown }) {
  return request<SummarizeResponse>("/summarize", { structured_data: params.structuredData });
}

export function callTrends(params: { series: unknown }) {
  return request("/trends", { series: params.series });
}

export function callRecommend(params: { signals: unknown }) {
  return request("/recommend", { signals: params.signals });
}

export function callExplain(params: { modelOutput: unknown }) {
  return request("/explain", { model_output: params.modelOutput });
}

export function callHealthSummaryPrompt(params: {
  documentsData: Record<string, unknown>[];
  ocrTexts?: string[];
}) {
  return request<{ summary: string; sections: Array<{ heading: string; content: string }> }>(
    "/health-summary",
    {
      ocr_texts: params.ocrTexts || [],
      document_count: params.documentsData.length,
      documents_data: params.documentsData,
    },
  );
}

export function callVitalExplainBatchPrompt(
  vitals: Array<{ label: string; value: string | number; unit: string | null }>,
) {
  return request<Array<{
    label: string;
    value: string | number;
    unit?: string | null;
    explanation?: string | null;
    advice?: string | null;
    status: string;
  }>>("/vitals/batch", { vitals });
}

export function callGenerateTitle(params: { ocrText: string; docType: string; metadata?: unknown }) {
  return request<{ title: string; confidence: number }>("/generate-title", {
    ocr_text: params.ocrText,
    doc_type: params.docType,
    metadata: params.metadata || null,
  });
}

// Kept as a compatibility alias for existing server callers; it uses the
// structured FastAPI summarization endpoint rather than a provider endpoint.
export function callOpenRouterSummary(text: string) {
  return callSummarize({ structuredData: { raw_text: text } });
}
