import { NextRequest, NextResponse } from "next/server";
import type { FieldSet, Record as AirtableRecord } from "airtable";
import { z } from "zod";
import {
  accountsNameField,
  getAccountsTable,
  getAirtableConfigStatus,
  getErrorMessage,
} from "@/lib/airtable";

const accountSchema = z.object({
  name: z.string().trim().min(1),
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

function serializeAccount(record: AirtableRecord<FieldSet>) {
  return {
    id: record.id,
    name: String(record.get(accountsNameField) ?? ""),
    createdTime: record._rawJson.createdTime,
  };
}

export async function GET() {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const table = getAccountsTable();
    const records = await table
      .select({
        fields: [accountsNameField],
        maxRecords: 100,
        sort: [{ field: accountsNameField, direction: "asc" }],
      })
      .firstPage();

    return NextResponse.json({
      accounts: records.map(serializeAccount),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to read Airtable accounts.") },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const payload = accountSchema.parse(await request.json());
    const table = getAccountsTable();
    const record = await table.create({
      [accountsNameField]: payload.name,
    } as Partial<FieldSet>);

    return NextResponse.json({ account: serializeAccount(record) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to create Airtable account.") },
      { status: 400 },
    );
  }
}
