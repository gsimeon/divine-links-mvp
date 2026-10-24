import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | Divine Links",
  description: "Terms and conditions governing the use of the Divine Links enquiry and networking website."
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="bg-gradient-to-b from-divine-ice/80 via-white to-white py-12 sm:py-16">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-3.5 py-1.5 text-xs font-bold text-divine-blue">
              <span>LEGAL AGREEMENT</span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-divine-ink sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm text-divine-muted">
              Effective Date: October 2026 · Version 1.0
            </p>
          </div>

          <div className="space-y-8 rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-10 text-divine-ink leading-relaxed">
            <section>
              <h2 className="text-2xl font-black text-divine-ink">1. Nature of the Service (Enquiry-First Platform)</h2>
              <p className="mt-3 text-divine-muted">
                Divine Links provides an informational and enquiry portal designed to help individuals and corporate organizations describe their connectivity, networking, and telecom requirements.
              </p>
              <div className="mt-4 rounded-2xl bg-divine-pale p-4 text-sm text-divine-ink border border-divine-border">
                <p className="font-bold text-teal-900">Important Operational Principle:</p>
                <p className="mt-1 text-teal-800">
                  Submitting an enquiry through this website does <strong>not</strong> create a binding contract, confirm a service purchase, establish a price lock, schedule a technician appointment, or guarantee network coverage. All pricing, equipment specifications, and commercial agreements require manual review and written bilateral confirmation.
                </p>
              </div>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">2. Acceptable Use Policy</h2>
              <p className="mt-3 text-divine-muted">
                When utilizing this website or submitting an enquiry, you agree that you will not:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-divine-muted list-disc pl-5">
                <li>Submit misleading, fraudulent, or impersonated personal information.</li>
                <li>Submit sensitive financial instruments, banking passwords, or payment cards through unencrypted or web-form fields.</li>
                <li>Attempt to bypass rate limiting, flood the system with automated bot submissions, or probe for vulnerabilities.</li>
                <li>Attempt unauthorized access to the internal administration desk (`/admin`).</li>
              </ul>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">3. Intellectual Property</h2>
              <p className="mt-3 text-divine-muted">
                All branding, visual designs, illustrations, brandmarks, text, layout structures, and codebase elements belonging to Divine Links are the exclusive property of Divine Links and protected by relevant copyright and trademark laws.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">4. Third-Party Carriers and Feasibility</h2>
              <p className="mt-3 text-divine-muted">
                Broadband speeds, fiber backhaul availability, and cellular coverage are dependent on third-party infrastructure carriers and geographical terrain. Divine Links does not warrant that any given address can be connected until site survey results or carrier verification tests are finalized.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">5. Limitation of Liability</h2>
              <p className="mt-3 text-divine-muted">
                To the maximum extent permitted by applicable law, Divine Links shall not be held liable for any indirect, incidental, or consequential damages resulting from technical downtime, network provider outages, or reliance on preliminary quotation estimates provided prior to signed service agreements.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">6. Governing Law & Jurisdiction</h2>
              <p className="mt-3 text-divine-muted">
                These Terms of Service are governed by and construed in accordance with the laws of England and Wales and applicable federal statutes in Nigeria, without regard to conflict of law principles.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-divine-border flex flex-wrap justify-between items-center gap-4">
              <Link href="/privacy" className="text-sm font-bold text-divine-blue hover:underline">
                Read Privacy Policy →
              </Link>
              <Link href="/cookies" className="text-sm font-bold text-divine-blue hover:underline">
                Read Cookie Policy →
              </Link>
              <Link href="/enquire" className="rounded-full bg-divine-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-divine-ink">
                Make an Enquiry
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
