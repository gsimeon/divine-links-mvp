# Divine Links — Controlled Pilot Operating Guide (SOP)

This document establishes the Standard Operating Procedures (SOP) for the **Divine Links Controlled Pilot**. It guides staff and operators in managing real customer enquiries through the manual review and verification lifecycle.

---

## 1. Pilot Purpose & Scope

The Divine Links MVP operates on an **enquiry-first model**. During this controlled pilot:
- **No automated billing, cart checkout, or instant card charges** are enabled.
- **No unverified carrier coverage or speed guarantees** are advertised.
- Every quotation and feasibility assessment is reviewed and validated manually by Divine Links operations desk staff.

### Pilot Cohorts (Target: 15–30 Enquiries)
1. **Commercial / Multi-Branch SMEs**: Businesses requiring primary or backup internet redundancy in major commercial corridors (e.g. Ikeja, Victoria Island, Abuja Central, Port Harcourt).
2. **High-Demand Remote Professionals**: Individuals seeking high-throughput wireless or fibre connectivity.
3. **WISP / Enterprise Redundancy**: Locations prone to fibre cuts requiring secondary cellular or fixed-wireless failover.

---

## 2. Operator Desk Workflow & SLAs

All incoming enquiries appear on the authenticated staff desk at `/admin`.

```
[Customer Submits Enquiry]
           │
           ▼
[Step 1: Triage (SLA: 4 hours)]
  - Verify location & contact info
  - Status -> 'under_review'
  - Optional customerMessage: "Feasibility check initiated for your location."
           │
           ▼
[Step 2: Supplier Feasibility Check (SLA: 24 hours)]
  - Consult supplier coverage maps & line-of-sight database
  - Request wholesale rate quote from verified partner
           │
           ▼
[Step 3: Quotation Preparation (SLA: 48 hours)]
  - Status -> 'quote_ready'
  - Prepare written quote document with equipment & installation breakdown
  - Dispatch quotation via verified email and phone follow-up
           │
           ▼
[Step 4: Customer Decision & Handover]
  - Customer accepts: Status -> 'closed' (Hand off to installation scheduling)
  - Customer declines / Out of reach: Status -> 'cancelled'
```

---

## 3. Communication Guidelines & Customer Privacy

1. **Staff Notes vs. Customer Messages**:
   - **Internal Notes (`internal_notes`)**: Strictly staff-only. Use for supplier wholesale pricing, technical coordinates, engineer comments, and partner names. *These are never exposed to the customer or tracking API.*
   - **Customer Messages (`customerMessage`)**: Explicit, staff-approved updates sent to the customer via email and visible on `/track`.
2. **Prohibited Commitments During Pilot**:
   - Do NOT quote prices verbally without checking the latest partner wholesale rate card.
   - Do NOT guarantee delivery timelines until the supplier confirms equipment stock and field technician availability.
   - Do NOT claim carrier coverage until physical or digital line-of-sight has been verified.

---

## 4. Status Transition Matrix

| Status Key | Client Tracker Label | Description for Customer | Staff Action Required |
|---|---|---|---|
| `submitted` | Submitted | Enquiry received and assigned a reference. | Initial review within 4 business hours. |
| `under_review` | Technical Review | Technical specifications & location evaluated. | Verify coordinates, contact customer if info is incomplete. |
| `in_progress` | Carrier Feasibility | Checking line-of-sight and fibre availability with upstream providers. | Engage vetted supplier from the Supplier Register. |
| `quote_ready` | Quote Prepared | Custom quotation and technical options ready. | Send quote document, call customer to explain options. |
| `closed` | Completed | Customer accepted quotation; handed off to installation. | Record supplier order reference in internal notes. |
| `cancelled` | Closed / Unserviced | No feasible supplier coverage or customer declined. | Explain reason gently; invite future re-check. |

---

## 5. Pilot Review & Feedback Collection

At the end of each pilot engagement:
1. Record time elapsed between enquiry submission and quotation delivery (target: < 48 hours).
2. Note supplier responsiveness and accuracy of initial coverage maps vs. physical site reality.
3. Collect qualitative customer feedback on tracking clarity and response timeliness.
