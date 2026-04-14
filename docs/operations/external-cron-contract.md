# External Cron Contract (GitHub Actions -> Vercel APIs)

This app keeps APIs on Vercel, but cron scheduling is managed outside Vercel.

## Authentication

- Header required on every cron request:
  - `Authorization: Bearer <CRON_SECRET>`
- `CRON_SECRET` must match between:
  - Vercel project environment variable
  - Scheduler repository secret

## Endpoints

1. `POST /api/cron/market-data`
- Purpose: Refresh market snapshot and persist to Supabase `cron_cache` (`job_key='market-data'`).
- Success response:
```json
{
  "status": "ok",
  "persisted": true,
  "fetchedAt": "2026-04-14T08:30:00.000Z",
  "vnIndex": 1250.2,
  "goldVnd": 91500000,
  "usdVnd": 25500
}
```

2. `POST /api/cron/morning-brief`
- Purpose: Build morning brief and persist to Supabase `cron_cache` (`job_key='morning-brief'`).
- Success response:
```json
{
  "status": "ok",
  "persisted": true,
  "brief": {
    "date": "Hôm nay, 14/04/2026",
    "title": "Morning Brief AI",
    "summary": "...",
    "raw": "...",
    "source": "gemini",
    "takeaways": []
  }
}
```

3. `POST /api/cron/macro-update`
- Purpose: Update monthly macro snapshot stub and persist to Supabase `cron_cache` (`job_key='macro-update'`).
- Success response:
```json
{
  "status": "ok",
  "note": "Macro-update cron stub — implement in next iteration",
  "updatedAt": "2026-04-14T08:30:00.000Z",
  "persisted": true
}
```

## Error Behavior

- `401`: Missing/invalid bearer token.
- `500`: Missing server config (for example missing `CRON_SECRET`) or runtime failure.

Scheduler should retry with exponential backoff:
- max attempts: 3
- backoff: 30s, 2m, 5m

## Suggested Schedule (Asia/Ho_Chi_Minh)

- `market-data`: every 15 minutes during market hours (or every 30 minutes all day).
- `morning-brief`: once daily at 06:30.
- `macro-update`: monthly on day 1 at 00:05.

## Required Environment Variables (Vercel)

- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional for AI generation:
  - `GEMINI_API_KEY`
