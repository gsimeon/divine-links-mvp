import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Cookie Policy | Divine Links",
  description: "Understand how Divine Links uses essential technical cookies and local storage to provide security and service continuity."
};

export default function CookiesPage() {
  return (
    <>
      <Header />
      <main className="bg-gradient-to-b from-divine-ice/80 via-white to-white py-12 sm:py-16">
        <div className="container max-w-4xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-divine-border bg-white px-3.5 py-1.5 text-xs font-bold text-divine-blue">
              <span>COOKIE TRANSPARENCY</span>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-divine-ink sm:text-5xl">
              Cookie & Local Storage Policy
            </h1>
            <p className="mt-3 text-sm text-divine-muted">
              Last updated: October 2026 · Compliant with the Privacy and Electronic Communications Regulations (PECR) and UK GDPR
            </p>
          </div>

          <div className="space-y-8 rounded-3xl border border-divine-border bg-white p-6 shadow-soft sm:p-10 text-divine-ink leading-relaxed">
            <section>
              <h2 className="text-2xl font-black text-divine-ink">1. What Are Cookies and Local Storage?</h2>
              <p className="mt-3 text-divine-muted">
                Cookies and local storage mechanisms are small text or data files stored directly on your computer or mobile browser when visiting a website. They allow websites to remember technical configurations, security authentication states, and basic preferences.
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">2. Our Minimal Tracking Commitment</h2>
              <p className="mt-3 text-divine-muted">
                At Divine Links, we believe in privacy by default. We do <strong>not</strong> install non-essential advertising trackers, behavioral cross-site trackers, or third-party marketing pixels (such as Meta Pixel, TikTok Pixel, or intrusive advertising cookies).
              </p>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">3. Technical Storage Used by Divine Links</h2>
              <p className="mt-3 text-divine-muted">
                We only utilize storage strictly necessary to operate our service:
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-divine-muted border border-divine-border rounded-xl overflow-hidden">
                  <thead className="bg-divine-ice text-divine-ink font-bold border-b border-divine-border">
                    <tr>
                      <th className="p-3.5">Storage Key / Cookie</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divine-border">
                    <tr>
                      <td className="p-3.5 font-mono text-xs text-divine-blue">divine_cookie_consent</td>
                      <td className="p-3.5">Essential Local Storage</td>
                      <td className="p-3.5">1 Year</td>
                      <td className="p-3.5">Remembers whether you have acknowledged our privacy and cookie notice so the banner does not re-appear.</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-mono text-xs text-divine-blue">sb-*-auth-token</td>
                      <td className="p-3.5">Essential Auth Session</td>
                      <td className="p-3.5">Session / 1 Hour</td>
                      <td className="p-3.5">Maintains authorized admin authentication on the internal enquiry desk (`/admin`). Not placed on public visitors.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border-t border-divine-border pt-8">
              <h2 className="text-2xl font-black text-divine-ink">4. Managing Your Preferences</h2>
              <p className="mt-3 text-divine-muted">
                Because all items described above are strictly essential for core site navigation, security, and staff authorization under Regulation 22 of PECR, explicit prior consent is not required for their operation. However, you can clear all stored site data at any time through your browser settings:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-divine-muted list-disc pl-5">
                <li><strong>Google Chrome:</strong> Settings &gt; Privacy & Security &gt; Delete browsing data</li>
                <li><strong>Mozilla Firefox:</strong> Settings &gt; Privacy & Security &gt; Cookies and Site Data</li>
                <li><strong>Apple Safari:</strong> Preferences &gt; Privacy &gt; Manage Website Data</li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t border-divine-border flex flex-wrap justify-between items-center gap-4">
              <Link href="/privacy" className="text-sm font-bold text-divine-blue hover:underline">
                Read Privacy Policy →
              </Link>
              <Link href="/terms" className="text-sm font-bold text-divine-blue hover:underline">
                Read Terms of Service →
              </Link>
              <Link href="/" className="rounded-full bg-divine-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-divine-ink">
                Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
