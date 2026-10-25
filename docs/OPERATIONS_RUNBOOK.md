# Divine Links — Production Operations & Recovery Runbook

This document details operational procedures, monitoring configurations, error triage workflows, and disaster recovery instructions for the Divine Links MVP platform.

---

## 1. System Architecture & Critical Invariants

1. **Transactional Enquiry Submission**:
   - Every valid customer submission invokes `submit_enquiry_atomic` in PostgreSQL.
   - The enquiry record and 2 notification jobs (`customer_confirmation` and `admin_alert`) commit together or roll back together.
   - Operations **fail closed** on database errors, returning HTTP 502 with a unique `correlationId`.

2. **Durable Notification Outbox**:
   - `notifications_outbox` is the single source of truth for all notifications.
   - Jobs are claimed using atomic attempt increments to prevent duplicate sends across concurrent workers.
   - Failed attempts apply exponential backoff (30s base delay) and transition to `dead_letter` after 3 failed attempts.

3. **Multi-Tier Rate Limiting & Anti-Spoofing**:
   - Separate quotas protect enquiries (5 / 10m), tracking (15 / 5m), and admin endpoints (30 / 1m).
   - `TRUSTED_PROXY_PROVIDER` controls reverse-proxy header trust (`cloudflare`, `vercel`, `custom`).
   - Requests without verifiable IPs are isolated under an `unidentified` quota bucket or rejected under strict mode.

---

## 2. Health Monitoring & Uptime Probes

- **Endpoint**: `GET /api/health`
- **Recommended Polling Interval**: Every 60 seconds
- **HTTP Status Codes**:
  - `200 OK`: Database connected, system healthy.
  - `503 Service Unavailable`: Database disconnected or configuration error.

### Health Response Schema
```json
{
  "status": "ok",
  "timestamp": "2026-10-25T15:20:00.000Z",
  "uptimeSeconds": 1420,
  "services": {
    "database": {
      "status": "connected",
      "latencyMs": 28
    },
    "notifications": {
      "liveEnabled": false,
      "provider": "simulated"
    },
    "rateLimiter": {
      "store": "upstash_redis",
      "proxyProvider": "vercel",
      "strictIp": false
    }
  },
  "responseTimeMs": 31
}
```

---

## 3. Incident Triage & Correlation ID Investigation

When an atomic database transaction or API operation fails, a unique RFC 4122 `correlationId` is returned to the client and logged to server output:

```json
{
  "error": "We couldn’t save your enquiry just now. Please try again later.",
  "correlationId": "49375a35-4d0b-4812-98e7-6f5cc092f361"
}
```

### Triage Steps
1. **Search Server Logs**:
   In Vercel Log Drains, CloudWatch, or terminal logs, filter by the `correlationId`:
   ```bash
   grep "49375a35-4d0b-4812-98e7-6f5cc092f361" server.log
   ```
2. **Inspect Error Details**:
   The log entry contains the exact PostgreSQL error code, message, and parameters:
   ```json
   {
     "correlationId": "49375a35-4d0b-4812-98e7-6f5cc092f361",
     "code": "23505",
     "message": "duplicate key value violates unique constraint",
     "reference": "DL-ABCD1234"
   }
   ```
3. **Verify Database Consistency**:
   Confirm that the transaction rolled back completely and no partial enquiry or orphaned outbox record was persisted.

---

## 4. Notifications Outbox Worker & Recovery

### Automated Cron Trigger
Configured in `vercel.json` to trigger every 10 minutes:
```json
{
  "crons": [{ "path": "/api/admin/outbox/process", "schedule": "*/10 * * * *" }]
}
```

### Manual Queue Drain via cURL
To force an immediate queue drain (e.g. after resolving an email provider outage):
```bash
curl -X POST https://your-domain.com/api/admin/outbox/process \
  -H "x-cron-secret: $CRON_SECRET"
```

### Dead-Letter Queue Handling
If notifications fail 3 times (e.g. invalid recipient email, DNS failure), they transition to `dead_letter` status with a descriptive `error_message`.

To inspect and re-queue dead-letter messages in Supabase SQL Studio:
```sql
-- 1. Inspect dead letter jobs
SELECT id, enquiry_id, recipient, subject, error_message, attempts, last_attempt_at
FROM public.notifications_outbox
WHERE status = 'dead_letter'
ORDER BY created_at DESC;

-- 2. Reset a job for retry after fixing provider or recipient issue
UPDATE public.notifications_outbox
SET status = 'pending', attempts = 0, last_attempt_at = NULL, error_message = NULL
WHERE id = '<JOB_UUID>';
```

---

## 5. Database Backups & Point-in-Time Recovery

1. **Automated Supabase Backups**:
   - Managed automatically in Supabase Dashboard -> Project Settings -> Database -> Backups.
   - PITR (Point-in-Time Recovery) allows restoring down to the exact second if corruption occurs.

2. **Manual Schema & Data Dump**:
   To export a complete local snapshot before applying major migrations:
   ```bash
   pg_dump "$DATABASE_URL" \
     --schema=public \
     --clean \
     --if-exists \
     --file="backup_$(date +%Y%m%d_%H%M%S).sql"
   ```

---

## 6. Controlled Pilot Protocol

When conducting the initial controlled customer pilot:
1. **Enquiry-First Rule**:
   - Do NOT promise automated delivery, live wholesale pricing, or immediate carrier activation.
   - All enquiries are reviewed manually on the `/admin` desk.
2. **Customer Privacy Guarantee**:
   - Never place internal supplier notes or sensitive pricing into customer notifications.
   - Use the dedicated `customerMessage` field in `/admin` to send explicit, staff-approved customer notes.
3. **Verification Before Supplier Commitment**:
   - Confirm local carrier line-of-sight and wholesale quotation before committing customer pricing.
