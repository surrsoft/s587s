import Airtable from "airtable";
import { z } from "zod";

const airtableEnvSchema = z.object({
  AIRTABLE_API_KEY: z.string().min(1),
  AIRTABLE_BASE_ID: z.string().min(1),
  AIRTABLE_TABLE_NAME: z.string().min(1),
});

export type AirtableConfigStatus = {
  configured: boolean;
  baseId: boolean;
  tableName: boolean;
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
  };
}

export function getAirtableTable() {
  const env = airtableEnvSchema.parse({
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME,
  });

  return new Airtable({ apiKey: env.AIRTABLE_API_KEY })
    .base(env.AIRTABLE_BASE_ID)
    .table(env.AIRTABLE_TABLE_NAME);
}
