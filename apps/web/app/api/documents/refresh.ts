import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/db';
import type { DocumentDocument } from '@/../../packages/db/documents';
import type { OcrOutputDocument } from '@/../../packages/db/ocrOutputs';
import { callSummarize } from '@/service/aiClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const { profileId } = await request.json();
  const documentsCol = await getCollection<DocumentDocument>('documents');
  const ocrCol = await getCollection<OcrOutputDocument>('ocrOutputs');
  const docs = await documentsCol.find({ profileId, status: 'active' }).toArray();
  const results = [];
  for (const doc of docs) {
    const ocr = await ocrCol.findOne({ id: `${doc.id}:${doc.versionId}` });
    // Only run OCR if ocrOutputs.text is empty
    if (!ocr || !ocr.text || ocr.text.trim() === '') {
      // ...trigger OCR pipeline here if needed...
      results.push({ docId: doc.id, action: 'ocr_needed' });
      continue;
    }
    const summary = await callSummarize({ structuredData: { raw_text: ocr.text } });
    results.push({ docId: doc.id, summary });
  }
  return NextResponse.json({ results });
}
