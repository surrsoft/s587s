import { NextRequest, NextResponse } from "next/server";
import type { FieldSet } from "airtable";
import { z } from "zod";
import { getAirtableConfigStatus, getAirtableTable } from "@/lib/airtable";

const createRecordSchema = z.object({
  fields: z.record(z.string().min(1), z.unknown()),
});

function getConfigurationError() {
  const status = getAirtableConfigStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        error:
          "Airtable is not configured. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and AIRTABLE_TABLE_NAME.",
        status,
      },
      { status: 503 },
    );
  }

  return null;
}

export async function GET() {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const table = getAirtableTable();
    const records = await table.select({ maxRecords: 25 }).firstPage();

    return NextResponse.json({
      records: records.map((record) => ({
        id: record.id,
        fields: record.fields,
        createdTime: record._rawJson.createdTime,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read Airtable records." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const payload = createRecordSchema.parse(await request.json());
    const table = getAirtableTable();
    const record = await table.create(payload.fields as Partial<FieldSet>);

    return NextResponse.json(
      {
        record: {
          id: record.id,
          fields: record.fields,
          createdTime: record._rawJson.createdTime,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Airtable record.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
