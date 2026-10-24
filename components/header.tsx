"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <div className="bg-divine-ink py-2 text-center text-xs font-medium text-white sm:text-sm">
        Connecting your world, seamlessly <span className="mx-2 text-divine-teal">•</span> Built around your needs
      </div>

      <header className="sticky top-0 z-40 border-b border-divine-border/80 bg-white/95 backdrop-blur-md">
        <div className="container flex h-[78px] items-center justify-between gap-4">
          <Brand />

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 text-sm font-semibold text-divine-muted md:flex" aria-label="Main navigation">
            <Link className="transition hover:text-divine-blue" href="/#services">Services</Link>
            <Link className="transition hover:text-divine-blue" href="/#how-it-works">How it works</Link>
            <Link className="transition hover:text-divine-blue" href="/#business">For business</Link>
            <Link className="transition hover:text-divine-blue" href="/privacy">Privacy</Link>
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/enquire"
              className="inline-flex items-center gap-1.5 rounded-full bg-divine-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(22,118,200,0.25)] transition hover:bg-divine-ink"
            >
              Make an enquiry <span aria-hidden="true">↗</span>
            </Link>
          </div>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-divine-border bg-white text-divine-ink shadow-sm transition hover:border-divine-blue md:hidden focus-visible:outline-2 focus-visible:outline-divine-blue"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
                <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
                <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay and Sheet */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-divine-ink/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sliding Drawer Container */}
          <div className="fixed inset-y-0 right-0 flex w-full max-w-xs flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex h-[78px] items-center justify-between border-b border-divine-border px-6">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-divine-border text-divine-ink transition hover:border-divine-blue"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Mobile navigation">
              <div className="flex flex-col space-y-4 text-base font-bold text-divine-ink">
                <Link
                  href="/#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-divine-ice hover:text-divine-blue"
                >
                  Our Services
                </Link>
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-divine-ice hover:text-divine-blue"
                >
                  How It Works
                </Link>
                <Link
                  href="/#business"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-divine-ice hover:text-divine-blue"
                >
                  For Business
                </Link>
                <Link
                  href="/privacy"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 transition hover:bg-divine-ice hover:text-divine-blue"
                >
                  Privacy Notice
                </Link>
                <Link
                  href="/terms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-xs text-divine-muted transition hover:text-divine-blue"
                >
                  Terms of Service
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-divine-border space-y-3">
                <Link
                  href="/enquire"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-divine-blue px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-divine-ink"
                >
                  Make an enquiry <span>↗</span>
                </Link>

                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-divine-border bg-divine-ice px-4 py-2.5 text-xs font-bold text-divine-ink"
                >
                  <span>🔒</span> Staff Enquiry Desk
                </Link>
              </div>
            </nav>

            <div className="border-t border-divine-border p-6 text-center text-xs text-divine-muted">
              UK GDPR &amp; NDPA Compliant
            </div>
          </div>
        </div>
      )}
    </>
  );
}
