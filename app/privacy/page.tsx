import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Divine Links",
  description: "Learn how Divine Links collects, uses, protects, and handles your personal data in accordance with UK GDPR and the Nigeria Data Protection Act (NDPA)."
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="bg-gradient-to-b from-divine-ice/80 via-white to-white py-12 sm:py-16">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-3.5 py-1.5 text-xs font-bold text-divine-blue">
              <span>LEGAL & COMPLIANCE</span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-divine-ink sm:text-5xl">
              Privacy Policy & Data Notice
            </h1>
            <p className="mt-3 text-sm text-divine-muted">
              Last updated: October 2026 · Compliant with UK GDPR, Data Protection Act 2018, and NDPA
            </p>
          </div>

          <div className="space-y-10 rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-10 text-divine-ink leading-relaxed">
            <section>
              <h2 className="text-2xl font-black text-divine-ink">1. Who We Are (Data Controller)</h2>
              <p className="mt-3 text-divine-muted">
                Divine Links (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is an independent telecommunications and networking consultancy and solutions provider. Under data protection legislation—including the UK General Data Protection Regulation (UK GDPR), the UK Data Protection Act 2018, and the Nigeria Data Protection Act (NDPA)—Divine Links operates as the Data Controller responsible for your personal information.
              </p>
              <div className="mt-4 rounded-2xl bg-divine-ice p-4 text-sm text-divine-ink border border-divine-border">
                <p className="font-bold">Privacy Contact & Data Inquiries:</p>
                <p className="mt-1 text-divine-muted">Email: <span className="font-medium text-divine-blue">privacy@divinelinks.co</span></p>
                <p className="text-divine-muted">Subject Access Requests SLA: Initial response within 30 days of receipt.</p>
              </div>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">2. What Information We Collect</h2>
              <p className="mt-3 text-divine-muted">
                Because Divine Links currently operates an enquiry-first platform rather than an automated checkout or subscription portal, we strictly limit data collection to what is necessary to review and reply to your connection requirements:
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-divine-muted list-disc pl-5">
                <li><strong className="text-divine-ink">Contact Identification:</strong> Full name, verified email address, and direct phone number.</li>
                <li><strong className="text-divine-ink">Geographical Location:</strong> City, area, or postal municipality (required solely to determine regional network coverage and technical feasibility).</li>
                <li><strong className="text-divine-ink">Enquiry Details:</strong> Specific telecom requirements, audience type (individual household or enterprise/business), and free-form descriptive details you provide.</li>
                <li><strong className="text-divine-ink">Technical Metadata:</strong> IP addresses and browser agent headers processed ephemerally in server memory solely for DDoS mitigation, rate limiting (anti-abuse), and form honeypot verification.</li>
              </ul>
              <div className="mt-4 rounded-xl bg-amber-50/80 p-3.5 text-xs text-amber-900 border border-amber-200">
                <strong>Important:</strong> Please do not submit financial card data, account passwords, bank details, or sensitive personal data in our enquiry forms.
              </div>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">3. Lawful Bases for Processing</h2>
              <p className="mt-3 text-divine-muted">
                Under UK GDPR Article 6, we only process your data when at least one legal basis applies:
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-divine-border p-4">
                  <h3 className="font-bold text-divine-blue">Consent (Article 6(1)(a))</h3>
                  <p className="mt-1 text-sm text-divine-muted">
                    When submitting an enquiry, you provide affirmative consent allowing our team to review your specifications and contact you regarding available options.
                  </p>
                </div>
                <div className="rounded-2xl border border-divine-border p-4">
                  <h3 className="font-bold text-divine-blue">Legitimate Interests (Article 6(1)(f))</h3>
                  <p className="mt-1 text-sm text-divine-muted">
                    Protecting our systems against malicious bot attacks, fraud prevention, and logging internal administrative audit events for quality assurance.
                  </p>
                </div>
              </div>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">4. How We Use and Share Information</h2>
              <p className="mt-3 text-divine-muted">
                Your personal details are used strictly to:
              </p>
              <ol className="mt-3 space-y-2 text-sm text-divine-muted list-decimal pl-5">
                <li>Evaluate technical feasibility with regional network infrastructure providers.</li>
                <li>Prepare and communicate tailor-made quotes and answers to your questions.</li>
                <li>Maintain internal records and audit histories of administrative actions.</li>
              </ol>
              <p className="mt-4 text-divine-muted">
                <strong className="text-divine-ink">No Data Selling:</strong> We do not sell, rent, or trade your personal data to marketing third parties or automated profiling engines. If a quote requires checking availability with an infrastructure carrier, only necessary location parameters are queried.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">5. Data Storage, Security & International Transfers</h2>
              <p className="mt-3 text-divine-muted">
                We employ defense-in-depth security principles:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-divine-muted list-disc pl-5">
                <li>Database tables enforce strict Postgres Row-Level Security (RLS) with zero public read/write access.</li>
                <li>Privileged server-side mutations require service-role credentials kept confidential and never accessible to client browsers.</li>
                <li>All data in transit is encrypted using modern TLS 1.3 standards, and all database volumes are encrypted at rest with AES-256.</li>
                <li>Where data is hosted on European or global cloud nodes, standard contractual clauses (SCCs) and rigorous cloud security certifications (ISO 27001, SOC 2 Type II) safeguard your privacy.</li>
              </ul>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">6. Data Retention Policy</h2>
              <p className="mt-3 text-divine-muted">
                We retain personal enquiry data only as long as necessary to fulfill the initial inquiry:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-divine-muted list-disc pl-5">
                <li><strong className="text-divine-ink">Active Enquiries:</strong> Kept throughout review and active communication.</li>
                <li><strong className="text-divine-ink">Archived Records:</strong> If no contract or ongoing engagement ensues, records are archived and safely deleted within 12 months.</li>
                <li><strong className="text-divine-ink">Audit Logs:</strong> Administrative audit logs record timestamps and action types for security verification and are purged periodically in line with statutory requirements.</li>
              </ul>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">7. Your Statutory Rights</h2>
              <p className="mt-3 text-divine-muted">
                Under UK GDPR and applicable privacy statutes, you have extensive rights over your personal data:
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right of Access:</span> Request a copy of all personal information we hold about you.
                </div>
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right to Rectification:</span> Request correction of any inaccurate or incomplete details.
                </div>
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</span> Request complete deletion of your records.
                </div>
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right to Restrict Processing:</span> Limit how we use your data during ongoing disputes.
                </div>
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right to Data Portability:</span> Receive your data in a structured, machine-readable format.
                </div>
                <div className="rounded-xl bg-divine-ice/70 p-3.5 border border-divine-border">
                  <span className="font-bold text-divine-ink">Right to Withdraw Consent:</span> Revoke consent at any time without penalty.
                </div>
              </div>
              <p className="mt-4 text-sm text-divine-muted">
                To exercise any right, contact our team at <span className="font-semibold text-divine-blue">privacy@divinelinks.co</span> with your enquiry reference number. We will respond within 30 days without fee.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">8. Complaints to Supervisory Authorities</h2>
              <p className="mt-3 text-divine-muted">
                If you are dissatisfied with our response, you have the right to lodge a formal complaint with the relevant data protection authority:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-divine-muted list-disc pl-5">
                <li><strong className="text-divine-ink">United Kingdom:</strong> Information Commissioner&rsquo;s Office (ICO) — <a href="https://ico.org.uk" target="_blank" rel="noreferrer" className="text-divine-blue underline">ico.org.uk</a></li>
                <li><strong className="text-divine-ink">Nigeria:</strong> Nigeria Data Protection Commission (NDPC) — <a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer" className="text-divine-blue underline">ndpc.gov.ng</a></li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t border-divine-border flex flex-wrap justify-between items-center gap-4">
              <Link href="/cookies" className="text-sm font-bold text-divine-blue hover:underline">
                View Cookie Policy →
              </Link>
              <Link href="/terms" className="text-sm font-bold text-divine-blue hover:underline">
                View Terms of Service →
              </Link>
              <Link href="/enquire" className="rounded-full bg-divine-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-divine-ink">
                Return to Enquiry Form
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
