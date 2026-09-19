import { NextResponse } from "next/server";

export async function GET() {
  console.log("--- Debug Environment Variables ---");

  const apiKey = process.env.RESEND_API_KEY;
  const maskedApiKey = apiKey ? `...${apiKey.slice(-4)}` : "Not set or empty";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Not set or empty";

  console.log(`RESEND_API_KEY (masked): ${maskedApiKey}`);
  console.log(`RESEND_FROM_EMAIL: ${fromEmail}`);

  const response = {
    message: "These are the environment variables as seen by the server.",
    resend_api_key_masked: maskedApiKey,
    resend_from_email: fromEmail,
    timestamp: new Date().toISOString(),
  };

  console.log("--- End Debug ---");

  return NextResponse.json(response);
}
