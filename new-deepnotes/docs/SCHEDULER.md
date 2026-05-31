# Scheduler / Background Cleanup

## Overview

DeepNotes uses a Cloudflare Cron Trigger to periodically purge soft-deleted pages and groups that have passed their grace period.

## Implementation

### Worker Entry (`apps/api-worker/src/index.ts`)

The API worker exports a `scheduled` handler alongside the default `fetch` handler:

```ts
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    // Runs cleanup logic
  },
};
```

### Cleanup Logic (`packages/session/src/scheduled-cleanup.ts`)

`performScheduledCleanup` queries the database for:

- **Pages** where `permanent_deletion_date` is not null and is in the past
- **Groups** where `permanent_deletion_date` is not null and is in the past

Because the schema uses `ON DELETE CASCADE`, deleting a group automatically removes its pages, page updates, snapshots, links, members, invitations, and join requests.

### Cron Schedule (`apps/api-worker/wrangler.toml`)

```toml
[[triggers.crons]]
cron = "0 3 * * *"
```

Runs daily at **03:00 UTC**.

## Local Testing

You can trigger the scheduled handler locally with Wrangler:

```bash
pnpm -C apps/api-worker dev
```

Then in another terminal:

```bash
wrangler trigger --name deepnotes-api scheduled
```

Or use a direct curl to the local dispatch endpoint if configured.

## Grace Periods

- **Soft delete** sets `permanent_deletion_date` to ~30 days in the future.
- **Purge** sets `permanent_deletion_date` to a past date for immediate cleanup.
- The scheduler removes anything whose `permanent_deletion_date` has elapsed.
