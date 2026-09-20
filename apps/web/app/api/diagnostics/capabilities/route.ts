import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", capabilities: ["pneumonia", "melanoma", "brain_tumor"] });
}
