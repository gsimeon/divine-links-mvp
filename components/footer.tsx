import Link from "next/link";
import { Brand } from "@/components/brand";

export function Footer() {
  return (
    <footer className="border-t border-divine-border bg-white">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
        <div className="sm:col-span-2 md:col-span-1">
          <Brand />
          <p className="mt-4 text-sm leading-6 text-divine-muted">
            Thoughtful telecom enquiries and practical networking solutions designed around your goals.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-divine-border bg-divine-ice px-3 py-1 text-[11px] font-bold text-divine-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-divine-teal" />
            UK GDPR &amp; NDPA Aligned
          </div>
        </div>

        <div>
          <p className="text-sm font-bold tracking-wide uppercase text-divine-ink">Explore</p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-divine-muted">
            <Link className="transition hover:text-divine-blue" href="/#services">Our Services</Link>
            <Link className="transition hover:text-divine-blue" href="/#coverage">Network Coverage</Link>
            <Link className="transition hover:text-divine-blue" href="/#calculator">Solution Calculator</Link>
            <Link className="transition hover:text-divine-blue" href="/#how-it-works">How It Works</Link>
            <Link className="transition hover:text-divine-blue" href="/track">Track Enquiry</Link>
            <Link className="transition hover:text-divine-blue" href="/enquire">Make an Enquiry</Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold tracking-wide uppercase text-divine-ink">Legal &amp; Privacy</p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-divine-muted">
            <Link className="transition hover:text-divine-blue" href="/privacy">Privacy Notice</Link>
            <Link className="transition hover:text-divine-blue" href="/terms">Terms of Service</Link>
            <Link className="transition hover:text-divine-blue" href="/cookies">Cookie Policy</Link>
            <a href="mailto:privacy@divinelinks.co" className="transition hover:text-divine-blue">
              Data Rights Request
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold tracking-wide uppercase text-divine-ink">Operations</p>
          <p className="mt-4 text-xs leading-5 text-divine-muted">
            Services and quotes are confirmed individually. Submitting an enquiry does not constitute an order or payment commitment.
          </p>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-divine-blue hover:text-divine-ink"
            >
              <span>🔒</span> Staff Enquiry Desk
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-divine-border py-6 text-center text-xs text-divine-muted">
        <div className="container flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {new Date().getFullYear()} Divine Links. All rights reserved.</p>
          <p className="text-[11px]">Enquiry-first platform · No automated payments or unverified contracts</p>
        </div>
      </div>
    </footer>
  );
}
