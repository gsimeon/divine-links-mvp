# Divine Links MVP — initial scaffold

A bright, responsive, enquiry-first web starter for Divine Links, aligned to the current Figma draft. This is **project code**, not a deployed or production-verified service.

## Product decision

Because telecom supplier/reseller partnerships are not yet secured, the MVP collects enquiries for manual review. It does **not** advertise verified plans or prices, process customer payments, place telecom orders, or claim supplier coverage/approval.

## Recommended lean stack

- **Next.js App Router + TypeScript** — public website and server-side routes in one codebase.
- **Tailwind CSS** — quick iteration against the white / ice-blue / connection-blue / signal-teal design direction.
- **Supabase Postgres** — managed relational persistence for enquiries.
- **Zod** — server-side request validation.
- **Supabase service-role key** — used only in the server route, never exposed to browser code.

## Included

- Bright responsive homepage with telecom, networking and broadband enquiry paths.
- Accessible enquiry form with server-side schema validation, a honeypot, basic process-local rate limiting, and clear failure states.
- API endpoint that refuses to pretend it saved anything when environment configuration is missing.
- SQL migrations for enquiries, lifecycle statuses, indexes, restrictive RLS grants and an audit-event table.
- Initial admin enquiry desk at `/admin` with Supabase password sign-in, server-side `app_metadata.role = admin` authorization, status changes and internal notes.
- `.env.example`, basic scripts and setup notes.

## Not included yet

- Authenticated customer accounts or admin dashboard.
- Email/SMS notifications.
- Payment processing, live product pricing, supplier API, telecom fulfilment, partner coverage checks.
- Confirmed legal/privacy policy, company contact details, brand assets or service-level promises.
- Deployment, live database connection, automated tests or production security review.

## Local setup

Requirements: Node.js 20+ and npm.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`.
3. Create a Supabase project only when ready, then fill in `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The public anon key is reserved for future browser-safe client features and is not currently required by this form route.
4. Review and run migrations in order: `202610240001_create_enquiries.sql`, then `202610240002_create_enquiry_audit.sql`.
5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

**Before credentials are configured:** the enquiry page deliberately returns a clear setup error and does not claim the enquiry was saved.

## Environment variables

| Variable | Purpose | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reserved for future client-safe auth usage | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side database write for enquiries | Secret; server only |
| `ENABLE_NOTIFICATIONS` | Future notification feature flag | Server only |

Never commit `.env.local`, share service-role keys, or put secrets in `NEXT_PUBLIC_*` variables.

## Enquiry lifecycle

`submitted → under_review → awaiting_customer / awaiting_partner → in_progress → completed`

Terminal statuses: `cancelled`, `unable_to_fulfil`. Payment status is intentionally not part of this MVP.

## Security notes / next engineering tasks

1. Replace the in-memory rate limiter with a shared store or hosting/provider-level rate limiting before multi-instance production deployment. The current limiter is only a basic local safeguard.
2. Add CAPTCHA/anti-abuse protection after choosing a provider.
3. Add admin authentication and server-side role checks before any internal request list or status update is built.
4. Add audit events for internal status changes and notes.
5. Add retention/deletion procedures and a published privacy notice before collecting real customer data.
6. Add unit/integration tests, accessibility checks, dependency review, and production build validation.
7. Verify the exact runtime versions and dependency compatibility with `npm install`, `npm run typecheck`, `npm run lint`, and `npm run build`.
8. Use a real provider's test environment and documented verification process before enabling any payment or supplier integration.

## Figma reference

Divine Links — Brand & Website MVP:
https://www.figma.com/design/2ngv168XcLUCwiKYUmgeGX

The code implements the direction and key landing-page sections as an initial translation; it is not a pixel-perfect or automatically connected Figma implementation.

## Initial admin workflow

- Open `/admin` after configuring Supabase Auth and environment variables.
- Create admin users only through a trusted administrative process. Assign `app_metadata.role = admin` server-side; never trust user-editable `user_metadata` for authorization.
- Admin API calls validate the access token and check the server-managed role claim before reading or updating enquiries.
- No public admin registration route is provided.
- Status updates and notes attempt to write to `enquiry_audit_events`; monitor server logs for audit write failures.
- Before production: add automated tests, stronger shared rate limiting, audit old/new values, and a tested admin bootstrap procedure. Never expose service-role credentials.
