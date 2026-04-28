import { NextResponse } from "next/server";
import { getAirtableConfigStatus } from "@/lib/airtable";

export function GET() {
  return NextResponse.json({
    ok: true,
    airtable: getAirtableConfigStatus(),
  });
}
