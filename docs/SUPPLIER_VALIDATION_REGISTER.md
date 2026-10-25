# Divine Links — Supplier & Partner Validation Register

This register governs the qualification, onboarding, and ongoing performance management of telecom carriers, wholesale fibre providers, WISPs, and satellite equipment distributors partnering with Divine Links.

---

## 1. Supplier Onboarding & Evaluation Criteria

Before quoting any supplier service to Divine Links customers, the supplier must pass four validation gates:

| Gate | Category | Evaluation Criteria | Pass Requirement |
|---|---|---|---|
| **Gate 1** | **Legal & Regulatory** | Valid NCC (Nigerian Communications Commission) license, corporate registration (CAC), and tax compliance. | Confirmed license number on public NCC register. |
| **Gate 2** | **Technical Feasibility** | Established coverage verification method (API, KMZ map, or dedicated desk engineer contact with < 4h turnaround). | Documented contact and verified sample coordinates. |
| **Gate 3** | **Commercial Terms** | Published wholesale price list, discount schedule for resellers, equipment warranty, and clear payment terms. | Signed reseller terms with agreed margin floor. |
| **Gate 4** | **SLA & Escalation** | Committed Mean Time To Repair (MTTR < 4h for corporate fibre, < 8h for wireless), escalation matrix up to director level. | Written SLA contract with tier-1, tier-2, tier-3 escalation paths. |

---

## 2. Supplier Partner Roster (Pilot Phase)

*Note: The following roster tracks pilot evaluation status. Unverified partners must not be advertised to retail customers.*

### Category A: Fixed Wireless & Metro Fibre Wholesale

#### 1. Carrier Partner A (Fibre / Metro Ethernet)
- **Service Categories**: Dedicated Internet Access (DIA), Metro Ethernet, Point-to-Point.
- **Coverage Areas**: Lagos (Victoria Island, Ikoyi, Lekki Phase 1, Ikeja GRA), Abuja CBD.
- **Feasibility Turnaround**: 4–8 business hours via dedicated partner desk.
- **Standard Wholesale SLA**: 99.5% uptime, 4-hour MTTR for physical cable cuts.
- **Escalation Contact**: NOC Desk -> Technical Account Manager -> Head of Wholesale.
- **Validation Status**: `Pending NDA & Reseller Terms`.

#### 2. WISP Partner B (Fixed Wireless Point-to-Multipoint)
- **Service Categories**: Fixed Wireless Broadband, Low-latency Microwave Link.
- **Coverage Areas**: Greater Lagos, Ibadan, Port Harcourt industrial zones.
- **Feasibility Turnaround**: 2–4 hours (digital line-of-sight analysis using base station coordinates).
- **Standard Wholesale SLA**: 99.0% uptime, 6-hour hardware swap warranty.
- **Escalation Contact**: Support Desk -> Field Operations Manager.
- **Validation Status**: `Coverage Verified for Pilot Zones`.

### Category C: Satellite & Remote Redundancy

#### 3. Satellite Equipment Reseller C
- **Service Categories**: High-Throughput Satellite (HTS) hardware, enterprise dish kits, power-over-ethernet accessories.
- **Coverage Areas**: Nationwide (unserved & underserved regions across Nigeria).
- **Fulfillment SLA**: Hardware dispatch within 48 hours of confirmed order.
- **Escalation Contact**: Logistics Lead -> Managing Director.
- **Validation Status**: `Stock Availability Confirmed`.

---

## 3. Supplier Evaluation Scorecard Template

Use this scorecard when evaluating a prospective wholesale supplier:

```markdown
### Supplier Name: [Enter Provider Name]
- **Date Evaluated**: YYYY-MM-DD
- **Evaluator**: [Operations Lead]
- **NCC License Number**: [Verify on ncc.gov.ng]
- **Primary Service Types**: [Broadband / DIA / Metro Fibre / Wireless / Satellite]

#### Scoring (1 to 5, 5 being best)
1. **Coverage Reliability in Target Zones**: [ ] / 5
2. **Quotation Speed (< 24h)**: [ ] / 5
3. **Price Competitiveness**: [ ] / 5
4. **SLA Support & NOC Responsiveness**: [ ] / 5
5. **Billing Accuracy & Credit Flexibility**: [ ] / 5

**Overall Recommendation**: [Approved for Pilot | Requires Verification | Rejected]
**Notes / Constraints**: [e.g. Requires 50% upfront deposit on custom installations]
```

---

## 4. Operational Invariant

> **Rule**: If a customer's location falls outside the verified coverage footprint of an approved supplier, Divine Links will mark the enquiry as `cancelled` or `under_review` and notify the customer transparently. Divine Links will **never** collect payments or issue commitments for unconfirmed coverage.
