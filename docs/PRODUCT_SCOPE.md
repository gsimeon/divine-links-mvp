# Divine Links — MVP product scope

## Goal
Help individuals and businesses in Nigeria describe telecom and networking needs, and give Divine Links staff a controlled process to review and manually follow up.

## In scope for first build
- Public homepage and service information.
- Telecom/data interest, SIM-service, broadband and networking quotation enquiries.
- Enquiry reference on successful database persistence.
- Initial authenticated staff enquiry desk at `/admin`, gated by server-verified `app_metadata.role = admin`.
- Mobile-first responsive bright UI.

## Out of scope until verified
- Automated data bundle purchase or delivery.
- Published price/plan catalogue unless supplier pricing and availability are verified.
- Customer payments, wallet funding, recurring billing.
- Supplier API, SIM activation, broadband availability promise.
- Customer login, admin dashboard and notifications (next phase).

## Acceptance criteria
1. Every enquiry field is validated on the server, not only in the browser.
2. Missing database configuration returns an explicit error and never says the enquiry was saved.
3. The browser cannot directly read enquiry records through Supabase anon/authenticated roles.
4. The service-role key is never sent to the browser or committed.
5. The page states that enquiries do not confirm price, coverage, order or appointment.
6. No unverified supplier, testimonial, price, network coverage or service guarantee appears in the UI.
7. Form works with keyboard navigation and visible focus states.
8. Errors do not expose SQL, credentials or provider internals.

## Immediate next phase
- Confirm business email/phone and privacy notice.
- Set up the intended Supabase project and apply the migration.
- Expand the admin queue with assignment, richer audit diffs and operational reporting; verify role assignment is performed only by a trusted admin.
- Add automated tests and validate production build.
- Conduct manual accessibility/security review before inviting real customers.
