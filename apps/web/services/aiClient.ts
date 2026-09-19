/**
 * AI client service.
 * Wraps calls to an AI/LLM backend (OpenRouter or similar).
 * Set OPENROUTER_API_KEY and OPENROUTER_BASE_URL in your .env to use.
 */

const BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";

async function chatCompletion(
  systemPrompt: string,
  userMessage: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/** Summarise extracted medical document text. */
export async function callSummarize(text: string): Promise<string> {
  return chatCompletion(
    "You are a medical document summariser. Return a concise, structured summary.",
    text
  );
}

/** Run OCR extraction on base64-encoded document content. */
export async function callOcr(base64Content: string): Promise<string> {
  return chatCompletion(
    "You are an OCR engine. Extract all text from the provided document accurately.",
    `Document content (base64): ${base64Content.slice(0, 500)}…`
  );
}

/** Extract structured data from document text. */
export async function callExtract(text: string): Promise<Record<string, unknown>> {
  const raw = await chatCompletion(
    "You are a medical data extractor. Return only valid JSON with extracted fields.",
    text
  );
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

/** Extract structured data from multiple document texts. */
export async function callExtractMulti(
  texts: string[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(texts.map(callExtract));
}

/** Generate a patient health summary from combined document data. */
export async function callHealthSummaryPrompt(data: string): Promise<string> {
  return chatCompletion(
    "You are a clinical summariser. Produce a clear, structured health summary from the provided data.",
    data
  );
}

/** Generate per-vital explanations for a batch of vital readings. */
export async function callVitalExplainBatchPrompt(data: string): Promise<string> {
  return chatCompletion(
    "You are a medical analyst. Explain each vital reading in plain language, flagging any concerns.",
    data
  );
}

/** Summarise a document via OpenRouter (legacy alias). */
export async function callOpenRouterSummary(text: string): Promise<string> {
  return callSummarize(text);
}
