# Architecture decisions

## ADR-001: Single Next.js codebase for MVP
**Decision:** Use Next.js App Router with TypeScript for the public site and server endpoints.

**Reason:** A lean deployment footprint and shared types/components while the product scope is small.

## ADR-002: Supabase Postgres for enquiry persistence
**Decision:** Use managed Postgres with RLS and server-only privileged writes.

**Reason:** Reduces initial operations overhead while retaining a relational data model and a path to authentication/admin workflows.

**Security boundary:** Public clients have no direct access to the enquiries table. Privileged server writes require the service-role secret and server-side validation.

## ADR-003: Enquiry-first telecom flow
**Decision:** Collect interest only until supplier/partner arrangements, availability and commercial terms are confirmed.

**Reason:** Avoid collecting money or implying fulfilment for services that Divine Links cannot yet verify.

## ADR-004: Payments deferred
**Decision:** No Paystack/card/bank-transfer checkout in the initial scaffold.

**Reason:** Payments should follow confirmed product availability, refund/reversal policy, fulfilment operations and secure server-side payment verification.
