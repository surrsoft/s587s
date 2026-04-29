# s587s

Thin web client for reading and writing Airtable data.

## Stack

- Next.js App Router
- Mantine UI
- Airtable SDK
- Zod

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Airtable Environment

Set these values in `.env.local`:

```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=
AIRTABLE_ACCOUNTS_TABLE_NAME=доход расход категории
```

`AIRTABLE_BASE_ID` is the `app...` id of the base. If you paste a longer Airtable path,
only the first `/` segment is used.

The browser never receives the Airtable API key. Client code calls the local Next.js API routes:

- `GET /api/health`
- `GET /api/airtable/records`
- `POST /api/airtable/records`
- `GET /api/airtable/accounts`
- `POST /api/airtable/accounts`
- `PATCH /api/airtable/accounts/:id`
- `DELETE /api/airtable/accounts/:id`
