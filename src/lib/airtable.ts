import Airtable from "airtable";
import { z } from "zod";

const airtableEnvSchema = z.object({
  AIRTABLE_API_KEY: z.string().min(1),
  AIRTABLE_BASE_ID: z.string().min(1),
  AIRTABLE_TABLE_NAME: z.string().min(1),
});

const defaultAccountsTableName = "доход расход категории";
export const accountsNameField = "name";

export type AirtableConfigStatus = {
  configured: boolean;
  baseId: boolean;
  tableName: boolean;
  accountsTableName: boolean;
  apiKey: boolean;
};

export function getAirtableConfigStatus(): AirtableConfigStatus {
  return {
    configured: Boolean(
      process.env.AIRTABLE_API_KEY &&
        process.env.AIRTABLE_BASE_ID &&
        process.env.AIRTABLE_TABLE_NAME,
    ),
    apiKey: Boolean(process.env.AIRTABLE_API_KEY),
    baseId: Boolean(process.env.AIRTABLE_BASE_ID),
    tableName: Boolean(process.env.AIRTABLE_TABLE_NAME),
    accountsTableName: Boolean(process.env.AIRTABLE_ACCOUNTS_TABLE_NAME ?? defaultAccountsTableName),
  };
}

function getAirtableBase() {
  const env = airtableEnvSchema.parse({
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME,
  });
  const baseId = env.AIRTABLE_BASE_ID.split("/")[0];

  return {
    base: new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(baseId),
    tableName: env.AIRTABLE_TABLE_NAME,
  };
}

export function getAirtableTable() {
  const { base, tableName } = getAirtableBase();

  return base.table(tableName);
}

export function getAccountsTable() {
  const { base } = getAirtableBase();

  return base.table(process.env.AIRTABLE_ACCOUNTS_TABLE_NAME ?? defaultAccountsTableName);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}
