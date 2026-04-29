import { NextRequest, NextResponse } from "next/server";
import type { FieldSet, Record as AirtableRecord } from "airtable";
import { z } from "zod";
import {
  accountsNameField,
  getAccountsTable,
  getAirtableConfigStatus,
  getErrorMessage,
} from "@/lib/airtable";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const accountSchema = z.object({
  name: z.string().trim().min(1),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const { id } = paramsSchema.parse(await context.params);
    const payload = accountSchema.parse(await request.json());
    const table = getAccountsTable();
    const record = await table.update(id, {
      [accountsNameField]: payload.name,
    } as Partial<FieldSet>);

    return NextResponse.json({ account: serializeAccount(record) });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update Airtable account.") },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const configurationError = getConfigurationError();
  if (configurationError) return configurationError;

  try {
    const { id } = paramsSchema.parse(await context.params);
    const table = getAccountsTable();
    const record = await table.destroy(id);

    return NextResponse.json({ deleted: true, id: record.id });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete Airtable account.") },
      { status: 400 },
    );
  }
}
